#
# This file is part of PKDPApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from setuptools import setup, find_packages


# Load text for description and license
with open('README.md') as f:
    readme = f.read()


# Read version number from file
def load_version():
    try:
        import os
        root = os.path.abspath(os.path.dirname(__file__))
        with open(os.path.join(root, 'pkpdapp', 'version'), 'r') as f:
            version = f.read().strip().split(',')
        return '.'.join([str(int(x)) for x in version])
    except Exception as e:
        raise RuntimeError('Unable to read version number (' + str(e) + ').')


# Go!
setup(
    # App name
    name='pkpdapp',
    version=load_version(),

    # Description
    description='PKPD analysis and modelling of chemical compunds.',
    long_description=readme,

    # License name
    license='BSD 3-clause license',

    # Maintainer information
    maintainer='David Augustin',
    maintainer_email='david.augustin@cs.ox.ac.uk',
    url='https://github.com/pkpdapp-team/pkpdapp',

    # Packages to include
    packages=find_packages(include=('pkpdapp', 'pkpdapp.*')),

    # List of dependencies
    install_requires=[
        'Django==3.0.5',
        'django_plotly_dash==1.3.1',
        'dpd-static-support==0.0.5',
        'networkx==2.4',
        'pandas==1.0.3',
        'whitenoise==5.0.1',
    ],
)
