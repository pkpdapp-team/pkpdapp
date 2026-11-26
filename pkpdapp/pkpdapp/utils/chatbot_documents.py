#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import filecmp
import hashlib
import logging
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Callable

from django.conf import settings
from django.core.files import File
from portkey_ai import Portkey
from qdrant_client import QdrantClient, models

from pkpdapp.models import Document

logger = logging.getLogger(__name__)

COLLECTION = "pkpdapp_documents"  # an alias, pointing to the live collection
COLLECTION_PREFIX = f"{COLLECTION}_"  # each ingest makes a collection named like this
EMBEDDING_BATCH_SIZE = 128
SCROLL_BATCH_SIZE = 1000
SEARCH_LIMIT = 5
MAX_ERROR_LENGTH = 1000  # of the reason stored on a failed Document
# Uploaded documents live in their own collection, which is never swapped, so
# a new shared collection does not lose them.
PROJECT_COLLECTION = "pkpdapp_project_documents"
# Project hits come first but leave room for shared ones, as a semantic search
# always returns something, however weak.
PROJECT_SEARCH_LIMIT = 3

_qdrant = None


class DocumentsError(Exception):
    """A refused document collection operation, e.g. an unknown collection."""


def check_pdfs(chunks: list[dict], pdf_dir: Path) -> dict[str, Path]:
    """Find the PDF for every file name in the chunks, or raise DocumentsError."""
    if not pdf_dir.is_dir():
        raise DocumentsError(f"{pdf_dir} is not a directory")
    names = sorted({c["filename"] for c in chunks})
    unsafe = [name for name in names if Path(name).name != name]
    if unsafe:
        raise DocumentsError(f"file names must not contain a path: {', '.join(unsafe)}")
    paths = {name: pdf_dir / name for name in names}
    missing = [name for name, path in paths.items() if not path.is_file()]
    if missing:
        raise DocumentsError(f"no PDF in {pdf_dir} for: {', '.join(missing)}")
    return paths


def _same_file(document: Document, path: Path) -> bool:
    try:
        return filecmp.cmp(document.file.path, path, shallow=False)
    except (OSError, NotImplementedError, ValueError):  # missing, or not on disk
        return False


def store_pdfs(paths: dict[str, Path]) -> None:
    """Copy PDFs into MEDIA_ROOT as shared Documents, replacing changed ones.

    The new file is saved before the old one is removed, and a Document is only
    created once its file is stored, so a failure never leaves a Document
    without a file.
    """
    for name, path in paths.items():
        document = Document.objects.filter(project=None, filename=name).first()
        if document is None:
            document = Document(project=None, filename=name)
        elif document.file and _same_file(document, path):
            continue
        old_name = document.file.name
        with path.open("rb") as pdf:
            document.file.save(name, File(pdf), save=True)
        if old_name and old_name != document.file.name:
            document.file.storage.delete(old_name)


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
        create_collection=lambda size: _create_collection(
            qdrant, collection, size, complete=False
        ),
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
    )
    result = {"stored": len(to_store), "unchanged": len(chunks) - len(to_store)}
    logger.info(f"{collection}: {result}")
    return result


def _create_collection(
    qdrant: QdrantClient, collection: str, size: int, complete: bool
) -> None:
    qdrant.create_collection(
        collection,
        vectors_config=models.VectorParams(size=size, distance=models.Distance.COSINE),
        metadata={
            "embedding_model": settings.CHATBOT_EMBEDDING_MODEL,
            "complete": complete,
        },
    )


