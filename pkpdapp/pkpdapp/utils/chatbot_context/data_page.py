#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pydantic import BaseModel

from pkpdapp.models import BiomarkerType, Project


# ---------
# data page
# ---------
class ObservationTypeContext(BaseModel):
    observation_id: str
    unit: str
    model_output: str
    point_count: int
    excluded_from_fitting: int
    time_unit: str
    time_range: tuple[float, float]

    @classmethod
    def from_biomarker_type(cls, biomarker_type: BiomarkerType):
        unit = biomarker_type.display_unit.symbol
        return cls(
            observation_id=biomarker_type.name,
            # mirrors displayUnitSymbol in Data.tsx
            unit="dimensionless" if unit == "" else unit,
            model_output=biomarker_type.variable.qname,
            # annotated in loaders.py
            point_count=biomarker_type.point_count,
            excluded_from_fitting=biomarker_type.excluded_count,
            time_unit=biomarker_type.display_time_unit.symbol,
            time_range=(biomarker_type.first_time, biomarker_type.last_time),
        )


class DataPageContext(BaseModel):
    observation_types: list[ObservationTypeContext]

    @classmethod
    def from_project(cls, project: Project):
        observation_types = []
        for dataset in project.datasets.all():
            # prefetched in loaders.py with a filter: mapped types with points only
            for biomarker_type in dataset.chat_observation_types:
                observation_types.append(
                    ObservationTypeContext.from_biomarker_type(biomarker_type)
                )
        return cls(observation_types=observation_types)
