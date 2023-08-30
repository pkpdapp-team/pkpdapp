#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import os
import django


django.setup()
dummy = ""
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pkpdapp.settings')

from .utils import create_pd_inference
