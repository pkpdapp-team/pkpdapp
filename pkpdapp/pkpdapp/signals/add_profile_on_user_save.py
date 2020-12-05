from django.db.models.signals import post_save
from django.dispatch import receiver
from pkpdapp.models import Profile
from django.contrib.auth.models import User


def add_profile_on_user_save(sender, **kwargs):
    if kwargs['created']:
        Profile.objects.create(user=kwargs['instance']).save()
