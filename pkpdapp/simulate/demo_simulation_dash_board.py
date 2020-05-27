#
# This is just temporary placeholder for an app that
# will visualise the model building blocks.
#
# It may be an unnecessary fancy graph.
#

import dash_core_components as dcc
import dash_html_components as html
import plotly.express as px

from django_plotly_dash import DjangoDash


# Get data
df = px.data.iris()

# Create plot
fig = px.scatter(
    df,
    title="Placeholder for simulation dash board",
    x="sepal_width",
    y="sepal_length",
    color="species",
    size='petal_length', 
    hover_data=['petal_width'])

# Create dash app
app = DjangoDash('DashBoard')

app.layout = html.Div(children=[
    dcc.Graph(
        id='example-graph-two',
        figure=fig
    )
])
