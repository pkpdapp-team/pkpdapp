#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
from unittest import mock

from django.test import TestCase
from qdrant_client import QdrantClient

from pkpdapp.utils import chatbot_documents


def fake_embed(client, texts):
    # one dimension per topic, so similar topics get similar vectors
    return [
        [float("tmdd" in text.lower()), float("nonmem" in text.lower()), 0.1]
        for text in texts
    ]


CHUNKS = [
    {"text": "TMDD binding to the target", "filename": "a.pdf", "pages": [3, 4]},
    {"text": "NONMEM ADVAN6 subroutines", "filename": "b.pdf", "pages": [7]},
]


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
        chatbot_documents.ingest(None, CHUNKS)
        hits = chatbot_documents.search(None, "Which NONMEM subroutines?")
        self.assertEqual(hits[0]["filename"], "b.pdf")
        self.assertEqual(hits[0]["pages"], [7])

    def test_ingest_keeps_the_old_collection_until_cleanup(self):
        chatbot_documents.ingest(None, CHUNKS)
        chatbot_documents.ingest(None, CHUNKS[:1])
        self.assertEqual(len(self.qdrant.get_collections().collections), 2)
        # search uses the newest collection
        self.assertEqual(self.qdrant.count(chatbot_documents.COLLECTION).count, 1)

        chatbot_documents.clean_up(delete=True)
        self.assertEqual(len(self.qdrant.get_collections().collections), 1)
        self.assertEqual(self.qdrant.count(chatbot_documents.COLLECTION).count, 1)
