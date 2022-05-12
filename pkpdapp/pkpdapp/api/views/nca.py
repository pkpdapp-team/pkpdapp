#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import (
    views, status
)
from rest_framework.response import Response
from pkpdapp.models import (
    BiomarkerType,
    Subject,
    Dose,
)
from pkpdapp.api.serializers import NcaSerializer
from pkpdapp.utils import NCA


class NcaView(views.APIView):
    def post(self, request, format=None):
        errors = {
        }
        subject_id = request.data.get('subject_id', None)
        if subject_id is None:
            errors['subject_id'] = "This field is required"
        else:
            try:
                subject = Subject.objects.get(id=subject_id)
            except Subject.DoesNotExist:
                errors['subject_id'] = \
                    "Subject id {} not found".format(subject_id)
            if not subject.protocol:
                errors['subject_id'] = (
                    "Subject id {} does not have a protocol"
                    .format(subject_id)
                )
            if subject.protocol.dose_type != subject.protocol.DoseType.DIRECT:
                errors['subject_id'] = \
                    "Subject dosing protocol is required to be type IV"

        biomarker_type_id = request.data.get('biomarker_type_id', None)
        if biomarker_type_id is None:
            errors['biomarker_type_id'] = "This field is required"
        else:
            try:
                biomarker_type = \
                    BiomarkerType.objects.get(id=biomarker_type_id)
            except BiomarkerType.DoesNotExist:
                errors['biomarker_type_id'] = (
                    "BiomarkerType id {} not found"
                    .format(biomarker_type_id)
                )

        if errors:
            return Response(
                errors, status=status.HTTP_400_BAD_REQUEST
            )
        protocol = subject.protocol
        df = biomarker_type.as_pandas()
        df = df.loc[df['subjects'] == subject.id]

        if df.shape[0] == 0:
            errors['biomarker_type'] = (
                "BiomarkerType {} does not have measurements "
                "for subject id {}."
                .format(biomarker_type.id, subject.id)
            )

        doses = Dose.objects.filter(
            protocol=protocol
        ).all()

        if len(doses) != 1:
            errors['protocol_id'] = (
                "Protocol id {} has {} doses, only a single dose. "
                "Please choose a protocol with only one dose."
                .format(protocol.id, len(doses))
            )

        if errors:
            return Response(
                errors, status=status.HTTP_400_BAD_REQUEST
            )

        times = df['times'].tolist()
        concentrations = df['values'].tolist()
        dose_amount = doses[0].amount

        nca = NCA(times, concentrations, dose_amount)
        nca.calculate_nca()
        serializer = NcaSerializer(nca)
        return Response(serializer.data)
