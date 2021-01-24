#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

"""
Views of the pkpdapp project.

For more information please see
https://docs.djangoproject.com/en/3.0/topics/http/views/.
"""

from .project import ProjectDetailView  # noqa: F401
from .dataset import DatasetDetailView  # noqa: F401
from .index import IndexView  # noqa: F401
from .generic import GenericView  # noqa: F401
from .pkpd_model import PkpdModelDetailView  # noqa: F401
