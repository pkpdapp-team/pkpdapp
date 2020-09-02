#
# This file is part of PKDPApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

"""
This is just temporary placeholder for an app that
will visualise the model building blocks.

It may be an unnecessary fancy graph.
"""

import dash_core_components as dcc
import dash_html_components as html
import plotly.graph_objects as go
import networkx as nx

from django_plotly_dash import DjangoDash


# Create network
G = nx.random_geometric_graph(200, 0.125)

# Get edges
edge_x = []
edge_y = []
for edge in G.edges():
    x0, y0 = G.nodes[edge[0]]['pos']
    x1, y1 = G.nodes[edge[1]]['pos']
    edge_x.append(x0)
    edge_x.append(x1)
    edge_x.append(None)
    edge_y.append(y0)
    edge_y.append(y1)
    edge_y.append(None)

edge_trace = go.Scatter(
    x=edge_x, y=edge_y,
    line=dict(width=0.5, color='#888'),
    hoverinfo='none',
    mode='lines')

node_x = []
node_y = []
for node in G.nodes():
    x, y = G.nodes[node]['pos']
    node_x.append(x)
    node_y.append(y)

node_trace = go.Scatter(
    x=node_x, y=node_y,
    mode='markers',
    hoverinfo='text',
    marker=dict(
        showscale=False,
        colorscale='YlGnBu',
        reversescale=True,
        color=[],
        size=10,
        line_width=2))

# Color node points
node_adjacencies = []
node_text = []
for node, adjacencies in enumerate(G.adjacency()):
    node_adjacencies.append(len(adjacencies[1]))
    node_text.append('# of connections: '+ str(len(adjacencies[1])))

node_trace.marker.color = node_adjacencies
node_trace.text = node_text

# Create plot
fig = go.Figure(data=[edge_trace, node_trace],
                layout=go.Layout(
                    title='Placeholder for model details',
                    titlefont_size=16,
                    showlegend=False,
                    hovermode='closest',
                    margin=dict(b=20, l=5, r=5, t=40),
                    xaxis=dict(
                        showgrid=False, zeroline=False, showticklabels=False),
                    yaxis=dict(
                        showgrid=False, zeroline=False, showticklabels=False)))

# Create dash app
app = DjangoDash('ModelApp')

app.layout = html.Div(children=[
    dcc.Graph(
        id='example-graph',
        figure=fig
    )
])
