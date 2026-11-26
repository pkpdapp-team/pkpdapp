#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
import io
import json
import tempfile
from pathlib import Path
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from qdrant_client import QdrantClient, models

from pkpdapp.models import Compound, Document, Project
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
        "raw_text": "binding to the target",
        "filename": "a.pdf",
        "chunk_index": 0,
        "pages": [3, 4],
    },
    {
        "text": "NONMEM ADVAN6 subroutines",
        "raw_text": "ADVAN6 subroutines",
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

    def test_search_skips_hits_without_text(self):
        # the closest chunk has no passage, so the next one is returned instead
        blank = {**CHUNKS[1], "raw_text": "   "}
        chatbot_documents.ingest_new(client=None, chunks=[CHUNKS[0], blank])
        hits = chatbot_documents.search(None, "Which NONMEM subroutines?")
        self.assertEqual([hit["filename"] for hit in hits], ["a.pdf"])

    def test_search_skips_points_without_payload(self):
        # e.g. stored by another ingester
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS)
        self.qdrant.upsert(
            chatbot_documents.COLLECTION,
            points=[models.PointStruct(id=1, vector=[0.0, 1.0, 0.1], payload=None)],
        )
        hits = chatbot_documents.search(None, "Which NONMEM subroutines?")
        self.assertEqual([hit["filename"] for hit in hits], ["b.pdf", "a.pdf"])

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
            call_command(
                "documents",
                "ingest",
                "chunks.jsonl",
                "--pdfs",
                ".",
                "--add",
                "--tag",
                "x",
            )

    def test_documents_delete_refuses_names_together_with_old(self):
        with self.assertRaises(CommandError):
            call_command("documents", "delete", "pkpdapp_documents_a", "--old")


class StorePdfsTest(TestCase):
    def setUp(self):
        self.media = tempfile.TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        self.pdfs = tempfile.TemporaryDirectory()
        self.addCleanup(self.pdfs.cleanup)
        override = override_settings(MEDIA_ROOT=self.media.name)
        override.enable()
        self.addCleanup(override.disable)

    def write_pdf(self, name, content=b"%PDF-1.4 test"):
        (Path(self.pdfs.name) / name).write_bytes(content)

    def test_check_pdfs_names_every_missing_pdf(self):
        self.write_pdf("a.pdf")
        with self.assertRaisesRegex(DocumentsError, "b.pdf"):
            chatbot_documents.check_pdfs(CHUNKS, Path(self.pdfs.name))
        self.assertEqual(Document.objects.count(), 0)

    def test_check_pdfs_refuses_file_names_with_a_path(self):
        chunk = {**CHUNKS[0], "filename": "../a.pdf"}
        with self.assertRaisesRegex(DocumentsError, "path"):
            chatbot_documents.check_pdfs([chunk], Path(self.pdfs.name))

    def test_store_pdfs_restores_a_file_missing_from_media(self):
        self.write_pdf("a.pdf")
        paths = chatbot_documents.check_pdfs(CHUNKS[:1], Path(self.pdfs.name))
        chatbot_documents.store_pdfs(paths)
        Document.objects.get().file.storage.delete(Document.objects.get().file.name)

        chatbot_documents.store_pdfs(paths)

        with Document.objects.get().file.open("rb") as stored:
            self.assertEqual(stored.read(), b"%PDF-1.4 test")

    def test_store_pdfs_makes_shared_documents_and_is_repeatable(self):
        self.write_pdf("a.pdf")
        self.write_pdf("b.pdf")
        paths = chatbot_documents.check_pdfs(CHUNKS, Path(self.pdfs.name))

        chatbot_documents.store_pdfs(paths)
        self.write_pdf("a.pdf", b"%PDF-1.4 new")
        chatbot_documents.store_pdfs(paths)

        self.assertEqual(Document.objects.count(), 2)
        document = Document.objects.get(filename="a.pdf")
        self.assertIsNone(document.project)
        with document.file.open("rb") as stored:
            self.assertEqual(stored.read(), b"%PDF-1.4 new")
        self.assertEqual(len(list(Path(self.media.name, "documents").iterdir())), 2)

    def test_ingest_command_refuses_before_ingesting_when_a_pdf_is_missing(self):
        self.write_pdf("a.pdf")
        chunks_path = Path(self.pdfs.name) / "chunks.jsonl"
        chunks_path.write_text("\n".join(json.dumps(c) for c in CHUNKS))
        with (
            mock.patch.object(chatbot_documents, "ingest_new") as ingest_new,
            self.assertRaises(CommandError),
        ):
            call_command(
                "documents", "ingest", str(chunks_path), "--pdfs", self.pdfs.name
            )
        ingest_new.assert_not_called()
        self.assertEqual(Document.objects.count(), 0)


