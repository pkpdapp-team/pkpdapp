#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import migrations
import urllib.request
import csv
import codecs
from datetime import datetime
from django.utils.timezone import make_aware

datafile_urls = [
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/lxf_control_growth.csv',  # noqa: E501
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/lxf_high_erlotinib_dose.csv',  # noqa: E501
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/lxf_low_erlotinib_dose.csv',  # noqa: E501
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/lxf_medium_erlotinib_dose.csv',  # noqa: E501
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/lxf_single_erlotinib_dose.csv',  # noqa: E501
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/demo_pk_data.csv',  # noqa: E501
]

datafile_names = [
    'lxf_control_growth',
    'lxf_high_erlotinib_dose',
    'lxf_low_erlotinib_dose',
    'lxf_medium_erlotinib_dose',
    'lxf_single_erlotinib_dose',
    'demo_pk_data',
]

datafile_descriptions = [
    '''
The dataset from [1] contains the time series data of 8 mice with
patient-derived lung cancer implants. The tumour volume of each
mouse was monitored over a period of 30 days and measured a
couple times a week.

References
----------
.. [1] Eigenmann, M. J. et al., Combining Nonclinical Experiments with
    Translational PKPD Modeling to Differentiate Erlotinib and
    Gefitinib, Mol Cancer Ther. 2016; 15(12):3110-3119.
''',
    '''
Returns the high erlotinib dose lung cancer treatment group data
published in [1]_ as a :class:`pandas.DataFrame`.

The dataset contains the time series data of 6 mice with
patient-derived lung cancer implants. Each mouse was treated with
an oral dose of erlotinib of \(100\, \\text{mg}\) per
\(\\text{g}\) body weight. The dose was administered daily from
day 3 to day 16, with a treatment break on days 9 to 13.

The blood plasma concentration of erlotinib was measured on day 14,
while the tumour volume of each mouse was monitored over a period
of 30 days and measured a couple times a week.
''',  # noqa: W605
    '''
Returns the low erlotinib dose lung cancer treatment group data
published in [1]_ as a :class:`pandas.DataFrame`.

The dataset contains the time series data of 8 mice with
patient-derived lung cancer implants. Each mouse was treated with
an oral dose of erlotinib of \(6.25\, \\text{mg}\) per
\(\\text{g}\) body weight. The dose was administered daily from
day 3 to day 16.

The blood plasma concentration of erlotinib was measured on day 10 and 16,
while the tumour volume of each mouse was monitored over a period of 30 days
and measured a couple times a week.
''',  # noqa: W605
    '''
Returns the medium erlotinib dose lung cancer treatment group data
published in [1]_ as a :class:`pandas.DataFrame`.

The dataset contains the time series data of 8 mice with patient-derived lung
cancer implants. Each mouse was treated with an oral dose of erlotinib of
\(25\, \\text{mg}\) per \(\\text{g}\) body weight. The dose was administered
daily from day 3 to day 16.

The blood plasma concentration of erlotinib was measured on day 10 and 16,
while the tumour volume of each mouse was monitored over a period of 30 days
and measured a couple times a week.
''',  # noqa: W605
    '''
Returns the single erlotinib dose lung cancer treatment group data
published in [1]_ as a :class:`pandas.DataFrame`.

The dataset contains the time series data of 30 mice with
patient-derived lung cancer implants. Each mouse was treated with
a single oral dose of erlotinib of \(100\, \\text{mg}\) per
\(\\text{g}\) body weight. The dose was administered either on
day 0 or day 4.

The blood plasma concentration of erlotinib was measured only once per mouse,
either on day 0 or day 4.
''',  # noqa: W605
    '''
Demo PK data
''',  # noqa: W605

]

biomarkers_for_datasets = [
    [
        {
            'name': 'Tumour volume',
            'unit': 'cm^3',
        },
        {
            'name': 'Body weight',
            'unit': 'g',
        },
    ],
    [
        {
            'name': 'Tumour volume',
            'unit': 'cm^3',
        },
        {
            'name': 'Body weight',
            'unit': 'g',
        },
        {
            'name': 'Plasma concentration',
            'unit': 'ng/mL',
        },
    ],
    [
        {
            'name': 'Tumour volume',
            'unit': 'cm^3',
        },
        {
            'name': 'Body weight',
            'unit': 'g',
        },
        {
            'name': 'Plasma concentration',
            'unit': 'ng/mL',
        },
    ],
    [
        {
            'name': 'Tumour volume',
            'unit': 'cm^3',
        },
        {
            'name': 'Body weight',
            'unit': 'g',
        },
        {
            'name': 'Plasma concentration',
            'unit': 'ng/mL',
        },
    ],
    [
        {
            'name': 'Body weight',
            'unit': 'g',
        },
        {
            'name': 'Plasma concentration',
            'unit': 'ng/mL',
        },
    ],
    [
        {
            'name': 'Docetaxel',
            'unit': 'ng/mL',
        },
        {
            'name': 'Red blood cells',
            'unit': '10^6/mcL',
        },
        {
            'name': 'Hemoglobin',
            'unit': 'g/dL',
        },
        {
            'name': 'Platelets',
            'unit': '10^3/mcL',
        },
        {
            'name': 'White blood cells',
            'unit': '10^3/mcL',
        },
    ],
]


