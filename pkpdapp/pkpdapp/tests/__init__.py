#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
# flake8: noqa f401
from .utils import create_pd_inference
import os
import django


django.setup()
dummy = ""
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pkpdapp.settings')
