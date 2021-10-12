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
import pkpdapp.models.myokit_model_mixin
import pkpdapp.models.protocol


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
                ('dose_compartment', models.CharField(blank=True, default='central', help_text='compartment name to be dosed', max_length=100, null=True)),
                ('time_max', models.FloatField(default=30, help_text='suggested time to simulate after the last dose (in the time units specified by the sbml model)')),
            ],
            bases=(models.Model, pkpdapp.models.myokit_model_mixin.MyokitModelMixin),
        ),
        migrations.CreateModel(
            name='PharmacodynamicModel',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the model', max_length=100)),
                ('description', models.TextField(blank=True, default='', help_text='short description of the model')),
                ('sbml', models.TextField(default='<?xml version="1.0" encoding="UTF-8"?><sbml xmlns="http://www.sbml.org/sbml/level3/version2/core" level="3" version="2"><model id="default"></model></sbml>', help_text='the model represented using SBML (see http://sbml.org)')),
                ('time_max', models.FloatField(default=30, help_text='suggested maximum time to simulate for this model (in the time units specified by the sbml model)')),
            ],
            options={
                'abstract': False,
            },
            bases=(models.Model, pkpdapp.models.myokit_model_mixin.MyokitModelMixin),
        ),
        migrations.CreateModel(
            name='PharmacokineticModel',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the model', max_length=100)),
                ('description', models.TextField(blank=True, default='', help_text='short description of the model')),
                ('sbml', models.TextField(default='<?xml version="1.0" encoding="UTF-8"?><sbml xmlns="http://www.sbml.org/sbml/level3/version2/core" level="3" version="2"><model id="default"></model></sbml>', help_text='the model represented using SBML (see http://sbml.org)')),
                ('time_max', models.FloatField(default=30, help_text='suggested maximum time to simulate for this model (in the time units specified by the sbml model)')),
            ],
            options={
                'abstract': False,
            },
            bases=(models.Model, pkpdapp.models.myokit_model_mixin.MyokitModelMixin),
        ),
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the project', max_length=100)),
                ('description', models.TextField(blank=True, default='', help_text='short description of the project')),
            ],
        ),
        migrations.CreateModel(
            name='Unit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('symbol', models.CharField(help_text='symbol for unit display', max_length=50)),
                ('g', models.FloatField(default=0, help_text='grams exponent')),
                ('m', models.FloatField(default=0, help_text='meters exponent')),
                ('s', models.FloatField(default=0, help_text='seconds exponent')),
                ('A', models.FloatField(default=0, help_text='ampere exponent')),
                ('K', models.FloatField(default=0, help_text='kelvin exponent')),
                ('cd', models.FloatField(default=0, help_text='candela exponent')),
                ('mol', models.FloatField(default=0, help_text='mole exponent')),
                ('multiplier', models.FloatField(default=0, help_text='multiplier in powers of 10')),
            ],
        ),
        migrations.CreateModel(
            name='Variable',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the variable', max_length=20)),
                ('qname', models.CharField(help_text='fully qualitifed name of the variable', max_length=100)),
                ('constant', models.BooleanField(default=True, help_text='True for a constant variable of the model, i.e. a parameter. False if non-constant, i.e. an output of the model (default is True)')),
                ('state', models.BooleanField(default=False, help_text='True for a state variable of the model (default is False)')),
                ('lower_bound', models.FloatField(default=1e-06, help_text='lowest possible value for this variable')),
                ('upper_bound', models.FloatField(default=2, help_text='largest possible value for this variable')),
                ('default_value', models.FloatField(default=1, help_text='default value for this variable')),
                ('color', models.IntegerField(default=0, help_text='Color index associated with this variable. For display purposes in the frontend')),
                ('display', models.BooleanField(default=True, help_text='True if this variable will be displayed in the frontend, False otherwise')),
                ('axis', models.BooleanField(default=False, help_text='False/True if biomarker type displayed on LHS/RHS axis')),
                ('scale', models.CharField(choices=[('LN', 'Linear'), ('LG', 'Log')], default='LN', max_length=2)),
                ('dosed_pk_model', models.ForeignKey(blank=True, help_text='dosed pharmacokinetic model', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='variables', to='pkpdapp.dosedpharmacokineticmodel')),
                ('pd_model', models.ForeignKey(blank=True, help_text='pharmacodynamic model', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='variables', to='pkpdapp.pharmacodynamicmodel')),
                ('pk_model', models.ForeignKey(blank=True, help_text='pharmacokinetic model', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='variables', to='pkpdapp.pharmacokineticmodel')),
                ('unit', models.ForeignKey(help_text='variable values are in this unit (note this might be different from the unit in the stored sbml)', on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.unit')),
            ],
        ),
        migrations.CreateModel(
            name='Subject',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('id_in_dataset', models.IntegerField(help_text='unique id in the dataset')),
                ('dose_group_amount', models.FloatField(blank=True, help_text='dosing amount for this subject (for constant dosing)', null=True)),
                ('group', models.CharField(blank=True, help_text='dataset specific grouping for this subject', max_length=100)),
                ('shape', models.IntegerField(default=0, help_text='Shape index associated with this subject. For plotting purposes in the frontend')),
                ('display', models.BooleanField(default=True, help_text='True if this subject will be displayed in the frontend, False otherwise')),
                ('metadata', jsonfield.fields.JSONField(default=dict, help_text='subject metadata')),
                ('dataset', models.ForeignKey(help_text='dataset containing this subject', on_delete=django.db.models.deletion.CASCADE, related_name='subjects', to='pkpdapp.dataset')),
                ('dose_group_unit', models.ForeignKey(blank=True, help_text='unit for dose_group_amount', null=True, on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.unit')),
            ],
        ),
        migrations.CreateModel(
            name='Protocol',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the protocol', max_length=100)),
                ('dose_type', models.CharField(choices=[('D', 'IV'), ('I', 'Extravascular')], default='D', max_length=1)),
                ('amount_unit', models.ForeignKey(default=pkpdapp.models.protocol.get_mg_unit, help_text='unit for the amount value stored in each dose', on_delete=django.db.models.deletion.CASCADE, related_name='protocols_amount', to='pkpdapp.unit')),
                ('compound', models.ForeignKey(blank=True, help_text='drug compound', null=True, on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.compound')),
                ('dataset', models.ForeignKey(blank=True, help_text='dataset containing this protocol', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='protocols', to='pkpdapp.dataset')),
                ('project', models.ForeignKey(blank=True, help_text='Project that "owns" this protocol.', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='protocols', to='pkpdapp.project')),
                ('subject', models.ForeignKey(blank=True, help_text='subject associated with protocol', null=True, on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.subject')),
                ('time_unit', models.ForeignKey(default=pkpdapp.models.protocol.get_h_unit, help_text='unit for the start_time and duration values stored in each dose', on_delete=django.db.models.deletion.CASCADE, related_name='protocols_time', to='pkpdapp.unit')),
            ],
        ),
        migrations.CreateModel(
            name='ProjectAccess',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('read_only', models.BooleanField(default=False, help_text='True if user has read access only')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.project')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='project',
            name='users',
            field=models.ManyToManyField(help_text='users with access to this project', through='pkpdapp.ProjectAccess', to=settings.AUTH_USER_MODEL),
        ),
        migrations.CreateModel(
            name='Profile',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='PkpdModel',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the model', max_length=100)),
                ('description', models.TextField(blank=True, default='', help_text='short description of the model')),
                ('sbml', models.TextField(default='<?xml version="1.0" encoding="UTF-8"?><sbml xmlns="http://www.sbml.org/sbml/level3/version2/core" level="3" version="2"><model id="default"></model></sbml>', help_text='the model represented using SBML (see http://sbml.org)')),
                ('time_max', models.FloatField(default=30, help_text='suggested maximum time to simulate for this model (in the time units specified by the sbml model)')),
                ('dose_compartment', models.CharField(blank=True, default='central', help_text='compartment name to be dosed', max_length=100, null=True)),
                ('project', models.ForeignKey(blank=True, help_text='Project that "owns" this model', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='pkpd_models', to='pkpdapp.project')),
                ('protocol', models.ForeignKey(blank=True, help_text='dosing protocol', null=True, on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.protocol')),
            ],
            options={
                'abstract': False,
            },
            bases=(models.Model, pkpdapp.models.myokit_model_mixin.MyokitModelMixin),
        ),
        migrations.AddField(
            model_name='pharmacodynamicmodel',
            name='project',
            field=models.ForeignKey(blank=True, help_text='Project that "owns" this model', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='pd_models', to='pkpdapp.project'),
        ),
        migrations.AddField(
            model_name='dosedpharmacokineticmodel',
            name='pharmacokinetic_model',
            field=models.ForeignKey(default=1, help_text='pharmacokinetic model', on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.pharmacokineticmodel'),
        ),
        migrations.AddField(
            model_name='dosedpharmacokineticmodel',
            name='project',
            field=models.ForeignKey(blank=True, help_text='Project that "owns" this model', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='pk_models', to='pkpdapp.project'),
        ),
        migrations.AddField(
            model_name='dosedpharmacokineticmodel',
            name='protocol',
            field=models.ForeignKey(blank=True, help_text='dosing protocol', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='dosed_pk_models', to='pkpdapp.protocol'),
        ),
        migrations.CreateModel(
            name='Dose',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_time', models.FloatField(help_text='starting time point of dose, see protocol for units')),
                ('amount', models.FloatField(help_text='amount of compound administered over the duration, see protocol for units. Rate of administration is assumed constant')),
                ('duration', models.FloatField(default=0.0, help_text='Duration of dose administration, see protocol for units. For a bolus injection, set a dose duration of 0.')),
                ('protocol', models.ForeignKey(help_text='protocol containing this dose', on_delete=django.db.models.deletion.CASCADE, related_name='doses', to='pkpdapp.protocol')),
            ],
        ),
        migrations.AddField(
            model_name='dataset',
            name='project',
            field=models.ForeignKey(blank=True, help_text='Project that "owns" this model', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='datasets', to='pkpdapp.project'),
        ),
        migrations.CreateModel(
            name='BiomarkerType',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='name of the biomarker type', max_length=100)),
                ('description', models.TextField(blank=True, help_text='short description of the biomarker type', null=True)),
                ('display', models.BooleanField(default=True, help_text='True if this biomarker type will be displayed in the frontend, False otherwise')),
                ('color', models.IntegerField(default=0, help_text='Color index associated with this biomarker type. For plotting purposes in the frontend')),
                ('axis', models.BooleanField(default=False, help_text='True/False if biomarker type displayed on LHS/RHS axis')),
                ('dataset', models.ForeignKey(help_text='dataset containing this biomarker measurement', on_delete=django.db.models.deletion.CASCADE, related_name='biomarker_types', to='pkpdapp.dataset')),
                ('display_time_unit', models.ForeignKey(help_text='unit to use when sending or displaying time values', on_delete=django.db.models.deletion.CASCADE, related_name='biomarker_types_time_display', to='pkpdapp.unit')),
                ('display_unit', models.ForeignKey(help_text='unit to use when sending or displaying biomarker values', on_delete=django.db.models.deletion.CASCADE, related_name='biomarker_types_display', to='pkpdapp.unit')),
                ('stored_time_unit', models.ForeignKey(help_text='unit for the time values stored in :model:`pkpdapp.Biomarker`', on_delete=django.db.models.deletion.CASCADE, related_name='biomarker_types_time_stored', to='pkpdapp.unit')),
                ('stored_unit', models.ForeignKey(help_text='unit for the value stored in :model:`pkpdapp.Biomarker`', on_delete=django.db.models.deletion.CASCADE, related_name='biomarker_types_stored', to='pkpdapp.unit')),
            ],
        ),
        migrations.CreateModel(
            name='Biomarker',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('time', models.FloatField(help_text='time point of measurement, in hours')),
                ('value', models.FloatField(help_text='value of the measurement')),
                ('biomarker_type', models.ForeignKey(help_text='biomarker type, for example "concentration in mg"', on_delete=django.db.models.deletion.CASCADE, related_name='biomarkers', to='pkpdapp.biomarkertype')),
                ('subject', models.ForeignKey(help_text='subject associated with this biomarker', on_delete=django.db.models.deletion.CASCADE, to='pkpdapp.subject')),
            ],
        ),
        migrations.AddConstraint(
            model_name='variable',
            constraint=models.CheckConstraint(check=models.Q(models.Q(('pk_model__isnull', True), ('dosed_pk_model__isnull', True), ('pd_model__isnull', False)), models.Q(('pk_model__isnull', False), ('dosed_pk_model__isnull', True), ('pd_model__isnull', True)), models.Q(('pk_model__isnull', True), ('dosed_pk_model__isnull', False), ('pd_model__isnull', True)), _connector='OR'), name='variable must belong to a model'),
        ),
        migrations.AddConstraint(
            model_name='variable',
            constraint=models.CheckConstraint(check=models.Q(models.Q(('scale', 'LG'), ('lower_bound__gt', 0)), ('scale', 'LN'), _connector='OR'), name='log scale must have a lower bound greater than zero'),
        ),
        migrations.AddConstraint(
            model_name='subject',
            constraint=models.UniqueConstraint(fields=('id_in_dataset', 'dataset'), name='subject_dataset_unique'),
        ),
        migrations.AddConstraint(
            model_name='subject',
            constraint=models.CheckConstraint(check=models.Q(models.Q(('dose_group_unit__isnull', True), ('dose_group_unit__isnull', True)), models.Q(('dose_group_unit__isnull', False), ('dose_group_unit__isnull', False)), _connector='OR'), name='amount must have a unit and visa versa'),
        ),
    ]