def load_datasets(apps, schema_editor):
    Dataset = apps.get_model("pkpdapp", "Dataset")
    Biomarker = apps.get_model("pkpdapp", "Biomarker")
    BiomarkerType = apps.get_model("pkpdapp", "BiomarkerType")
    Project = apps.get_model("pkpdapp", "Project")
    Compound = apps.get_model("pkpdapp", "Compound")
    Dose = apps.get_model("pkpdapp", "Dose")
    Unit = apps.get_model("pkpdapp", "Unit")
    StandardUnit = apps.get_model("pkpdapp", "StandardUnit")

    for datafile_name, datafile_url, datafile_description, biomarkers \
            in zip(datafile_names, datafile_urls, datafile_descriptions,
                   biomarkers_for_datasets):
        # create the dataset
        dataset = Dataset(
            name=datafile_name,
            description=datafile_description,
            datetime=make_aware(datetime.today()),
            administration_type='type1',
        )
        dataset.save()

        # add to demo project
        demo_project = Project.objects.get(name='demo')
        demo_project.datasets.add(dataset)

        # find the index of the biomarker type, so we don't have to keep
        # looking it up
        biomarker_index = {}
        for i, b in enumerate(biomarkers):
            biomarker_index[b['name']] = i

        # create all the biomarker types for that dataset
        biomarker_types = [
            BiomarkerType.objects.create(
                name=b['name'],
                description=b['name'],
                unit=Unit.objects.get(
                    symbol=b['unit']
                ).standard_unit,
                dataset=dataset
            ) for b in biomarkers
        ]

        # create all the biomarker measurements for that dataset
        with urllib.request.urlopen(datafile_url) as f:
            # parse as csv file
            data_reader = csv.reader(codecs.iterdecode(f, 'utf-8'))

            # skip the header
            next(data_reader)

            # create entries
            if datafile_name == 'demo_pk_data':
                TIME_COLUMN = 4
                TIME_UNIT_COLUMN = 5
                VALUE_COLUMN = 3
                UNIT_COLUMN = 11
                BIOMARKER_TYPE_COLUMN = 13
                SUBJECT_ID_COLUMN = 2
                DOSE_COLUMN = 1
                COMPOUND_COLUMN = 0
            else:
                TIME_COLUMN = 1
                TIME_UNIT_COLUMN = 2
                VALUE_COLUMN = 4
                UNIT_COLUMN = 5
                BIOMARKER_TYPE_COLUMN = 3
                SUBJECT_ID_COLUMN = 0
                DOSE_COLUMN = None
                COMPOUND_COLUMN = None
            for row in data_reader:
                biomarker_type_str = row[BIOMARKER_TYPE_COLUMN]
                if not biomarker_type_str:
                    continue
                if biomarker_type_str not in biomarker_index:
                    continue
                index = biomarker_index[biomarker_type_str]
                value = row[VALUE_COLUMN]
                unit = Unit.objects.get(symbol=row[UNIT_COLUMN])
                time_unit = Unit.objects.get(symbol=row[TIME_UNIT_COLUMN])
                try:
                    value = float(value)
                    is_number = True
                except ValueError:
                    is_number = False
                if is_number:
                    bt = biomarker_types[index]
                    Biomarker.objects.create(
                        time=time_unit.multiplier * float(row[TIME_COLUMN]),
                        subject_id=row[SUBJECT_ID_COLUMN],
                        value=unit.multiplier * value,
                        biomarker_type=bt
                    )
                elif DOSE_COLUMN and row[VALUE_COLUMN] == '.':
                    compound_str = row[COMPOUND_COLUMN]
                    try:
                        compound = Compound.objects.get(name=compound_str)
                    except Compound.DoesNotExist:
                        compound = Compound.objects.create(
                            name=compound_str
                        )
                    Dose.objects.create(
                        time=time_unit.multiplier * float(row[TIME_COLUMN]),
                        subject_id=row[SUBJECT_ID_COLUMN],
                        amount=unit.multiplier * float(row[DOSE_COLUMN]),
                        compound=compound,
                        dataset=dataset,
                    )







def delete_datasets(apps, schema_editor):
    Dataset = apps.get_model("pkpdapp", "Dataset")
    Dataset.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0003_initial_users_and_projects'),
        ('pkpdapp', '0007_initial_units'),
    ]

    operations = [
        migrations.RunPython(load_datasets, delete_datasets),
    ]