def _store(
    client: Portkey,
    qdrant: QdrantClient,
    collection: str,
    chunks: list[dict],
    create_collection: Callable[[int], None] | None = None,
    point_id_fn: Callable[[dict], str] = point_id,
) -> None:
    """Embed the chunks and store them in `collection`.

    `create_collection`, if given, is called with the vector size before the
    first batch is stored: the size is only known once something is embedded.
    """
    for start in range(0, len(chunks), EMBEDDING_BATCH_SIZE):
        batch = chunks[start : start + EMBEDDING_BATCH_SIZE]
        vectors = embed(client, [chunk["text"] for chunk in batch])
        if create_collection is not None and start == 0:
            create_collection(len(vectors[0]))
        qdrant.upsert(
            collection,
            points=[
                models.PointStruct(
                    id=point_id_fn(chunk),
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
    return {
        str(point.id): point.payload.get("hash")
        for point in _scroll_all(
            qdrant, collection, scroll_filter=only_these_files, with_payload=["hash"]
        )
    }


def _scroll_all(qdrant: QdrantClient, collection: str, **scroll_args):
    """Every point of the collection (that matches the filter), page by page."""
    offset = None
    while True:
        points, offset = qdrant.scroll(
            collection,
            limit=SCROLL_BATCH_SIZE,
            offset=offset,
            with_vectors=False,
            **scroll_args,
        )
        yield from points
        if offset is None:
            return


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


def project_point_id(chunk: dict) -> str:
    """A stable id for a project chunk; the project is part of it, so two
    projects can upload files of the same name."""
    key = f"project/{chunk['project_id']}/{chunk['filename']}#{chunk['chunk_index']}"
    return str(uuid.uuid5(uuid.NAMESPACE_URL, key))


def _project_filter(key: str, value: int) -> models.Filter:
    return models.Filter(
        must=[models.FieldCondition(key=key, match=models.MatchValue(value=value))]
    )


def _ensure_project_collection(qdrant: QdrantClient, size: int) -> None:
    """Create the project collection, with the indexes its filters use."""
    if qdrant.collection_exists(PROJECT_COLLECTION):
        return
    try:
        _create_collection(qdrant, PROJECT_COLLECTION, size, complete=True)
    except Exception:
        # another worker may have created it between the check and the create
        if not qdrant.collection_exists(PROJECT_COLLECTION):
            raise
    for field in ("project_id", "document_id"):
        qdrant.create_payload_index(
            PROJECT_COLLECTION,
            field_name=field,
            field_schema=models.PayloadSchemaType.INTEGER,
        )


def project_collection_info(qdrant: QdrantClient) -> dict | None:
    """The size and embedding model of the project collection, if it exists."""
    if not qdrant.collection_exists(PROJECT_COLLECTION):
        return None
    info = qdrant.get_collection(PROJECT_COLLECTION)
    return {
        "chunks": info.points_count,
        "embedding_model": (info.config.metadata or {}).get("embedding_model"),
    }


def _project_collection_model(qdrant: QdrantClient) -> str | None:
    """The embedding model of the project collection; None if there is none."""
    info = project_collection_info(qdrant=qdrant)
    return info["embedding_model"] if info else None


def add_project_document(
    client: Portkey, document: Document, chunks: list[dict]
) -> int:
    """Embed the chunks of a project's document, replacing any it had stored.

    Returns the number of chunks stored.
    """
    if document.project_id is None:
        raise DocumentsError("only a project's documents are stored here")
    if not chunks:
        raise DocumentsError("no text found in the document")
    qdrant = get_qdrant()
    model = _project_collection_model(qdrant=qdrant)
    if model is not None and model != settings.CHATBOT_EMBEDDING_MODEL:
        raise DocumentsError(
            f"project documents were embedded with {model!r}, not "
            f"{settings.CHATBOT_EMBEDDING_MODEL!r}; run manage.py documents "
            "rebuild-projects"
        )
    tagged = [
        {
            **chunk,
            "filename": document.filename,
            "project_id": document.project_id,
            "document_id": document.id,
        }
        for chunk in chunks
    ]
    # a retry or a re-upload must not leave stale chunks behind
    delete_project_document(document_id=document.id)
    _store(
        client=client,
        qdrant=qdrant,
        collection=PROJECT_COLLECTION,
        chunks=tagged,
        create_collection=lambda size: _ensure_project_collection(qdrant, size),
        point_id_fn=project_point_id,
    )
    return len(tagged)


def delete_project_document(document_id: int) -> None:
    """Remove the stored chunks of a project's document."""
    qdrant = get_qdrant()
    if not qdrant.collection_exists(PROJECT_COLLECTION):
        return
    qdrant.delete(
        PROJECT_COLLECTION,
        points_selector=models.FilterSelector(
            filter=_project_filter("document_id", document_id)
        ),
    )


def delete_orphan_project_chunks() -> int:
    """Remove the chunks of documents that no longer exist.

    The cleanup when a document is deleted is best effort (e.g. Qdrant may be
    down), so this catches what it missed. Returns the number of deleted
    documents whose chunks were removed.
    """
    qdrant = get_qdrant()
    if not qdrant.collection_exists(PROJECT_COLLECTION):
        return 0
    stored = {
        point.payload.get("document_id")
        for point in _scroll_all(
            qdrant, PROJECT_COLLECTION, with_payload=["document_id"]
        )
    }
    existing = set(
        Document.objects.filter(project__isnull=False, id__in=stored).values_list(
            "id", flat=True
        )
    )
    # a chunk without a document id belongs to no document either
    orphans = sorted(stored - existing - {None})
    conditions = []
    if orphans:
        conditions.append(
            models.FieldCondition(
                key="document_id", match=models.MatchAny(any=orphans)
            )
        )
    if None in stored:
        conditions.append(
            models.IsEmptyCondition(
                is_empty=models.PayloadField(key="document_id")
            )
        )
    if conditions:
        qdrant.delete(
            PROJECT_COLLECTION,
            points_selector=models.FilterSelector(
                filter=models.Filter(should=conditions)
            ),
        )
    return len(orphans)


def rebuild_project_documents(client: Portkey) -> dict:
    """Embed every project document again with the current embedding model.

    Needed after the embedding model changes. The stored chunk texts are
    reused, so the PDFs are only read again for documents with none stored.
    """
    qdrant = get_qdrant()
    stored: dict[int, list[dict]] = {}
    if qdrant.collection_exists(PROJECT_COLLECTION):
        for point in _scroll_all(qdrant, PROJECT_COLLECTION, with_payload=True):
            payload = {k: v for k, v in point.payload.items() if k != "hash"}
            stored.setdefault(payload["document_id"], []).append(payload)
        qdrant.delete_collection(PROJECT_COLLECTION)

    rebuilt, failed = 0, []
    documents = Document.objects.filter(
        project__isnull=False, status=Document.Status.READY
    )
    for document in documents:
        try:
            chunks = sorted(
                stored.get(document.id, []), key=lambda chunk: chunk["chunk_index"]
            )
            if not chunks:
                from pkpdapp.utils.document_chunking import chunk_pdf

                chunks = chunk_pdf(Path(document.file.path), document.filename)
            document.chunk_count = add_project_document(
                client=client, document=document, chunks=chunks
            )
            document.save(update_fields=["chunk_count"])
            rebuilt += 1
        except Exception as error:
            logger.exception(f"could not rebuild {document.filename}")
            # shown as failed, so the user can retry it
            record_failure(document_id=document.id, error=error)
            failed.append(document.filename)
    return {"rebuilt": rebuilt, "failed": failed}


def record_failure(document_id: int, error: Exception) -> None:
    """Mark a project document failed, with no half-searchable chunks left."""
    try:
        delete_project_document(document_id=document_id)
    except Exception:
        logger.exception(f"could not clean up document {document_id}")
    message = str(error) or type(error).__name__
    Document.objects.filter(pk=document_id).update(
        status=Document.Status.FAILED,
        error=message[:MAX_ERROR_LENGTH],
        chunk_count=None,
    )


def _hits(response, **extra) -> list[dict]:
    hits = [
        {**(hit.payload or {}), "score": hit.score, **extra}
        for hit in response.points
    ]
    return [hit for hit in hits if _has_text(hit)]


def _project_hits(
    qdrant: QdrantClient, vector: list[float], project_id: int
) -> list[dict]:
    try:
        if _project_collection_model(qdrant=qdrant) != settings.CHATBOT_EMBEDDING_MODEL:
            return []  # none uploaded yet, or embedded with another model
        response = qdrant.query_points(
            PROJECT_COLLECTION,
            query=vector,
            query_filter=_project_filter("project_id", project_id),
            limit=PROJECT_SEARCH_LIMIT * 2,
        )
    except Exception:
        # the shared documents can still answer
        logger.exception("project document search failed")
        return []
    return _hits(response, project=True)[:PROJECT_SEARCH_LIMIT]


def search(client: Portkey, query: str, project_id: int | None = None) -> list[dict]:
    """The best passages for the query: the project's own documents first,
    then the shared ones, at most SEARCH_LIMIT in all."""
    [vector] = embed(client, [query])
    qdrant = get_qdrant()
    hits = []
    if project_id is not None:
        hits = _project_hits(qdrant=qdrant, vector=vector, project_id=project_id)
    # fetch extra, so dropping hits without text still leaves enough
    response = qdrant.query_points(COLLECTION, query=vector, limit=SEARCH_LIMIT * 2)
    hits += _hits(response, project=False)
    return hits[:SEARCH_LIMIT]
