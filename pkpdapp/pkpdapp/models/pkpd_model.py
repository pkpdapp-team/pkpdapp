from django.db import models


class PkpdModel(models.Model):
    MODEL_TYPE_CHOICES = [
        ('PK', 'Pharmokinetic'),
        ('PD', 'Pharmodynamic'),
    ]
    name = models.CharField()
    description = models.TextField()
    model_type = models.CharField(
        max_length=2, choices=MODEL_TYPE_CHOICES
    )
    sbml = models.TextField()
