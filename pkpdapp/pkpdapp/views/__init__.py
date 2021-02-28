#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
# flake8: noqa F401

"""
Views of the pkpdapp project.

For more information please see
https://docs.djangoproject.com/en/3.0/topics/http/views/.
"""

from .project import (
    ProjectDetailView,
    ProjectCreate,
    ProjectDelete,
    ProjectUpdate,
    ProjectListView,
)
from .dataset import (
    DatasetDetailView,
    DatasetCreate,
    DatasetDelete,
    DatasetUpdate,
    DatasetListView,
)
from .index import IndexView
from .generic import GenericView
from .pkpd_model import (
    PharmacodynamicModelDetailView,
    PharmacodynamicModelCreate,
    DosedPharmacokineticModelCreate,
    DosedPharmacokineticModelUpdate,
    DosedPharmacokineticModelDetail,
    PharmacokineticModelDetail,
    PharmacodynamicModelDeleteView,
    PharmacodynamicModelListView,
    PharmacodynamicModelUpdate
)
