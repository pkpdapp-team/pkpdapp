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
import myokit

datafile_urls = [
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/lxf_control_growth.csv',  # noqa: E501
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/lxf_high_erlotinib_dose.csv',  # noqa: E501
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/lxf_low_erlotinib_dose.csv',  # noqa: E501
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/lxf_medium_erlotinib_dose.csv',  # noqa: E501
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/lxf_single_erlotinib_dose.csv',  # noqa: E501
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/demo_pk_data_upload.csv',  # noqa: E501
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/TCB4dataset.csv',  # noqa: E501
]

datafile_names = [
    'lxf_control_growth',
    'lxf_high_erlotinib_dose',
    'lxf_low_erlotinib_dose',
    'lxf_medium_erlotinib_dose',
    'lxf_single_erlotinib_dose',
    'demo_pk_data',
    'TCB4dataset',
]

protocol_units = [
    {
        'time': None,
        'amount': None,
    },
    {
        'time': None,
        'amount': None,
    },
    {
        'time': None,
        'amount': None,
    },
    {
        'time': None,
        'amount': None,
    },
    {
        'time': None,
        'amount': None,
    },
    {
        'time': myokit.Unit.parse_simple('h'),
        'amount': myokit.Unit.parse_simple('mg'),
    },
    {
        'time': None,
        'amount': myokit.Unit.parse_simple('ng'),
    },
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
    '''
TCB4 dataset
''',  # noqa: W605

]

biomarkers_for_datasets = [
    [
        {
            'name': 'Tumour volume',
            'unit': 'cm^3',
            'time': 'd',
        },
        {
            'name': 'Body weight',
            'unit': 'g',
            'time': 'd',
        },
    ],
    [
        {
            'name': 'Tumour volume',
            'unit': 'cm^3',
            'time': 'd',
        },
        {
            'name': 'Body weight',
            'unit': 'g',
            'time': 'd',
        },
        {
            'name': 'Plasma concentration',
            'unit': 'ng/mL',
            'time': 'd',
        },
    ],
    [
        {
            'name': 'Tumour volume',
            'unit': 'cm^3',
            'time': 'd',
        },
        {
            'name': 'Body weight',
            'unit': 'g',
            'time': 'd',
        },
        {
            'name': 'Plasma concentration',
            'unit': 'ng/mL',
            'time': 'd',
        },
    ],
    [
        {
            'name': 'Tumour volume',
            'unit': 'cm^3',
            'time': 'd',
        },
        {
            'name': 'Body weight',
            'unit': 'g',
            'time': 'd',
        },
        {
            'name': 'Plasma concentration',
            'unit': 'ng/mL',
            'time': 'd',
        },
    ],
    [
        {
            'name': 'Body weight',
            'unit': 'g',
            'time': 'd',
        },
        {
            'name': 'Plasma concentration',
            'unit': 'ng/mL',
            'time': 'd',
        },
    ],
    [
        {
            'name': 'Docetaxel',
            'unit': 'ng/mL',
            'time': 'hours',
        },
        {
            'name': 'Red blood cells',
            'unit': '10^6/mcL',
            'time': 'hours',
        },
        {
            'name': 'Hemoglobin',
            'unit': 'g/dL',
            'time': 'hours',
        },
        {
            'name': 'Platelets ',
            'unit': '10^3/mcL',
            'time': 'hours',
        },
        {
            'name': 'White blood cells',
            'unit': '10^3/mcL',
            'time': 'hours',
        },
    ],
    [
        {
            'name': 'IL2',
            'unit': 'ng/mL',
            'time': 'h',
        },
        {
            'name': 'IL10',
            'unit': 'ng/mL',
            'time': 'h',
        },
        {
            'name': 'IL6',
            'unit': 'ng/mL',
            'time': 'h',
        },
        {
            'name': 'IFNg',
            'unit': 'ng/mL',
            'time': 'h',
        },
        {
            'name': 'TNFa',
            'unit': 'ng/mL',
            'time': 'h',
        },
        {
            'name': 'Cells',
            'unit': 'ng/mL',
            'time': 'h',
        },
    ],
]


