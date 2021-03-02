# Generated by Django 3.0.7 on 2021-02-28 09:54

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
            name='Dataset',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the dataset', max_length=100)),
                ('datetime', models.DateTimeField(blank=True, help_text='Date/time the experiment was conducted. All time measurements are relative to this date/time', null=True)),
                ('description', models.TextField(blank=True, default='', help_text='short description of the dataset')),
                ('administration_type', models.CharField(choices=[('T1', 'type1'), ('T2', 'type2')], help_text='method of drug administration', max_length=10)),
            ],
        ),
        migrations.CreateModel(
            name='DosedPharmacokineticModel',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the model', max_length=100)),
                ('description', models.TextField(blank=True, default='', help_text='short description of the model')),
                ('sbml', models.TextField(help_text='the model represented using SBML (see http://sbml.org)')),
                ('dose_compartment', models.CharField(help_text='compartment name to be dosed', max_length=100)),
                ('direct_dose', models.BooleanField(default=True, help_text='True if drug is administered directly into the dosing compartment')),
                ('dose_amount', models.FloatField(default=0.0, help_text='The amount of the compound that is injected at each administration.')),
                ('dose_start', models.FloatField(default=0.0, help_text='Start time of the treatment.')),
                ('dose_duration', models.FloatField(default=0.01, help_text='\n            Duration of dose administration. For a bolus injection, a dose\n            duration of 1% of the time unit should suffice. By default the\n            duration is set to 0.01 (bolus).\n        ')),
                ('dose_period', models.FloatField(blank=True, help_text='\n            Periodicity at which doses are administered. If empty the dose\n            is administered only once.\n        ', null=True)),
                ('number_of_doses', models.IntegerField(blank=True, help_text='\n            Number of administered doses. If empty and the periodicity of\n            the administration is not empty, doses are administered\n            indefinitely.\n        ', null=True)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='PharmacodynamicModel',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the model', max_length=100)),
                ('description', models.TextField(blank=True, default='', help_text='short description of the model')),
                ('sbml', models.TextField(help_text='the model represented using SBML (see http://sbml.org)')),
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
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the project', max_length=100)),
                ('description', models.TextField(blank=True, default='', help_text='short description of the project')),
                ('datasets', models.ManyToManyField(help_text='datasets referenced by this project', to='pkpdapp.Dataset')),
                ('pd_models', models.ManyToManyField(help_text='PD models referenced by this project', to='pkpdapp.PharmacodynamicModel')),
                ('pk_models', models.ManyToManyField(help_text='PK models referenced by this project', to='pkpdapp.DosedPharmacokineticModel')),
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
            model_name='dosedpharmacokineticmodel',
            name='pharmacokinetic_model',
            field=models.ForeignKey(help_text='pharmacokinetic model', on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.PharmacokineticModel'),
        ),
        migrations.CreateModel(
            name='BiomarkerType',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the biomarker type', max_length=100)),
                ('unit', models.CharField(choices=[('mg', 'mg'), ('g', 'g'), ('cm3', 'cm^3')], help_text='units for the value stored in :model:`pkpdapp.Biomarker`', max_length=3)),
                ('description', models.TextField(help_text='short description of the biomarker type')),
                ('dataset', models.ForeignKey(help_text='dataset containing this biomarker measurement', on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.Dataset')),
            ],
        ),
        migrations.CreateModel(
            name='Biomarker',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('time', models.FloatField(help_text='time point of measurement, in days')),
                ('subject_id', models.IntegerField(help_text='subject id for biomarker measurement')),
                ('value', models.FloatField(help_text='value of the measurement')),
                ('biomarker_type', models.ForeignKey(help_text='biomarker type, for example "concentration in mg"', on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.BiomarkerType')),
            ],
        ),
    ]
