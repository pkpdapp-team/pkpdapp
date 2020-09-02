#
# This file is part of PKDPApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from __future__ import absolute_import, division
from __future__ import print_function, unicode_literals
import sys


# Version info
def _load_version_int():
    try:
        import os
        root = os.path.abspath(os.path.dirname(__file__))
        with open(os.path.join(root, 'version'), 'r') as f:
            version = f.read().strip().split(',')
        major, minor, revision = [int(x) for x in version]
        return major, minor, revision
    except Exception as e:
        raise RuntimeError('Unable to read version number (' + str(e) + ').')


__version_int__ = _load_version_int()
__version__ = '.'.join([str(x) for x in __version_int__])


# Expose pkpdapp version
def version(formatted=False):
    """
    Returns the version number, as a 3-part integer (major, minor, revision).
    If ``formatted=True``, it returns a string formatted version (for example
    "PKPDapp 1.0.0").
    """
    if formatted:
        return 'PKPDApp ' + __version__
    else:
        return __version_int__
