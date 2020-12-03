from django.db import models


class BiomarkerType(models.Model):
    """
    A biomarker type. Eache value, or biomarker, in a dataset must be one of
    these types
    """

    UNIT_CHOICES = [
        ('mg', 'type1'),
    ]
    name = models.CharField(max_length=100)
    unit = models.CharField(max_length=2, choices=UNIT_CHOICES)
    description = models.TextField()
