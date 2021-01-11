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
        'biomarker': 'volume',
    },
    {
        'name': 'Body weight',
        'biomarker': 'weight',
    },
]


def load_datasets(apps, schema_editor):
    Dataset = apps.get_model("pkpdapp", "Dataset")
    Biomarker = apps.get_model("pkpdapp", "Biomarker")
    BiomarkerType = apps.get_model("pkpdapp", "BiomarkerType")
    BiomarkerMap = apps.get_model("pkpdapp", "BiomarkerMap")

    # create the dataset
    dataset = Dataset(
        name='lung_cancer_control_group',
        description=datafile_description,
        datetime=make_aware(datetime.today()),
        administration_type='type1',
    )
    dataset.save()

    # find the biomarkers types for that dataset
    biomarker_types = [
        {
            'name': b['name'],
            'biomarker_type': BiomarkerType.objects.get(name=b['biomarker']),
        }
        for b in biomarkers
    ]

    # find the index of the biomarker, so we don't have to keep looking it up
    biomarker_index = {}
    for i, b in enumerate(biomarkers):
        biomarker_index[b['name']] = i

    # create all the biomarker maps for that dataset
    biomarker_maps = [
        BiomarkerMap(
            name=b['name'],
            description=b['name'],
            biomarker_type=b['biomarker_type'],
            dataset=dataset
        )
        for b in biomarker_types
    ]
    [bm.save() for bm in biomarker_maps]

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
                biomarker_type=biomarker_maps[index],
                dataset=dataset
            )
            biomarker.save()


def delete_datasets(apps, schema_editor):
    Dataset = apps.get_model("pkpdapp", "Dataset")
    Dataset.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0002_initial_biomarker_types'),
    ]

    operations = [
        migrations.RunPython(load_datasets, delete_datasets),
    ]
