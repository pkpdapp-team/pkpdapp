#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.core.management.base import BaseCommand

from pkpdapp.utils.chatbot_documents import clean_up


class Command(BaseCommand):
    help = (
        "List the document collections the chatbot no longer uses (older "
        "ingests). With --delete, delete them."
    )

    def add_arguments(self, parser):
        parser.add_argument("--delete", action="store_true")

    def handle(self, delete, **options):
        clean_up(delete)
