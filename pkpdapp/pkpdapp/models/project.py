from django.db import models
from pkpdapp.models import Dataset, PkpdModel
from django.contrib.auth.models import User

class Project(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    dataset = models.ManyToManyField(Dataset)
    pkpd_model = models.ManyToManyField(PkpdModel)
    users = models.ManyToManyField(User)
