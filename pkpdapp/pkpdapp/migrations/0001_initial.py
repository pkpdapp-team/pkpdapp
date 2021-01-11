#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='BiomarkerType',
            fields=[
                ('id', models.AutoField(auto_created=True,
                                        primary_key=True,
                                        serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('unit', models.CharField(choices=[('mg', 'type1')],
                                          max_length=2)),
                ('description', models.TextField()),
            ],
        ),
        migrations.CreateModel(
            name='Dataset',
            fields=[
                ('id', models.AutoField(auto_created=True,
                                        primary_key=True,
                                        serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField()),
                ('administration_type', models.CharField(choices=[
                 ('T1', 'type1'), ('T2', 'type2')], max_length=2)),
            ],
        ),
        migrations.CreateModel(
            name='PkpdModel',
            fields=[
                ('id', models.AutoField(auto_created=True,
                                        primary_key=True,
                                        serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField()),
                ('model_type', models.CharField(
                    choices=[('PK', 'Pharmokinetic'), ('PD', 'Pharmodynamic')],
                    max_length=2
                )),
                ('sbml', models.TextField()),
            ],
        ),
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.AutoField(auto_created=True,
                                        primary_key=True,
                                        serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField()),
                ('datasets', models.ManyToManyField(to='pkpdapp.Dataset')),
                ('pkpd_models', models.ManyToManyField(
                    to='pkpdapp.PkpdModel')),
                ('users', models.ManyToManyField(to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Biomarker',
            fields=[
                ('id', models.AutoField(auto_created=True,
                                        primary_key=True,
                                        serialize=False, verbose_name='ID')),
                ('time', models.DateTimeField()),
                ('value', models.FloatField()),
                ('biomarker_type', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to='pkpdapp.BiomarkerType')),
                ('dataset', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='pkpdapp.Dataset')),
            ],
        ),
    ]
