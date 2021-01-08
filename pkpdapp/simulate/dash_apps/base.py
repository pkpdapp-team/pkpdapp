#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import dash_bootstrap_components as dbc
import django_plotly_dash as dpd


class BaseApp(object):
    """
    Base class for applications.
    """

    def __init__(self, name):
        super(BaseApp, self).__init__()

        # Create basic app
        self.app = dpd.DjangoDash(
            name=name, add_bootstrap_links=True)

        self.app.layout = dbc.Container(
            children=[
                dbc.Alert(
                    children="No app content has been added!",
                    color="primary"),
            ])
