#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
from django.test import TestCase

from pkpdapp.models import Compound, Project
from pkpdapp.utils.chat_context_models import CompoundContext, load_project_for_chat


class ChatContextTestCase(TestCase):
    def setUp(self):
        self.compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(
            name="demo project",
            compound=self.compound,
            description="A demo study",
            species=Project.Species.HUMAN,
        )

    def load_project(self):
        return load_project_for_chat(self.project.pk)

    def test_describes_the_compound(self):
        project = self.load_project()

        compound = CompoundContext.from_compound(project.compound).model_dump()

        self.assertEqual(compound, {"name": "demo", "modality": "Small Molecule"})
