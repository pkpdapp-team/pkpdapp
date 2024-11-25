#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
# Generated by Django 3.2.25 on 2024-11-22 15:23

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0015_subjectgroup_project'),
    ]

    operations = [
        migrations.AlterField(
            model_name='derivedvariable',
            name='type',
            field=models.CharField(
                choices=[
                    ('AUC', 'area under curve'),
                    ('RO', 'receptor occupancy'),
                    ('FUP', 'faction unbound plasma'),
                    ('BPR', 'blood plasma ratio'),
                    ('TLG', 'dosing lag time')
                ],
                help_text='type of derived variable',
                max_length=3
            ),
        ),
        migrations.CreateModel(
            name='TimeInterval',
            fields=[
                ('id', models.AutoField(
                    auto_created=True,
                    primary_key=True,
                    serialize=False,
                    verbose_name='ID'
                )),
                ('read_only', models.BooleanField(
                    default=False,
                    help_text='true if object has been stored'
                )),
                ('datetime', models.DateTimeField(
                    blank=True,
                    help_text='datetime the object was stored.',
                    null=True
                )),
                ('start_time', models.FloatField(help_text='start time of interval')),
                ('end_time', models.FloatField(help_text='end time of interval')),
                ('pkpd_model', models.ForeignKey(
                    help_text='PKPD model that this time interval is for',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='time_intervals',
                    to='pkpdapp.combinedmodel'
                )),
                ('unit', models.ForeignKey(
                    help_text='unit of interval',
                    on_delete=django.db.models.deletion.PROTECT,
                    to='pkpdapp.unit'
                )),
            ],
            options={
                'abstract': False,
            },
        ),
    ]