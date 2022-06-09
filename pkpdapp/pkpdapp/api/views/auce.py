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
    Biomarker,
)
from pkpdapp.api.serializers import AuceSerializer
from pkpdapp.utils import Auce


class AuceView(views.APIView):
    def post(self, request, format=None):
        errors = {
        }

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

        subjects = Subject.objects.filter(
            dataset=biomarker_type.dataset
        ).order_by(
            'dose_group_amount'
        )

        groups = set([g for s in subjects for g in s.groups.all()] + [None])

        auces = []
        for group in groups:
            subject_times = []
            subject_data = []
            subject_ids = []
            concentrations = []
            for subject in subjects.filter(groups=group):
                times_and_values = (
                    Biomarker.objects
                    .filter(
                        biomarker_type=biomarker_type,
                        subject=subject.id
                    )
                    .order_by('time')
                    .values_list('time', 'value')
                )
                if not times_and_values:
                    continue

                if subject.dose_group_amount is None:
                    errors['biomarker_type_id'] = (
                        "BiomarkerType id {} has a subject "
                        "with no dose group amount"
                        .format(biomarker_type_id)
                    )
                    break

                times, values = list(zip(*times_and_values))
                concentrations.append(subject.dose_group_amount)
                subject_ids.append(subject.id)
                subject_times.append(times)
                subject_data.append(values)
            auces.append(Auce(
                group.name if group is not None else 'All',
                subject_ids, concentrations,
                subject_times, subject_data
            ))

        serializers = [AuceSerializer(auce) for auce in auces]

        if errors:
            return Response(
                errors, status=status.HTTP_400_BAD_REQUEST
            )

        return Response([serializer.data for serializer in serializers])
