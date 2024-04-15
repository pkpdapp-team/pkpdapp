#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.core.management.base import BaseCommand
import unittest
from snapshottest.django import TestCase
from pkpdapp.models import CombinedModel


class Command(BaseCommand):
    help = """
    If you need Arguments, please check other modules in
    django/core/management/commands.
    """

    def handle(self, **options):
        suite = unittest.TestLoader().loadTestsFromTestCase(TestSimulations)
        unittest.TextTestRunner().run(suite)


class TestSimulations(TestCase):
    def setUp(self):
        self.models = CombinedModel.objects.all()

    def test_snapshots(self):
        for model in self.models:
            outputs = [
                variable.qname for variable in model.variables.filter(constant=False)
            ]
            sims = model.simulate(
                outputs=outputs,
                time_max=672
            )
            # model.simulate returns a list.
            # We only need the first one for now.
            sim = sims[0]
            self.assertMatchSnapshot(sim)
