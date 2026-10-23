#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import json
from pathlib import Path

from django.core.management.base import BaseCommand

from pkpdapp.utils.chatbot import get_client
from pkpdapp.utils.chatbot_documents import ingest


class Command(BaseCommand):
    help = (
        "Embed the chunks in a chunks.jsonl file (made by "
        "documents/make_chunks.py) and replace the chatbot's document "
        "collection with them."
    )

    def add_arguments(self, parser):
        parser.add_argument("chunks_path", type=Path)

    def handle(self, chunks_path, **options):
        with chunks_path.open() as chunks_file:
            chunks = [json.loads(line) for line in chunks_file]
        ingest(get_client(), chunks)
