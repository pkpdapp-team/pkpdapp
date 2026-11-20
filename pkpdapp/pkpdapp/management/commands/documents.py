#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from pkpdapp.utils import chatbot_documents
from pkpdapp.utils.chatbot import get_client


class Command(BaseCommand):
    help = "Manage the document collections that the chatbot searches."

    def add_arguments(self, parser):
        actions = parser.add_subparsers(dest="action", required=True)

        actions.add_parser("list", help="List the collections, newest first.")

        ingest = actions.add_parser(
            "ingest",
            help=(
                "Embed a chunks.jsonl file (made by documents/make_chunks.py) "
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
            "ingest": self.handle_ingest,
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
        if not collections:
            self.stdout.write("no document collections")
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
