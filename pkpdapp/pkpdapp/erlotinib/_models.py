#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#


import urllib.request


def read_url(url):
    with urllib.request.urlopen(url) as f:
        return f.read()


tumour_growth_inhibition_model_koch = read_url(
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/tgi_Koch_2009.xml'  # noqa: E501
)

one_compartment_pk_model = read_url(
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/erlotinib_pk_one_comp.xml'  # noqa: E501
)

erlotinib_tumour_growth_inhibition_model = read_url(
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/models/temporary_full_pkpd_model.xml'  # noqa: E501
)


class ModelLibrary:

    def tumour_growth_inhibition_model_koch(self):
        return tumour_growth_inhibition_model_koch

    def erlotinib_tumour_growth_inhibition_model(self):
        return erlotinib_tumour_growth_inhibition_model

    def one_compartment_pk_model(self):
        return one_compartment_pk_model