def make_project_document(name, project):
    return Document.objects.create(
        filename=name, file=f"documents/{name}", project=project
    )


def project_chunks(filename, text, count=1):
    return [
        {
            "text": text,
            "raw_text": text,
            "filename": filename,
            "chunk_index": index,
            "pages": [index + 1],
        }
        for index in range(count)
    ]


@override_settings(CHATBOT_EMBEDDING_MODEL="model-a")
class ProjectDocumentTestCase(TestCase):
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
        self.project = Project.objects.create(
            name="mine", compound=Compound.objects.create(name="demo")
        )
        self.other = Project.objects.create(
            name="theirs", compound=Compound.objects.create(name="other")
        )
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS)

    def add(self, name, text, project=None, count=1):
        document = make_project_document(name, project or self.project)
        chatbot_documents.add_project_document(
            client=None,
            document=document,
            chunks=project_chunks(name, text, count=count),
        )
        return document

    def search(self, query, project=None):
        project = project or self.project
        return chatbot_documents.search(None, query, project_id=project.id)

    def test_project_hits_come_before_shared_hits(self):
        self.add("mine.pdf", "TMDD in my own data")
        hits = self.search("TMDD")
        self.assertEqual(
            [hit["filename"] for hit in hits], ["mine.pdf", "a.pdf", "b.pdf"]
        )
        self.assertEqual([hit["project"] for hit in hits], [True, False, False])

    def test_a_weak_project_hit_still_comes_first(self):
        self.add("mine.pdf", "something else entirely")
        self.assertEqual(self.search("TMDD")[0]["filename"], "mine.pdf")

    def test_shared_hits_keep_room_when_the_project_has_many(self):
        self.add("mine.pdf", "TMDD", count=10)
        hits = self.search("TMDD")
        self.assertEqual(len(hits), chatbot_documents.SEARCH_LIMIT)
        self.assertEqual(
            sum(hit["project"] for hit in hits), chatbot_documents.PROJECT_SEARCH_LIMIT
        )

    def test_other_projects_documents_are_never_returned(self):
        self.add("theirs.pdf", "TMDD secret", project=self.other)
        names = [hit["filename"] for hit in self.search("TMDD secret")]
        self.assertNotIn("theirs.pdf", names)
        theirs = [h["filename"] for h in self.search("TMDD", self.other)]
        self.assertIn("theirs.pdf", theirs)

    def test_search_without_a_project_returns_only_shared_hits(self):
        self.add("mine.pdf", "TMDD in my own data")
        hits = chatbot_documents.search(None, "TMDD")
        self.assertEqual([hit["project"] for hit in hits], [False, False])

    def test_search_works_before_any_upload(self):
        self.assertEqual(len(self.search("TMDD")), 2)

    def test_search_skips_project_hits_embedded_with_another_model(self):
        self.add("mine.pdf", "TMDD in my own data")
        with override_settings(CHATBOT_EMBEDDING_MODEL="model-b"):
            hits = self.search("TMDD")
        self.assertEqual([hit["project"] for hit in hits], [False, False])

    def test_a_failing_project_search_falls_back_to_shared_hits(self):
        self.add("mine.pdf", "TMDD in my own data")
        with mock.patch.object(
            chatbot_documents, "_project_collection_model", side_effect=RuntimeError
        ):
            hits = self.search("TMDD")
        self.assertEqual([hit["project"] for hit in hits], [False, False])

    def test_same_file_name_in_two_projects_does_not_collide(self):
        self.add("same.pdf", "TMDD mine")
        self.add("same.pdf", "TMDD theirs", project=self.other)
        count = self.qdrant.count(chatbot_documents.PROJECT_COLLECTION).count
        self.assertEqual(count, 2)
        [hit] = [h for h in self.search("TMDD") if h["project"]]
        self.assertEqual(hit["raw_text"], "TMDD mine")

    def test_adding_a_document_again_replaces_its_chunks(self):
        document = self.add("mine.pdf", "TMDD", count=3)
        chatbot_documents.add_project_document(
            client=None, document=document, chunks=project_chunks("mine.pdf", "TMDD")
        )
        count = self.qdrant.count(chatbot_documents.PROJECT_COLLECTION).count
        self.assertEqual(count, 1)

    def test_delete_project_document_removes_only_its_chunks(self):
        first = self.add("one.pdf", "TMDD one")
        self.add("two.pdf", "TMDD two")
        chatbot_documents.delete_project_document(document_id=first.id)
        names = [h["filename"] for h in self.search("TMDD") if h["project"]]
        self.assertEqual(names, ["two.pdf"])

    def test_delete_project_document_with_no_collection_is_fine(self):
        chatbot_documents.delete_project_document(document_id=123)

    def test_project_documents_refuse_a_different_embedding_model(self):
        self.add("mine.pdf", "TMDD")
        with override_settings(CHATBOT_EMBEDDING_MODEL="model-b"):
            with self.assertRaisesRegex(DocumentsError, "rebuild-projects"):
                self.add("more.pdf", "TMDD")

    def test_refuses_shared_documents_and_no_chunks(self):
        shared = Document.objects.create(filename="s.pdf", file="documents/s.pdf")
        with self.assertRaises(DocumentsError):
            chatbot_documents.add_project_document(
                client=None, document=shared, chunks=project_chunks("s.pdf", "x")
            )
        with self.assertRaises(DocumentsError):
            self.add("empty.pdf", "x", count=0)

    def test_a_new_shared_collection_keeps_the_project_documents(self):
        self.add("mine.pdf", "TMDD in my own data")
        chatbot_documents.ingest_new(client=None, chunks=CHUNKS[:1])
        hits = self.search("TMDD")
        self.assertEqual([hit["filename"] for hit in hits], ["mine.pdf", "a.pdf"])

    def test_the_project_collection_is_not_listed_as_a_shared_one(self):
        self.add("mine.pdf", "TMDD")
        names = [c["name"] for c in chatbot_documents.list_collections(self.qdrant)]
        self.assertNotIn(chatbot_documents.PROJECT_COLLECTION, names)

    def test_rebuild_embeds_again_with_the_current_model(self):
        self.add("mine.pdf", "TMDD in my own data", count=2)
        with override_settings(CHATBOT_EMBEDDING_MODEL="model-b"):
            result = chatbot_documents.rebuild_project_documents(client=None)
            info = chatbot_documents.project_collection_info(self.qdrant)
        self.assertEqual(result, {"rebuilt": 1, "failed": []})
        self.assertEqual(info, {"chunks": 2, "embedding_model": "model-b"})
        self.assertEqual(Document.objects.get(filename="mine.pdf").chunk_count, 2)

    def test_rebuild_reads_the_pdf_when_no_chunks_are_stored(self):
        document = make_project_document("lost.pdf", self.project)
        with mock.patch(
            "pkpdapp.utils.document_chunking.chunk_pdf",
            return_value=project_chunks("lost.pdf", "TMDD again"),
        ) as chunk_pdf:
            result = chatbot_documents.rebuild_project_documents(client=None)
        chunk_pdf.assert_called_once()
        self.assertEqual(result["rebuilt"], 1)
        self.assertEqual(Document.objects.get(pk=document.pk).chunk_count, 1)

    def test_rebuild_reports_documents_it_could_not_rebuild(self):
        make_project_document("bad.pdf", self.project)
        with mock.patch(
            "pkpdapp.utils.document_chunking.chunk_pdf", side_effect=RuntimeError
        ):
            result = chatbot_documents.rebuild_project_documents(client=None)
        self.assertEqual(result, {"rebuilt": 0, "failed": ["bad.pdf"]})
        document = Document.objects.get(filename="bad.pdf")
        self.assertEqual(document.status, Document.Status.FAILED)
        self.assertEqual(document.chunk_count, None)
        self.assertTrue(document.error)

    def test_cleanup_removes_the_chunks_of_deleted_documents_only(self):
        kept = self.add("kept.pdf", "TMDD kept")
        gone = self.add("gone.pdf", "TMDD gone", count=2)
        # as if the delete-time cleanup had failed
        Document.objects.filter(pk=gone.pk)._raw_delete(Document.objects.db)
        self.assertEqual(chatbot_documents.delete_orphan_project_chunks(), 1)
        info = chatbot_documents.project_collection_info(self.qdrant)
        self.assertEqual(info["chunks"], 1)
        names = [h["filename"] for h in self.search("TMDD") if h["project"]]
        self.assertEqual(names, ["kept.pdf"])
        self.assertEqual(chatbot_documents.delete_orphan_project_chunks(), 0)
        self.assertTrue(Document.objects.filter(pk=kept.pk).exists())

    def test_cleanup_removes_chunks_that_name_no_document(self):
        self.add("kept.pdf", "TMDD kept")
        self.qdrant.upsert(
            chatbot_documents.PROJECT_COLLECTION,
            points=[
                models.PointStruct(
                    id=1,
                    vector=[1.0, 0.0, 0.1],
                    payload={"project_id": self.project.id},
                )
            ],
        )
        chatbot_documents.delete_orphan_project_chunks()
        info = chatbot_documents.project_collection_info(self.qdrant)
        self.assertEqual(info["chunks"], 1)

    def test_cleanup_without_a_project_collection_is_fine(self):
        self.assertEqual(chatbot_documents.delete_orphan_project_chunks(), 0)

    def test_documents_cleanup_command(self):
        gone = self.add("gone.pdf", "TMDD gone")
        Document.objects.filter(pk=gone.pk)._raw_delete(Document.objects.db)
        busy = make_project_document("busy.pdf", self.project)
        Document.objects.filter(pk=busy.pk).update(status="processing")
        out = io.StringIO()
        with override_settings(QDRANT_URL="http://qdrant"):
            call_command("documents", "cleanup", stdout=out)
        self.assertIn("1 interrupted uploads marked failed", out.getvalue())
        self.assertIn("chunks of 1 deleted documents removed", out.getvalue())
        self.assertEqual(Document.objects.get(pk=busy.pk).status, "failed")

    def test_documents_cleanup_still_fails_uploads_without_document_search(self):
        busy = make_project_document("busy.pdf", self.project)
        Document.objects.filter(pk=busy.pk).update(status="processing")
        out = io.StringIO()
        with override_settings(QDRANT_URL=None):
            call_command("documents", "cleanup", stdout=out)
        self.assertIn("not enabled", out.getvalue())
        self.assertEqual(Document.objects.get(pk=busy.pk).status, "failed")


