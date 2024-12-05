# django model for finite list of tags (use an enum field)

from django.db import models


class Tag(models.Model):
    """
    A tag for a model
    """

    name = models.CharField(max_length=20, help_text="name of the tag")
