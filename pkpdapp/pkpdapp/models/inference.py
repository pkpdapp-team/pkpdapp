#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

"""Compatibility shims for historical migrations.

The live inference feature surface has been removed, but early migrations still
import this module when building the migration graph.
"""


def get_default_optimisation_algorithm():
    """Return a historical default for migration compatibility."""

    return 1
