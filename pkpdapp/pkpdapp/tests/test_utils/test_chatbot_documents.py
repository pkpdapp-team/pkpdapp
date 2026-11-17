#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
import io
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from qdrant_client import QdrantClient, models

from pkpdapp.utils import chatbot_documents
from pkpdapp.utils.chatbot_documents import DocumentsError


def fake_embed(client, texts):
    # one dimension per topic, so similar topics get similar vectors
    return [
        [float("tmdd" in text.lower()), float("nonmem" in text.lower()), 0.1]
        for text in texts
    ]


CHUNKS = [
    {
        "text": "TMDD binding to the target",
        "filename": "a.pdf",
        "chunk_index": 0,
        "pages": [3, 4],
    },
    {
        "text": "NONMEM ADVAN6 subroutines",
        "filename": "b.pdf",
        "chunk_index": 0,
        "pages": [7],
    },
]


@override_settings(CHATBOT_EMBEDDING_MODEL="model-a")
class DocumentSearchTestCase(TestCase):
    def setUp(self):
        self.qdrant = QdrantClient(":memory:")
        for patch in (
            mock.patch.object(
                chatbot_documents, "get_qdrant", return_value=self.qdrant
            ),
            mock.patch.object(chatbot_documents, "embed", fake_embed),
        ):
            patch.start()
            self.addCleanup(patch.stop)

    def test_search_returns_the_closest_chunk_first(self):
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS)
        hits = chatbot_documents.search(None, "Which NONMEM subroutines?")
        self.assertEqual(hits[0]["filename"], "b.pdf")
        self.assertEqual(hits[0]["pages"], [7])

    def test_ingest_keeps_the_old_collection_until_cleanup(self):
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS)
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS[:1])
        self.assertEqual(len(self.qdrant.get_collections().collections), 2)
        # search uses the newest collection
        self.assertEqual(self.qdrant.count(chatbot_documents.COLLECTION).count, 1)

        old = chatbot_documents.old_collections(keep=0)
        chatbot_documents.delete_collections(collections=old)
        self.assertEqual(len(self.qdrant.get_collections().collections), 1)
        self.assertEqual(self.qdrant.count(chatbot_documents.COLLECTION).count, 1)

    def test_ingest_refuses_no_chunks(self):
        with self.assertRaises(DocumentsError):
            chatbot_documents.ingest_new(client=None, chunks=[])
        self.assertEqual(self.qdrant.get_collections().collections, [])

    def test_ingest_new_makes_a_live_complete_collection(self):
        collection = chatbot_documents.ingest_new(client=None, chunks=CHUNKS)
        [listed] = chatbot_documents.list_collections(qdrant=self.qdrant)
        self.assertEqual(listed["name"], collection)
        self.assertTrue(listed["live"])
        self.assertTrue(listed["complete"])
        self.assertEqual(listed["chunks"], 2)
        self.assertEqual(listed["embedding_model"], "model-a")

    def test_ingest_add_skips_unchanged_chunks(self):
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS)
        with mock.patch.object(
            chatbot_documents, "embed", side_effect=fake_embed
        ) as embed:
            result = chatbot_documents.ingest_add(client=None, chunks=CHUNKS)
        embed.assert_not_called()
        self.assertEqual(result, {"stored": 0, "unchanged": 2})

    def test_ingest_add_stores_new_and_changed_chunks(self):
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS)
        changed = {**CHUNKS[0], "text": "TMDD binding, revised"}
        new = {"text": "NONMEM $PK", "filename": "c.pdf", "chunk_index": 0}

        result = chatbot_documents.ingest_add(client=None, chunks=[changed, new])

        self.assertEqual(result, {"stored": 2, "unchanged": 0})
        points, _ = self.qdrant.scroll(chatbot_documents.COLLECTION, limit=10)
        # the changed chunk replaced the old one instead of being added next to it
        self.assertEqual(len(points), 3)
        texts = {point.payload["filename"]: point.payload["text"] for point in points}
        # b.pdf was not in the added chunks, so it is left alone
        self.assertEqual(
            texts,
            {
                "a.pdf": "TMDD binding, revised",
                "b.pdf": "NONMEM ADVAN6 subroutines",
                "c.pdf": "NONMEM $PK",
            },
        )

    def test_ingest_add_refuses_when_there_is_no_live_collection(self):
        with self.assertRaisesRegex(DocumentsError, "no live collection"):
            chatbot_documents.ingest_add(client=None, chunks=CHUNKS)

    def test_ingest_add_refuses_another_embedding_model_unless_forced(self):
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS)
        new = {"text": "NONMEM $PK", "filename": "c.pdf", "chunk_index": 0}

        with override_settings(CHATBOT_EMBEDDING_MODEL="model-b"):
            with self.assertRaisesRegex(DocumentsError, "embedding model"):
                chatbot_documents.ingest_add(client=None, chunks=[new])
            result = chatbot_documents.ingest_add(
                client=None, chunks=[new], force=True
            )

        self.assertEqual(result, {"stored": 1, "unchanged": 0})

    def test_switch_collection_makes_an_older_collection_live(self):
        older = chatbot_documents.ingest_new(client=None, chunks=CHUNKS)
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS)

        chatbot_documents.switch_collection(collection=older)

        live = chatbot_documents.live_collection(qdrant=self.qdrant)
        self.assertEqual(live, older)

    def make_incomplete_collection(self) -> str:
        """A collection as a failed ingest would leave behind."""
        incomplete = f"{chatbot_documents.COLLECTION_PREFIX}incomplete"
        self.qdrant.create_collection(
            incomplete,
            vectors_config=models.VectorParams(size=3, distance=models.Distance.COSINE),
            metadata={"embedding_model": "model-a", "complete": False},
        )
        return incomplete

    def test_switch_collection_refuses_unknown_and_incomplete_collections(self):
        incomplete = self.make_incomplete_collection()

        with self.assertRaisesRegex(DocumentsError, "no collection"):
            chatbot_documents.switch_collection(collection="pkpdapp_documents_nope")
        with self.assertRaisesRegex(DocumentsError, "not complete"):
            chatbot_documents.switch_collection(collection=incomplete)

    def test_switch_collection_refuses_another_embedding_model_unless_forced(self):
        older = chatbot_documents.ingest_new(client=None, chunks=CHUNKS)
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS)

        with override_settings(CHATBOT_EMBEDDING_MODEL="model-b"):
            with self.assertRaisesRegex(DocumentsError, "embedding model"):
                chatbot_documents.switch_collection(collection=older)
            chatbot_documents.switch_collection(collection=older, force=True)

        live = chatbot_documents.live_collection(qdrant=self.qdrant)
        self.assertEqual(live, older)

    def test_delete_collections_refuses_the_live_collection(self):
        older = chatbot_documents.ingest_new(client=None, chunks=CHUNKS)
        live = chatbot_documents.ingest_new(client=None, chunks=CHUNKS)

        with self.assertRaisesRegex(DocumentsError, "is live"):
            chatbot_documents.delete_collections(collections=[older, live])
        # nothing is deleted when one of the collections is refused
        collections = chatbot_documents.list_collections(qdrant=self.qdrant)
        self.assertEqual(len(collections), 2)

        chatbot_documents.delete_collections(collections=[older])
        collections = chatbot_documents.list_collections(qdrant=self.qdrant)
        self.assertEqual([c["name"] for c in collections], [live])

    def test_old_collections_keeps_the_newest_and_skips_incomplete_ones(self):
        oldest = chatbot_documents.ingest_new(client=None, chunks=CHUNKS)
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS)
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS)  # live
        self.make_incomplete_collection()

        # of the two old complete collections, the newest is kept
        self.assertEqual(chatbot_documents.old_collections(keep=1), [oldest])

    def test_ingest_new_stores_the_tag_and_refuses_a_used_or_bad_one(self):
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS, tag="three-pdfs")
        [listed] = chatbot_documents.list_collections(qdrant=self.qdrant)
        self.assertEqual(listed["tag"], "three-pdfs")

        with self.assertRaisesRegex(DocumentsError, "already used"):
            chatbot_documents.ingest_new(client=None, chunks=CHUNKS, tag="three-pdfs")
        with self.assertRaisesRegex(DocumentsError, "may only contain"):
            chatbot_documents.ingest_new(client=None, chunks=CHUNKS, tag="two words")
        self.assertEqual(len(self.qdrant.get_collections().collections), 1)

    def test_a_tag_works_in_place_of_the_name(self):
        older = chatbot_documents.ingest_new(client=None, chunks=CHUNKS, tag="old")
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS, tag="new")
        new_chunk = {"text": "NONMEM $PK", "filename": "c.pdf", "chunk_index": 0}

        chatbot_documents.switch_collection(collection="old")
        result = chatbot_documents.ingest_add(
            client=None, chunks=[new_chunk], collection="new"
        )
        chatbot_documents.delete_collections(collections=["new"])

        self.assertEqual(result, {"stored": 1, "unchanged": 0})
        collections = chatbot_documents.list_collections(qdrant=self.qdrant)
        self.assertEqual([c["name"] for c in collections], [older])
        self.assertTrue(collections[0]["live"])

    def test_documents_list_shows_the_tags_in_line(self):
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS)
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS, tag="three-pdfs")
        out = io.StringIO()

        call_command("documents", "list", stdout=out)

        header, tagged, untagged = out.getvalue().splitlines()
        self.assertTrue(tagged.startswith("three-pdfs  "))
        self.assertTrue(untagged.startswith("-  "))
        # the collection names start in the same column on every line
        column = header.index("COLLECTION")
        self.assertEqual(tagged.index(chatbot_documents.COLLECTION_PREFIX), column)
        self.assertEqual(untagged.index(chatbot_documents.COLLECTION_PREFIX), column)

    def test_documents_ingest_refuses_tag_together_with_add(self):
        with self.assertRaises(CommandError):
            call_command("documents", "ingest", "chunks.jsonl", "--add", "--tag", "x")

    def test_documents_delete_refuses_names_together_with_old(self):
        with self.assertRaises(CommandError):
            call_command("documents", "delete", "pkpdapp_documents_a", "--old")
