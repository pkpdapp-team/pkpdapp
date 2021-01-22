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

datafile_url = 'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/lxf_control_growth.csv'  # noqa: E501

datafile_description = '''
The dataset from [1] contains the time series data of 8 mice with
patient-derived lung cancer implants. The tumour volume of each
mouse was monitored over a period of 30 days and measured a
couple times a week.

References
----------
.. [1] Eigenmann, M. J. et al., Combining Nonclinical Experiments with
    Translational PKPD Modeling to Differentiate Erlotinib and
    Gefitinib, Mol Cancer Ther. 2016; 15(12):3110-3119.
'''

biomarkers = [
    {
        'name': 'Tumour volume',
        'unit': 'cm^3',
    },
    {
        'name': 'Body weight',
        'unit': 'g',
    },
]


def load_datasets(apps, schema_editor):
    Dataset = apps.get_model("pkpdapp", "Dataset")
    Biomarker = apps.get_model("pkpdapp", "Biomarker")
    BiomarkerType = apps.get_model("pkpdapp", "BiomarkerType")

    # create the dataset
    dataset = Dataset(
        name='lung_cancer_control_group',
        description=datafile_description,
        datetime=make_aware(datetime.today()),
        administration_type='type1',
    )
    dataset.save()

    # find the index of the biomarker type, so we don't have to keep looking it
    # up
    biomarker_index = {}
    for i, b in enumerate(biomarkers):
        biomarker_index[b['name']] = i

    # create all the biomarker types for that dataset
    biomarker_types = [
        BiomarkerType(
            name=b['name'],
            description=b['name'],
            unit=b['unit'],
            dataset=dataset
        )
        for b in biomarkers
    ]
    [bm.save() for bm in biomarker_types]

    # create all the biomarker measurements for that dataset
    with urllib.request.urlopen(datafile_url) as f:
        # parse as csv file
        data_reader = csv.reader(codecs.iterdecode(f, 'utf-8'))

        # skip the header
        next(data_reader)

        # create entries
        TIME_COLUMN = 1
        VALUE_COLUMN = 4
        BIOMARKER_TYPE_COLUMN = 3
        SUBJECT_ID_COLUMN = 0
        for row in data_reader:
            index = biomarker_index[row[BIOMARKER_TYPE_COLUMN]]
            biomarker = Biomarker(
                time=row[TIME_COLUMN],
                subject_id=row[SUBJECT_ID_COLUMN],
                value=row[VALUE_COLUMN],
                biomarker_type=biomarker_types[index]
            )
            biomarker.save()


def delete_datasets(apps, schema_editor):
    Dataset = apps.get_model("pkpdapp", "Dataset")
    Dataset.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(load_datasets, delete_datasets),
    ]
