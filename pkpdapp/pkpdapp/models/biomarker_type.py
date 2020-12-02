from django.db import models

class BiomarkerType(models.Model):
    UNIT_CHOICES = [
        ('mg', 'type1'),
    ]
    name = models.CharField(max_length=100)
    unit = models.CharField(max_length=2, choices=UNIT_CHOICES)
    description = models.TextField()
