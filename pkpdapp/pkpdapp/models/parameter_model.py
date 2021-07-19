#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.core.cache import cache

class parameter():

    def __init__(self, name, min_value, max_value, value, 
                pk_model=None, pd_model=None, scale='lin', unit=None):
        self.name = name
        self.min_value = min_value
        self.max_value = max_value
        self.value = value
        self.pk_model = pk_model
        self.pd_model = pd_model
        self.scale = scale
        self.unit = unit
    
    def update_name(self, new_name):
        self.name = new_name

    def update_min_value(self, new_min_value):
        self.min_value = new_min_value

    def update_max_value(self, new_max_value):
        self.max_value = new_max_value

    def update_value(self, new_value):
        self.value = new_value

    def update_pk_model(self, new_pk_model):
        self.pk_model = new_pk_model
    
    def update_pd_model(self, new_pd_model):
        self.pd_model = new_pd_model
    
    def update_scale(self, new_scale):
        self.scale = new_scale

    def update_unit(self, new_unit):
        self.unit = new_unit
    