#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
# Generated by Django 3.2.25 on 2024-11-27 15:35

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0018_variable_threshold_unit'),
    ]

    operations = [
        migrations.CreateModel(
            name='Results',
            fields=[
                ('id', models.AutoField(
                    auto_created=True,
                    primary_key=True,
                    serialize=False,
                    verbose_name='ID'
                )),
                ('name', models.CharField(
                    help_text='name of the table',
                    max_length=100
                )),
                ('rows', models.CharField(
                    choices=[
                        ('parameters', 'Secondary parameters of the model.'),
                        ('variables', 'Model variables.'),
                        ('groups', 'Subject groups.'),
                        ('intervals', 'Time intervals.')
                    ],
                    help_text='parameter to display as table rows',
                    max_length=20
                )),
                ('columns', models.CharField(
                    choices=[
                        ('parameters', 'Secondary parameters of the model.'),
                        ('variables', 'Model variables.'),
                        ('groups', 'Subject groups.'),
                        ('intervals', 'Time intervals.')
                    ],
                    help_text='parameter to display as table columns',
                    max_length=20
                )),
                ('project', models.ForeignKey(
                    blank=True,
                    help_text='Project that this table belongs to.',
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='results',
                    to='pkpdapp.project'
                )),
            ],
        ),
    ]
