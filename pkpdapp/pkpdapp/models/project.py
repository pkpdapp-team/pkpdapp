from django.db import models

class Project(models.Model):
    name = models.CharField()
    description = models.TextField()
