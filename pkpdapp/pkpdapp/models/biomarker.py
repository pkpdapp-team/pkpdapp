from django.db import models
from pkpdapp.models import BiomarkerType, Dataset


class Biomarker(models.Model):
    time = models.DateTimeField()
    value = models.FloatField()
    biomarker_type = models.ForeignKey(
        BiomarkerType, on_delete=models.PROTECT
    )
    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE
    )
