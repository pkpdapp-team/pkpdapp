#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import hashlib
import logging
import re
import uuid
from datetime import datetime

from django.conf import settings
from portkey_ai import Portkey
from qdrant_client import QdrantClient, models

logger = logging.getLogger(__name__)

COLLECTION = "pkpdapp_documents"  # an alias, pointing to the live collection
COLLECTION_PREFIX = f"{COLLECTION}_"  # each ingest makes a collection named like this
EMBEDDING_BATCH_SIZE = 128
SCROLL_BATCH_SIZE = 1000
SEARCH_LIMIT = 5

_qdrant = None


class DocumentsError(Exception):
    """A refused document collection operation, e.g. an unknown collection."""


def get_qdrant() -> QdrantClient:
    global _qdrant
    if _qdrant is None:
        _qdrant = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
    return _qdrant


def document_search_enabled() -> bool:
    return bool(settings.QDRANT_URL and settings.CHATBOT_EMBEDDING_MODEL)


def embed(client: Portkey, texts: list[str]) -> list[list[float]]:
    # without "float", the portkey client returns base64 strings
    response = client.embeddings.create(
        model=settings.CHATBOT_EMBEDDING_MODEL, input=texts, encoding_format="float"
    )
    return [item.embedding for item in response.data]


def point_id(chunk: dict) -> str:
    """A stable id for a chunk, so storing it again overwrites it."""
    key = f"{chunk['filename']}#{chunk['chunk_index']}"
    return str(uuid.uuid5(uuid.NAMESPACE_URL, key))


def content_hash(chunk: dict) -> str:
    """A fingerprint of the embedded text, to see if a stored chunk changed."""
    return hashlib.sha256(chunk["text"].encode()).hexdigest()


def live_collection(qdrant: QdrantClient) -> str | None:
    """The name of the collection the alias points to, if any."""
    for alias in qdrant.get_aliases().aliases:
        if alias.alias_name == COLLECTION:
            return alias.collection_name
    return None


def list_collections(qdrant: QdrantClient) -> list[dict]:
    """All document collections, newest first."""
    live = live_collection(qdrant=qdrant)
    collections = []
    for entry in qdrant.get_collections().collections:
        collection = entry.name
        if not collection.startswith(COLLECTION_PREFIX):
            continue
        info = qdrant.get_collection(collection)
        metadata = info.config.metadata or {}
        collections.append(
            {
                "name": collection,
                "live": collection == live,
                "chunks": info.points_count,
                "embedding_model": metadata.get("embedding_model"),
                "complete": bool(metadata.get("complete")),
                "tag": metadata.get("tag"),
            }
        )
    # names end in a timestamp, so sorting by name sorts by age
    return sorted(collections, key=lambda c: c["name"], reverse=True)


def ingest_new(client: Portkey, chunks: list[dict], tag: str | None = None) -> str:
    """Build a new collection from the chunks and make it live.

    The `tag` is a short name of your choice that the other commands accept
    in place of the collection's name.
    """
    if not chunks:
        raise DocumentsError("no chunks to ingest")
    qdrant = get_qdrant()
    if tag is not None:
        if not re.fullmatch(r"[\w.-]+", tag):
            raise DocumentsError("a tag may only contain letters, digits, - _ and .")
        if tag in [c["tag"] for c in list_collections(qdrant=qdrant)]:
            raise DocumentsError(f"the tag {tag!r} is already used")
    collection = f"{COLLECTION_PREFIX}{datetime.now():%Y%m%d_%H%M%S_%f}"
    _store(
        client=client,
        qdrant=qdrant,
        collection=collection,
        chunks=chunks,
        create=True,
    )
    # marked complete only once every chunk is stored, so an unfinished
    # collection (e.g. from a failed ingest) can be told apart
    qdrant.update_collection(collection, metadata={"complete": True, "tag": tag})
    switch_alias(qdrant, collection)
    return collection


def ingest_add(
    client: Portkey,
    chunks: list[dict],
    collection: str | None = None,
    force: bool = False,
) -> dict:
    """Add chunks to an existing collection, the live one by default.

    New and changed chunks are embedded and stored; chunks already stored
    with the same text are skipped. Nothing is removed, so if a file now
    has fewer chunks than before, its old extra chunks stay. When the
    chunking changes, ingest a new collection instead.

    With `force`, a collection built with a different embedding model name
    is accepted, e.g. the same model reached under another name.
    """
    if not chunks:
        raise DocumentsError("no chunks to ingest")
    qdrant = get_qdrant()
    if collection is None:
        collection = live_collection(qdrant=qdrant)
        if collection is None:
            raise DocumentsError(
                "no live collection yet; run documents ingest without --add first"
            )
    target = _find(qdrant=qdrant, collection=collection)
    collection = target["name"]
    model = target["embedding_model"]
    if model != settings.CHATBOT_EMBEDDING_MODEL and not force:
        raise DocumentsError(
            f"{collection} was built with embedding model {model!r}, not "
            f"{settings.CHATBOT_EMBEDDING_MODEL!r}; use --force to add anyway"
        )

    filenames = {chunk["filename"] for chunk in chunks}
    stored = _stored_hashes(
        qdrant=qdrant, collection=collection, filenames=filenames
    )
    to_store = [
        chunk
        for chunk in chunks
        if stored.get(point_id(chunk=chunk)) != content_hash(chunk=chunk)
    ]
    _store(
        client=client,
        qdrant=qdrant,
        collection=collection,
        chunks=to_store,
        create=False,
    )
    result = {"stored": len(to_store), "unchanged": len(chunks) - len(to_store)}
    logger.info(f"{collection}: {result}")
    return result


