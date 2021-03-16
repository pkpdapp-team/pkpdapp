#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from setuptools import setup, find_packages


# Load text for description and license
with open('README.md') as f:
    readme = f.read()

# Go!
setup(
    # App name
    name='pkpdapp',
    version='0.0.1dev',

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
        'dash-bootstrap-components>=0.10',
        'Django==3.0.7',
        'django-bootstrap4>=2.2',
        'django_plotly_dash>=1.3',
        'dpd-static-support>=0.0.5',
        'numpy>=1.8',
        'pandas>=1.0',
        'plotly>=4.8',
        'whitenoise==5.0.1',
        'django-test-migrations==1.0.0',
        'docutils==0.16',
        'django-pivot==1.8.1',
        'django-markdownify==0.8.2',
        'python-markdown-math==0.8',
        'xlrd>=1.0.0',
        'pints @ git+git://github.com/pints-team/pints.git#egg=pints',
        'myokit>=1.31',
        'tqdm==4.46.1',
        'django-extensions==3.1.1',
    ],
    dependency_links=[
        "git+git://github.com/DavAug/erlotinib.git#egg=erlotinib-latest",
    ],
)
