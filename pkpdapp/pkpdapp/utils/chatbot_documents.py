#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import logging
from datetime import datetime

from django.conf import settings
from portkey_ai import Portkey
from qdrant_client import QdrantClient, models

logger = logging.getLogger(__name__)

COLLECTION = "documents"  # an alias, pointing to the newest complete collection
EMBEDDING_BATCH_SIZE = 128
SEARCH_LIMIT = 5

_qdrant = None


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


def ingest(client: Portkey, chunks: list[dict]):
    qdrant = get_qdrant()
    new_collection = f"{COLLECTION}_{datetime.now():%Y%m%d_%H%M%S_%f}"
    for start in range(0, len(chunks), EMBEDDING_BATCH_SIZE):
        batch = chunks[start : start + EMBEDDING_BATCH_SIZE]
        vectors = embed(client, [chunk["text"] for chunk in batch])
        if start == 0:
            vectors_config = models.VectorParams(
                size=len(vectors[0]), distance=models.Distance.COSINE
            )
            qdrant.create_collection(new_collection, vectors_config=vectors_config)
        qdrant.upsert(
            new_collection,
            points=[
                models.PointStruct(id=start + offset, vector=vector, payload=chunk)
                for offset, (chunk, vector) in enumerate(zip(batch, vectors))
            ],
        )
        logger.info(f"{start + len(batch)}/{len(chunks)} chunks embedded")
    switch_alias(qdrant, new_collection)


def switch_alias(qdrant: QdrantClient, new_collection: str):
    # both operations in one request, so search never sees a missing alias
    qdrant.update_collection_aliases(
        change_aliases_operations=[
            models.DeleteAliasOperation(
                delete_alias=models.DeleteAlias(alias_name=COLLECTION)
            ),
            models.CreateAliasOperation(
                create_alias=models.CreateAlias(
                    collection_name=new_collection, alias_name=COLLECTION
                )
            ),
        ]
    )
    logger.info(
        f"{COLLECTION} now points to {new_collection}; "
        f"{len(unused_collections(qdrant))} unused collections kept "
        "(see manage.py cleanup_documents)"
    )


def unused_collections(qdrant: QdrantClient) -> list[str]:
    current = [
        alias.collection_name
        for alias in qdrant.get_aliases().aliases
        if alias.alias_name == COLLECTION
    ]
    return [
        collection.name
        for collection in qdrant.get_collections().collections
        if collection.name.startswith(f"{COLLECTION}_")
        and collection.name not in current
    ]


def clean_up(delete: bool):
    qdrant = get_qdrant()
    for name in unused_collections(qdrant):
        if delete:
            qdrant.delete_collection(name)
            logger.info(f"deleted {name}")
        else:
            logger.info(f"unused: {name} (delete with --delete)")


def search(client: Portkey, query: str) -> list[dict]:
    [vector] = embed(client, [query])
    response = get_qdrant().query_points(COLLECTION, query=vector, limit=SEARCH_LIMIT)
    return [{**hit.payload, "score": hit.score} for hit in response.points]