class ChunkCommandTestCase(TestCase):
    """documents chunk, with docling replaced by fakes."""

    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.work = Path(directory.name)
        self.pdf_dir = self.work / "pdfs"
        self.pdf_dir.mkdir()
        for name in ("a.pdf", "b.pdf"):
            (self.pdf_dir / name).write_bytes(b"%PDF-1.4")
        self.converted = []

        def convert_to_json(converter, pdf, json_path):
            self.converted.append(pdf.name)
            if pdf.name == "bad.pdf":
                raise RuntimeError("unreadable")
            json_path.write_text(json.dumps({"name": pdf.stem}))
            return {"status": "ok", "pages": 1}

        def chunk_document(chunker, document):
            return [
                {"filename": f"{document['name']}.pdf", "chunk_index": 0, "text": "t"}
            ]

        module = "pkpdapp.management.commands.documents.document_chunking"
        for name, fake in {
            "make_converter": mock.Mock(),
            "make_chunker": mock.Mock(),
            "convert_to_json": convert_to_json,
            "load_docling_json": lambda path: json.loads(path.read_text()),
            "chunk_document": chunk_document,
        }.items():
            patch = mock.patch(f"{module}.{name}", fake)
            patch.start()
            self.addCleanup(patch.stop)

    def run_chunk(self, *pdfs):
        out = io.StringIO()
        call_command(
            "documents",
            "chunk",
            *pdfs,
            f"--pdf-dir={self.pdf_dir}",
            f"--work-dir={self.work}",
            stdout=out,
        )
        return out.getvalue()

    def written_files(self):
        lines = (self.work / "chunks.jsonl").read_text().splitlines()
        return [json.loads(line)["filename"] for line in lines]

    def test_chunks_every_pdf_in_the_folder(self):
        output = self.run_chunk()
        self.assertEqual(self.converted, ["a.pdf", "b.pdf"])
        self.assertEqual(self.written_files(), ["a.pdf", "b.pdf"])
        self.assertIn("2 chunks written", output)

    def test_a_pdf_that_was_read_is_not_read_again(self):
        self.run_chunk()
        self.converted.clear()
        (self.pdf_dir / "c.pdf").write_bytes(b"%PDF-1.4")
        self.run_chunk()
        self.assertEqual(self.converted, ["c.pdf"])
        self.assertEqual(self.written_files(), ["a.pdf", "b.pdf", "c.pdf"])

    def test_named_pdfs_are_the_only_ones_read(self):
        self.run_chunk(str(self.pdf_dir / "b.pdf"))
        self.assertEqual(self.converted, ["b.pdf"])
        self.assertEqual(self.written_files(), ["b.pdf"])

    def test_a_pdf_that_cannot_be_read_is_reported_after_the_rest_is_written(self):
        (self.pdf_dir / "bad.pdf").write_bytes(b"%PDF-1.4")
        with self.assertRaisesRegex(CommandError, "bad.pdf"):
            self.run_chunk()
        self.assertEqual(self.written_files(), ["a.pdf", "b.pdf"])

    def test_no_pdfs_is_refused(self):
        for pdf in self.pdf_dir.glob("*.pdf"):
            pdf.unlink()
        with self.assertRaisesRegex(CommandError, "no PDFs"):
            self.run_chunk()