def load_datasets(apps, schema_editor):
    Dataset = apps.get_model("pkpdapp", "Dataset")
    Subject = apps.get_model("pkpdapp", "Subject")
    Biomarker = apps.get_model("pkpdapp", "Biomarker")
    BiomarkerType = apps.get_model("pkpdapp", "BiomarkerType")
    Project = apps.get_model("pkpdapp", "Project")
    Compound = apps.get_model("pkpdapp", "Compound")
    Dose = apps.get_model("pkpdapp", "Dose")
    Unit = apps.get_model("pkpdapp", "Unit")
    Protocol = apps.get_model("pkpdapp", "Protocol")

    demo_project = Project.objects.get(name='demo')
    for (datafile_name, datafile_url, datafile_description,
         biomarkers, protocol_unit) \
            in zip(datafile_names, datafile_urls, datafile_descriptions,
                   biomarkers_for_datasets, protocol_units):

        with urllib.request.urlopen(datafile_url) as f:
            # create all the biomarker measurements for that dataset
            # create the dataset
            dataset = Dataset(
                name=datafile_name,
                description=datafile_description,
                datetime=make_aware(datetime.today()),
                project=demo_project
            )
            dataset.save()

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
                    stored_unit=Unit.objects.get(
                        symbol=b['unit']
                    ),
                    display_unit=Unit.objects.get(
                        symbol=b['unit']
                    ),
                    stored_time_unit=Unit.objects.get(
                        symbol=b['time']
                    ),
                    display_time_unit=Unit.objects.get(
                        symbol=b['time']
                    ),
                    dataset=dataset,
                    color=i,
                ) for i, b in enumerate(biomarkers)
            ]

            # parse as csv file
            data_reader = csv.reader(codecs.iterdecode(f, 'utf-8'))

            # skip the header
            next(data_reader)

            # create entries
            if datafile_name == 'TCB4dataset':
                TIME_COLUMN = 0
                TIME_UNIT_COLUMN = 10
                VALUE_COLUMN = 1
                TINF_COLUMN = None
                UNIT_COLUMN = 11
                BIOMARKER_TYPE_COLUMN = 2
                SUBJECT_ID_COLUMN = 8
                DOSE_COLUMN = None
                DOSE_GROUP_COLUMN = 4
                COMPOUND_COLUMN = None
                SUBJECT_GROUP_COLUMN = 3
            elif datafile_name == 'demo_pk_data':
                TIME_COLUMN = 4
                TIME_UNIT_COLUMN = 5
                TINF_COLUMN = 9
                VALUE_COLUMN = 3
                UNIT_COLUMN = 11
                BIOMARKER_TYPE_COLUMN = 13
                SUBJECT_ID_COLUMN = 2
                DOSE_GROUP_COLUMN = None
                DOSE_COLUMN = 8
                COMPOUND_COLUMN = 0
                SUBJECT_GROUP_COLUMN = None
            else:
                TIME_COLUMN = 1
                TIME_UNIT_COLUMN = 2
                TINF_COLUMN = None
                VALUE_COLUMN = 4
                UNIT_COLUMN = 5
                BIOMARKER_TYPE_COLUMN = 3
                DOSE_GROUP_COLUMN = None
                SUBJECT_ID_COLUMN = 0
                DOSE_COLUMN = None
                COMPOUND_COLUMN = None
                SUBJECT_GROUP_COLUMN = None
            subject_index = 0
            for row in data_reader:
                biomarker_type_str = row[BIOMARKER_TYPE_COLUMN]
                if not biomarker_type_str:
                    continue
                if biomarker_type_str not in biomarker_index:
                    continue
                index = biomarker_index[biomarker_type_str]
                bt = biomarker_types[index]
                value = row[VALUE_COLUMN]

                subject_id = row[SUBJECT_ID_COLUMN]
                try:
                    subject = Subject.objects.get(
                        id_in_dataset=subject_id,
                        dataset=dataset,
                    )
                except Subject.DoesNotExist:
                    group = ''
                    dose_group_amount = None
                    dose_group_unit = None
                    if SUBJECT_GROUP_COLUMN:
                        group = row[SUBJECT_GROUP_COLUMN]
                    if DOSE_GROUP_COLUMN:
                        dose_group_amount = row[DOSE_GROUP_COLUMN]
                        dose_group_unit = Unit.objects.get(symbol='')

                    subject = Subject.objects.create(
                        id_in_dataset=subject_id,
                        dataset=dataset,
                        group=group,
                        dose_group_amount=dose_group_amount,
                        dose_group_unit=dose_group_unit,
                        shape=subject_index,
                    )
                    subject_index += 1
                if UNIT_COLUMN is None:
                    unit = Unit.objects.get(symbol='')
                else:
                    unit = Unit.objects.get(symbol=row[UNIT_COLUMN])
                    unit == bt.stored_unit
                if TIME_UNIT_COLUMN is None:
                    time_unit = Unit.objects.get(symbol='h')
                else:
                    time_unit = Unit.objects.get(symbol=row[TIME_UNIT_COLUMN])
                try:
                    value = float(value)
                    is_number = True
                except ValueError:
                    is_number = False
                if is_number:
                    Biomarker.objects.create(
                        time=row[TIME_COLUMN],
                        subject=subject,
                        value=value,
                        biomarker_type=bt
                    )
                elif (
                    DOSE_COLUMN and
                    row[VALUE_COLUMN] == '.' and
                    row[DOSE_COLUMN] != '.'
                ):
                    compound_str = row[COMPOUND_COLUMN]
                    try:
                        compound = Compound.objects.get(name=compound_str)
                    except Compound.DoesNotExist:
                        compound = Compound.objects.create(
                            name=compound_str
                        )
                    try:
                        protocol = Protocol.objects.get(
                            dataset=dataset,
                            subject=subject,
                            compound=compound
                        )
                    except Protocol.DoesNotExist:
                        protocol = Protocol.objects.create(
                            name='{}-{}-{}'.format(
                                dataset.name,
                                compound.name,
                                subject_id
                            ),
                            compound=compound,
                            dataset=dataset,
                            subject=subject,
                            time_unit=time_unit,
                            project=demo_project,
                            amount_unit=unit,
                        )

                    Dose.objects.create(
                        start_time=row[TIME_COLUMN],
                        amount=row[DOSE_COLUMN],
                        duration=row[TINF_COLUMN],
                        protocol=protocol,
                    )


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0003_initial_users_and_projects'),
        ('pkpdapp', '0007_initial_units'),
    ]

    operations = [
        migrations.RunPython(load_datasets),
    ]
