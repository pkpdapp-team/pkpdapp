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
    # Module name (lowercase)
    name='pkpdapp',
    version=load_version(),

    # Description
    description='Modeling of distribution and effects of drugs.',
    long_description=readme,

    # License name
    license='BSD 3-clause license',

    # Maintainer information
    maintainer='David Augustin',
    maintainer_email='david.augustin@cs.ox.ac.uk',
    url='https://github.com/pkpdapp-team/pkpdapp',

    # Packages to include
    packages=find_packages(include=('pkpdapp', 'pkpdapp.*')),

    # Include non-python files (via MANIFEST.in)
    # include_package_data=True,

    # List of dependencies
    install_requires=[
        'Django>=2.0',
        'django_plotly_dash',
        'whitenoise',
        'dpd-static-support',
    ],
    extras_require={
        'docs': [
            'sphinx>=1.5, !=1.7.3',     # For doc generation
        ],
        'dev': [
            'flake8>=3',            # For code style checking
        ],
    },
)
