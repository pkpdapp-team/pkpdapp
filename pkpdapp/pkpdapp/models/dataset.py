from django.db import models

class Dataset(models.Model):
    ADMINISTRATION_TYPE_CHOICES = [
        ('T1', 'type1'),
        ('T2', 'type2'),
    ]
    name = models.CharField(max_length=100)
    description = models.TextField()
    administration_type = models.CharField(
        max_length=2, choices=ADMINISTRATION_TYPE_CHOICES
    )
