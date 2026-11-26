#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import json
import time
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from pkpdapp.utils import chatbot_documents, document_chunking, document_processing
from pkpdapp.utils.chatbot import get_client


# where the offline document data (PDFs, docling JSON, chunks.jsonl) is kept
DOCUMENTS_DIR = Path(settings.BASE_DIR).parent / "documents"


class Command(BaseCommand):
    help = "Manage the document collections that the chatbot searches."

    def add_arguments(self, parser):
        actions = parser.add_subparsers(dest="action", required=True)

        actions.add_parser("list", help="List the collections, newest first.")

        chunk = actions.add_parser(
            "chunk",
            help=(
                "Read PDFs and write the chunks.jsonl that ingest embeds. Slow, "
                "and needs docling; meant for a development machine."
            ),
        )
        chunk.add_argument(
            "pdfs",
            nargs="*",
            type=Path,
            help="PDFs to read (default: every PDF in --pdf-dir)",
        )
        chunk.add_argument(
            "--pdf-dir",
            type=Path,
            default=DOCUMENTS_DIR / "pdfs",
            help="default: documents/pdfs",
        )
        chunk.add_argument(
            "--work-dir",
            type=Path,
            default=DOCUMENTS_DIR,
            help=(
                "where the docling JSON of each PDF (docling/) and chunks.jsonl "
                "are kept (default: documents/)"
            ),
        )
        chunk.add_argument(
            "--formulas", action="store_true", help="read formulas as LaTeX (slow)"
        )

        ingest = actions.add_parser(
            "ingest",
            help=(
                "Embed a chunks.jsonl file (made by documents chunk) "
                "into a new collection and make it live."
            ),
        )
        ingest.add_argument("chunks_path", type=Path)
        ingest.add_argument(
            "--pdfs",
            type=Path,
            required=True,
            help=(
                "directory holding the original PDF of every file named in the "
                "chunks; they are copied to MEDIA_ROOT so the chatbot can link them"
            ),
        )
        ingest.add_argument(
            "--tag",
            help="a short name for the new collection, accepted in place of its name",
        )
        ingest.add_argument(
            "--add",
            action="store_true",
            help="add to an existing collection instead (default: the live one)",
        )
        ingest.add_argument(
            "--collection",
            help="with --add, the collection (name or tag) to add to",
        )
        ingest.add_argument(
            "--force",
            action="store_true",
            help="with --add, accept a different embedding model name",
        )

        actions.add_parser(
            "rebuild-projects",
            help=(
                "Embed the documents uploaded to projects again with the current "
                "embedding model. Run it after an ingest changed the model."
            ),
        )

        actions.add_parser(
            "cleanup",
            help=(
                "Mark uploads that were still processing as failed (their thread "
                "is gone) and remove the chunks of deleted project documents. "
                "Meant to run when the server starts."
            ),
        )

        switch = actions.add_parser("switch", help="Make a collection live.")
        switch.add_argument("collection", help="name or tag")
        switch.add_argument(
            "--force",
            action="store_true",
            help="accept a different embedding model name",
        )

        delete = actions.add_parser("delete", help="Delete collections.")
        delete.add_argument("collections", nargs="*", help="names or tags")
        delete.add_argument(
            "--old",
            action="store_true",
            help="delete all old complete collections",
        )
        delete.add_argument(
            "--keep",
            type=int,
            default=1,
            help="with --old, keep this many of the newest (default: 1)",
        )

    def handle(self, action, **options):
        handlers = {
            "list": self.handle_list,
            "chunk": self.handle_chunk,
            "ingest": self.handle_ingest,
            "rebuild-projects": self.handle_rebuild_projects,
            "cleanup": self.handle_cleanup,
            "switch": self.handle_switch,
            "delete": self.handle_delete,
        }
        try:
            handlers[action](**options)
        except chatbot_documents.DocumentsError as error:
            raise CommandError(error)

    def handle_list(self, **options):
        qdrant = chatbot_documents.get_qdrant()
        collections = chatbot_documents.list_collections(qdrant=qdrant)
        project = chatbot_documents.project_collection_info(qdrant=qdrant)
        if not collections:
            self.stdout.write("no document collections")
            self._write_project_collection(project)
            return
        tags = [c["tag"] or "-" for c in collections]
        tag_width = max(len(tag) for tag in ["TAG", *tags])
        self.stdout.write(
            f"{'TAG':<{tag_width}}  {'COLLECTION':<40}  {'STATE':<10}  "
            f"{'CHUNKS':>6}  EMBEDDING MODEL"
        )
        for c, tag in zip(collections, tags):
            if c["live"]:
                state = "live"
            else:
                state = "complete" if c["complete"] else "incomplete"
            self.stdout.write(
                f"{tag:<{tag_width}}  {c['name']:<40}  {state:<10}  "
                f"{c['chunks']:>6}  {c['embedding_model']}"
            )
        self._write_project_collection(project)

    def _write_project_collection(self, project):
        if project is not None:
            self.stdout.write(
                f"project documents ({chatbot_documents.PROJECT_COLLECTION}): "
                f"{project['chunks']} chunks, "
                f"embedding model {project['embedding_model']}"
            )

    def handle_chunk(self, pdfs, pdf_dir, work_dir, formulas, **options):
        json_dir = work_dir / "docling"
        json_dir.mkdir(parents=True, exist_ok=True)
        pdfs = pdfs or sorted(pdf_dir.glob("*.pdf"))
        if not pdfs:
            raise CommandError(f"no PDFs in {pdf_dir}")
        failed = self._convert(pdfs, json_dir, formulas)
        # all documents, not only the new ones, so the file is always complete
        total = self._write_chunks(json_dir, work_dir / "chunks.jsonl")
        self.stdout.write(f"{total} chunks written to {work_dir / 'chunks.jsonl'}")
        if failed:
            raise CommandError(f"could not read: {', '.join(failed)}")

    def _convert(self, pdfs, json_dir, formulas):
        """Read the PDFs that have no docling JSON yet; names of the failed ones."""
        todo = [pdf for pdf in pdfs if not (json_dir / f"{pdf.stem}.json").exists()]
        self.stdout.write(
            f"{len(pdfs) - len(todo)} PDFs already read, {len(todo)} to read"
        )
        converter = document_chunking.make_converter(formulas) if todo else None
        failed = []
        for pdf in todo:
            start = time.perf_counter()
            try:
                outcome = document_chunking.convert_to_json(
                    converter, pdf, json_dir / f"{pdf.stem}.json"
                )
            except Exception as error:
                outcome = {"status": "failed", "error": repr(error)}
                failed.append(pdf.name)
            seconds = time.perf_counter() - start
            detail = f" ({outcome['error']})" if outcome.get("error") else ""
            self.stdout.write(
                f"{outcome['status']:8} {seconds:6.1f} s  {pdf.name}{detail}"
            )
        return failed

    def _write_chunks(self, json_dir, chunks_path):
        chunker = document_chunking.make_chunker()
        total = 0
        # write then rename, so a half-written file never replaces a good one
        tmp_path = chunks_path.with_suffix(".jsonl.tmp")
        with tmp_path.open("w") as out:
            for json_path in sorted(json_dir.glob("*.json")):
                document = document_chunking.load_docling_json(json_path)
                chunks = document_chunking.chunk_document(chunker, document)
                for chunk in chunks:
                    out.write(json.dumps(chunk) + "\n")
                total += len(chunks)
                self.stdout.write(f"{len(chunks):4} chunks  {json_path.name}")
        tmp_path.rename(chunks_path)
        return total

    def handle_cleanup(self, **options):
        # first, and without Qdrant, so it works when Qdrant is unreachable
        interrupted = document_processing.fail_processing_documents()
        self.stdout.write(f"{interrupted} interrupted uploads marked failed")
        if not chatbot_documents.document_search_enabled():
            self.stdout.write("document search is not enabled; no chunks checked")
            return
        removed = chatbot_documents.delete_orphan_project_chunks()
        self.stdout.write(f"chunks of {removed} deleted documents removed")

    def handle_rebuild_projects(self, **options):
        result = chatbot_documents.rebuild_project_documents(client=get_client())
        self.stdout.write(f"{result['rebuilt']} project documents rebuilt")
        if result["failed"]:
            raise CommandError(f"failed: {', '.join(result['failed'])}")

    def handle_ingest(self, chunks_path, pdfs, add, collection, force, tag, **options):
        if collection and not add:
            raise CommandError("--collection only works with --add")
        if tag and add:
            raise CommandError("--tag only works without --add")
        with chunks_path.open() as chunks_file:
            chunks = [json.loads(line) for line in chunks_file if line.strip()]
        pdf_paths = chatbot_documents.check_pdfs(chunks, pdfs)
        # first, so that every citation the new chunks can make has a link
        chatbot_documents.store_pdfs(pdf_paths)
        self.stdout.write(f"{len(pdf_paths)} PDFs stored")
        if add:
            result = chatbot_documents.ingest_add(
                client=get_client(),
                chunks=chunks,
                collection=collection,
                force=force,
            )
            self.stdout.write(
                f"{result['stored']} chunks stored, {result['unchanged']} unchanged"
            )
        else:
            collection = chatbot_documents.ingest_new(
                client=get_client(), chunks=chunks, tag=tag
            )
            self.stdout.write(f"{collection} is now live")

    def handle_switch(self, collection, force, **options):
        chatbot_documents.switch_collection(collection=collection, force=force)
        self.stdout.write(f"{collection} is now live")

    def handle_delete(self, collections, old, keep, **options):
        if old and collections:
            raise CommandError("name the collections to delete or use --old, not both")
        if old:
            collections = chatbot_documents.old_collections(keep=keep)
        elif not collections:
            raise CommandError("name the collections to delete, or use --old")
        chatbot_documents.delete_collections(collections=collections)
        self.stdout.write(f"{len(collections)} collections deleted")
