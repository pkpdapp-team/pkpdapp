from django.db import models

class BiomarkerType(models.Model):
    UNIT_CHOICES = [
        ('mg', 'type1'),
    ]
    unit = models.CharField(max_length=2, choices=UNIT_CHOICES)
    name = models.CharField()
    description = models.TextField()
