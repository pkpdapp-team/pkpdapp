from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pkpdapp", "0079_document"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="is_placeholder",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "user was added via a project share but has not yet logged in"
                ),
            ),
        ),
    ]
