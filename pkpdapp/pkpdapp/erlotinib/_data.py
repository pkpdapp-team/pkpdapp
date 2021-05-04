#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import urllib.request
import pandas as pd


def read_url(url):
    with urllib.request.urlopen(url) as f:
        return pd.read_csv(f)


lung_cancer_control_group = read_url(
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/lxf_control_growth.csv'  # noqa: E501
)

lung_cancer_low_erlotinib_dose_group = read_url(
    'https://raw.githubusercontent.com/pkpdapp-team/pkpdapp-datafiles/main/datasets/lxf_low_erlotinib_dose.csv'  # noqa: E501
)


class DataLibrary:
    def lung_cancer_control_group(self):
        return lung_cancer_control_group

    def lung_cancer_low_erlotinib_dose_group(self):
        return lung_cancer_low_erlotinib_dose_group