def _store(
    client: Portkey,
    qdrant: QdrantClient,
    collection: str,
    chunks: list[dict],
    create: bool,
) -> None:
    """Embed the chunks and store them in `collection`.

    With `create`, the collection is created from the first batch, since the
    vector size is only known once something is embedded.
    """
    for start in range(0, len(chunks), EMBEDDING_BATCH_SIZE):
        batch = chunks[start : start + EMBEDDING_BATCH_SIZE]
        vectors = embed(client, [chunk["text"] for chunk in batch])
        if create and start == 0:
            qdrant.create_collection(
                collection,
                vectors_config=models.VectorParams(
                    size=len(vectors[0]), distance=models.Distance.COSINE
                ),
                metadata={
                    "embedding_model": settings.CHATBOT_EMBEDDING_MODEL,
                    "complete": False,
                },
            )
        qdrant.upsert(
            collection,
            points=[
                models.PointStruct(
                    id=point_id(chunk=chunk),
                    vector=vector,
                    payload={**chunk, "hash": content_hash(chunk=chunk)},
                )
                for chunk, vector in zip(batch, vectors)
            ],
        )
        logger.info(f"{start + len(batch)}/{len(chunks)} chunks embedded")


def _stored_hashes(
    qdrant: QdrantClient, collection: str, filenames: set[str]
) -> dict[str, str]:
    """Point id -> text fingerprint, for the stored chunks of these files."""
    only_these_files = models.Filter(
        must=[
            models.FieldCondition(
                key="filename", match=models.MatchAny(any=sorted(filenames))
            )
        ]
    )
    hashes = {}
    offset = None
    while True:
        points, offset = qdrant.scroll(
            collection,
            scroll_filter=only_these_files,
            limit=SCROLL_BATCH_SIZE,
            offset=offset,
            with_payload=["hash"],
            with_vectors=False,
        )
        hashes.update({str(p.id): p.payload.get("hash") for p in points})
        if offset is None:
            return hashes


def switch_alias(qdrant: QdrantClient, new_collection: str) -> None:
    operations = []
    # on the first ingest there is no alias to delete yet
    if live_collection(qdrant=qdrant) is not None:
        operations.append(
            models.DeleteAliasOperation(
                delete_alias=models.DeleteAlias(alias_name=COLLECTION)
            )
        )
    operations.append(
        models.CreateAliasOperation(
            create_alias=models.CreateAlias(
                collection_name=new_collection, alias_name=COLLECTION
            )
        )
    )
    # all operations in one request, so search never sees a missing alias
    qdrant.update_collection_aliases(change_aliases_operations=operations)
    logger.info(
        f"{COLLECTION} now points to {new_collection}; "
        "older collections are kept (see manage.py documents list)"
    )


def switch_collection(collection: str, force: bool = False) -> None:
    """Make `collection` the live one.

    With `force`, a collection built with a different embedding model name
    is accepted, e.g. the same model reached under another name.
    """
    qdrant = get_qdrant()
    target = _find(qdrant=qdrant, collection=collection)
    if not target["complete"]:
        raise DocumentsError(f"{collection} is not complete")
    model = target["embedding_model"]
    if model != settings.CHATBOT_EMBEDDING_MODEL and not force:
        raise DocumentsError(
            f"{collection} was built with embedding model {model!r}, not "
            f"{settings.CHATBOT_EMBEDDING_MODEL!r}; use --force to switch anyway"
        )
    switch_alias(qdrant, target["name"])


def old_collections(keep: int) -> list[str]:
    """Names of the old (complete, not live) collections, minus the `keep` newest."""
    # newest first, as list_collections returns them
    old = [
        c["name"]
        for c in list_collections(qdrant=get_qdrant())
        if c["complete"] and not c["live"]
    ]
    # skip the newest `keep`
    return old[keep:]


def delete_collections(collections: list[str]) -> None:
    """Delete the named collections; the live one is refused."""
    qdrant = get_qdrant()
    targets = [_find(qdrant=qdrant, collection=name) for name in collections]
    for target in targets:
        if target["live"]:
            raise DocumentsError(f"{target['name']} is live and cannot be deleted")
    for target in targets:
        qdrant.delete_collection(target["name"])
        logger.info(f"deleted {target['name']}")


def _find(qdrant: QdrantClient, collection: str) -> dict:
    """The listing entry of a collection, by name or tag; unknown ones are refused."""
    for entry in list_collections(qdrant=qdrant):
        if collection in (entry["name"], entry["tag"]):
            return entry
    raise DocumentsError(f"no collection named {collection!r}")


def _has_text(hit: dict) -> bool:
    """Whether a hit has a passage to show; other ingesters may store none."""
    text = hit.get("raw_text")
    return isinstance(text, str) and bool(text.strip())


def search(client: Portkey, query: str) -> list[dict]:
    [vector] = embed(client, [query])
    # fetch extra, so dropping hits without text still leaves SEARCH_LIMIT
    response = get_qdrant().query_points(
        COLLECTION, query=vector, limit=SEARCH_LIMIT * 2
    )
    hits = [{**(hit.payload or {}), "score": hit.score} for hit in response.points]
    return [hit for hit in hits if _has_text(hit)][:SEARCH_LIMIT]
