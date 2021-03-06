#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
# Generated by Django 3.0.7 on 2021-01-12 17:55
# flake8: noqa

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import jsonfield.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Compound',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the compound', max_length=100)),
                ('description', models.TextField(help_text='short description of the compound')),
            ],
        ),
        migrations.CreateModel(
            name='Dataset',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the dataset', max_length=100)),
                ('datetime', models.DateTimeField(blank=True, help_text='date/time the experiment was conducted. All time measurements are relative to this date/time, which is in YYYY-MM-DD HH:MM:SS format. For example, 2020-07-18 14:30:59', null=True)),
                ('description', models.TextField(blank=True, default='', help_text='short description of the dataset')),
            ],
        ),
        migrations.CreateModel(
            name='DosedPharmacokineticModel',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the model', max_length=100)),
                ('dose_compartment', models.CharField(default='central', help_text='compartment name to be dosed', max_length=100)),
                ('time_max', models.FloatField(default=30, help_text='suggested time to simulate after the last dose (in the time units specified by the sbml model)')),
            ],
        ),
        migrations.CreateModel(
            name='PharmacodynamicModel',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the model', max_length=100)),
                ('description', models.TextField(blank=True, default='', help_text='short description of the model')),
                ('sbml', models.TextField(help_text='the model represented using SBML (see http://sbml.org)')),
                ('time_max', models.FloatField(default=30, help_text='suggested maximum time to simulate for this model (in the time units specified by the sbml model)')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='PharmacokineticModel',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the model', max_length=100)),
                ('description', models.TextField(blank=True, default='', help_text='short description of the model')),
                ('sbml', models.TextField(help_text='the model represented using SBML (see http://sbml.org)')),
                ('time_max', models.FloatField(default=30, help_text='suggested maximum time to simulate for this model (in the time units specified by the sbml model)')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='PkpdModel',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the model', max_length=100)),
                ('description', models.TextField(blank=True, default='', help_text='short description of the model')),
                ('sbml', models.TextField(help_text='the model represented using SBML (see http://sbml.org)')),
                ('time_max', models.FloatField(default=30, help_text='suggested maximum time to simulate for this model (in the time units specified by the sbml model)')),
                ('dose_compartment', models.CharField(blank=True, default='central', help_text='compartment name to be dosed', max_length=100, null=True)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='StandardUnit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('symbol', models.CharField(help_text='unit symbol (e.g. "mg")', max_length=20)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Unit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('symbol', models.CharField(help_text='unit symbol (e.g. "mg")', max_length=20)),
                ('multiplier', models.FloatField(help_text='multiplier to convert to standard unit')),
                ('standard_unit', models.ForeignKey(help_text='standard unit associated with this unit', on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.StandardUnit')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Subject',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('id_in_dataset', models.IntegerField(help_text='unique id in the dataset')),
                ('dose_group', models.CharField(blank=True, help_text='dosing group for this subject', max_length=100)),
                ('group', models.CharField(blank=True, help_text='dataset specific grouping for this subject', max_length=100)),
                ('metadata', jsonfield.fields.JSONField(help_text='subject metadata')),
                ('dataset', models.ForeignKey(help_text='dataset containing this subject', on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.Dataset')),
            ],
        ),
        migrations.CreateModel(
            name='Protocol',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the protocol', max_length=100)),
                ('dose_type', models.CharField(choices=[('D', 'Direct'), ('I', 'Indirect')], default='D', max_length=1)),
                ('compound', models.ForeignKey(blank=True, help_text='drug compound', null=True, on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.Compound')),
                ('dataset', models.ForeignKey(blank=True, help_text='dataset containing this protocol', null=True, on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.Dataset')),
                ('subject', models.ForeignKey(blank=True, help_text='subject associated with protocol', null=True, on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.Subject')),
            ],
        ),
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the project', max_length=100)),
                ('description', models.TextField(blank=True, default='', help_text='short description of the project')),
                ('datasets', models.ManyToManyField(blank=True, help_text='datasets referenced by this project', to='pkpdapp.Dataset')),
                ('pd_models', models.ManyToManyField(blank=True, help_text='PD models referenced by this project', to='pkpdapp.PharmacodynamicModel')),
                ('pk_models', models.ManyToManyField(blank=True, help_text='PK models referenced by this project', to='pkpdapp.DosedPharmacokineticModel')),
                ('pkpd_models', models.ManyToManyField(blank=True, help_text='PKPD models referenced by this project', to='pkpdapp.PkpdModel')),
                ('protocols', models.ManyToManyField(blank=True, help_text='Protocols referenced by this project', to='pkpdapp.Protocol')),
                ('users', models.ManyToManyField(help_text='users with access to this project', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Profile',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('selected_project', models.ForeignKey(help_text='currently selected project for user', null=True, on_delete=django.db.models.deletion.SET_NULL, to='pkpdapp.Project')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='pkpdmodel',
            name='protocol',
            field=models.ForeignKey(blank=True, help_text='dosing protocol', null=True, on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.Protocol'),
        ),
        migrations.AddField(
            model_name='dosedpharmacokineticmodel',
            name='pharmacokinetic_model',
            field=models.ForeignKey(help_text='pharmacokinetic model', on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.PharmacokineticModel'),
        ),
        migrations.AddField(
            model_name='dosedpharmacokineticmodel',
            name='protocol',
            field=models.ForeignKey(help_text='dosing protocol', on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.Protocol'),
        ),
        migrations.CreateModel(
            name='Dose',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_time', models.FloatField(help_text='starting time point of dose, in hours')),
                ('amount', models.FloatField(help_text='amount of compound administered, in grams')),
                ('duration', models.FloatField(default=0.0, help_text='Duration of dose administration in hours. For a bolus injection, set a dose duration of 0.')),
                ('protocol', models.ForeignKey(help_text='protocol containing this dose', on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.Protocol')),
            ],
        ),
        migrations.CreateModel(
            name='BiomarkerType',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the biomarker type', max_length=100)),
                ('description', models.TextField(blank=True, help_text='short description of the biomarker type', null=True)),
                ('dataset', models.ForeignKey(help_text='dataset containing this biomarker measurement', on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.Dataset')),
                ('unit', models.ForeignKey(blank=True, help_text='unit for the value stored in :model:`pkpdapp.Biomarker`', null=True, on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.StandardUnit')),
            ],
        ),
        migrations.CreateModel(
            name='Biomarker',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('time', models.FloatField(help_text='time point of measurement, in hours')),
                ('value', models.FloatField(help_text='value of the measurement')),
                ('biomarker_type', models.ForeignKey(help_text='biomarker type, for example "concentration in mg"', on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.BiomarkerType')),
                ('subject', models.ForeignKey(help_text='subject associated with this biomarker', on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.Subject')),
            ],
        ),
        migrations.AddConstraint(
            model_name='subject',
            constraint=models.UniqueConstraint(fields=('id_in_dataset', 'dataset'), name='subject_dataset_unique'),
        ),
    ]
