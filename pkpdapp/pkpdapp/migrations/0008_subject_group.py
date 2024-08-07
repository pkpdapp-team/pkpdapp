#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
# Generated by Django 3.2.24 on 2024-03-15 09:08

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('pkpdapp', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='SubjectGroup',
            fields=[
                ('id', models.AutoField(
                    auto_created=True,
                    primary_key=True,
                    serialize=False,
                    verbose_name='ID'
                )),
                ('name', models.CharField(
                    help_text='name of the group',
                    max_length=100
                )),
            ],
        ),
        migrations.AddField(
            model_name='subject',
            name='group',
            field=models.ForeignKey(
                blank=True,
                help_text='subject group containing this subject.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='subjects',
                to='pkpdapp.subjectgroup'
            ),
        ),
    ]
