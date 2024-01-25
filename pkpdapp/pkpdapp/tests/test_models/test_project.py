#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from pkpdapp.models import (
    CombinedModel,
    PharmacokineticModel,
    Project,
    Compound,
    Protocol,
)


class TestProject(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="12345")
        compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(name="demo", compound=compound)
        self.project.users.add(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_copy(self):
        pk_model = PharmacokineticModel.objects.get(name="one_compartment_clinical")
        pkpd_model = CombinedModel.objects.create(
            name="my wonderful model",
            pk_model=pk_model,
            project=self.project,
        )
        protocol = Protocol.objects.create(name="my protocol")
        dose = protocol.doses.create(amount=1.0, start_time=0.0)
        protocol.doses.set([dose])
        a1 = pkpd_model.variables.get(qname="PKCompartment.A1")
        a1.protocol = protocol
        a1.save()

        a1 = pkpd_model.variables.get(qname="PKCompartment.A1")
        print('a1.protocol', a1.protocol)
        new_project = self.project.copy()

        # check that the new project has the right name
        self.assertEqual(new_project.name, "Copy of demo")

        # check that the model is there and has the right name
        self.assertEqual(new_project.pk_models.count(), 1)
        new_model = new_project.pk_models.first()
        self.assertEqual(new_model.name, "my wonderful model")
        self.assertNotEqual(new_model.pk, pkpd_model.pk)

        # check that the protocol is there and has the right name
        new_a1 = new_model.variables.get(qname="PKCompartment.A1")
        self.assertNotEqual(new_a1.pk, a1.pk)
        new_protocol = new_a1.protocol
        self.assertEqual(new_protocol.name, "my protocol")
        self.assertNotEqual(new_protocol.pk, protocol.pk)
        self.assertEqual(new_protocol.doses.count(), 1)
        new_dose = new_protocol.doses.first()
        self.assertNotEqual(new_dose.pk, dose.pk)
        self.assertEqual(new_dose.amount, 1.0)
        self.assertEqual(new_dose.start_time, 0.0)

        
 