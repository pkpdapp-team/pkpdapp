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
                
        group_type_id = request.data.get('group_type_id', None)
        if group_type_id is None:
            errors['group_type_id'] = "This field is required"
        else:
            try:
                group_type = \
                    BiomarkerType.objects.get(id=group_type_id)
            except BiomarkerType.DoesNotExist:
                errors['group_type_id'] = (
                    "BiomarkerType id {} not found"
                    .format(biomarker_type_id)
                )
                
        concentration_type_id = request.data.get('concentration_type_id', None)
        if concentration_type_id is None:
            errors['concentration_type_id'] = "This field is required"
        else:
            try:
                concentration_type = \
                    BiomarkerType.objects.get(id=concentration_type_id)
            except BiomarkerType.DoesNotExist:
                errors['group_type_id'] = (
                    "BiomarkerType id {} not found"
                    .format(concentration_type_id)
                )
        

        if errors:
            return Response(
                errors, status=status.HTTP_400_BAD_REQUEST
            )

        group_data = group_type.data(first_time_only=True)
        groups = list(group_data['values'].unique()) + [None]
        obs_data = biomarker_type.data()
        concentration_data = concentration_type.data(first_time_only=True)

        auces = []
        for group in groups:
            if group is None:
                group_subjects = group_data['subjects'].unique()
            else:
                group_subjects = group_data.loc[group_data['values'] == group]['subjects']
            group_concentrations = concentration_data[concentration_data['subjects'].isin(group_subjects)]
            group_obs_data = obs_data[obs_data['subjects'].isin(group_subjects)]
            
            subject_times = []
            subject_data = []
            concentrations = []
            subject_ids = []
            for subject in group_subjects:
                times = group_obs_data.loc[group_obs_data['subjects'] == subject]['times']
                values = group_obs_data.loc[group_obs_data['subjects'] == subject]['values']
                concentration = group_concentrations.loc[group_concentrations['subjects'] == subject]['values'].iloc[0]
                concentrations.append(concentration)
                subject_times.append(times)
                subject_data.append(values)
                subject_ids.append(subject)
            auces.append(Auce(
                group if group is not None else 'All',
                subject_ids, concentrations,
                subject_times, subject_data
            ))

        serializers = [AuceSerializer(auce) for auce in auces]

        if errors:
            return Response(
                errors, status=status.HTTP_400_BAD_REQUEST
            )

        return Response([serializer.data for serializer in serializers])
