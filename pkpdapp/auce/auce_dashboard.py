#
# This file is part of PKDPApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from dash.dependencies import Input, Output
import dash_core_components as dcc
import dash_html_components as html
from django.conf import settings
from django_plotly_dash import DjangoDash

import pandas as pd
import plotly
import plotly.colors
import plotly.graph_objects as go
from plotly.validators.scatter.marker import SymbolValidator


# TODO: Temporary - Will be replaced by data selector
# Import data
path = settings.MEDIA_ROOT
dataset = pd.read_csv(path + '/data/TCB4dataset.csv')

columns = dataset.columns

fig = go.Figure()
auce_vs_concentration_fig = go.Figure()

# Create dash app
app = DjangoDash('auce_dashboard')

# TODO: 1. Take all colours, or 2. pick as many colours as we need.
colors = plotly.colors.qualitative.Plotly[:1000]
symbols = SymbolValidator().values


def update_figure(
        time_selection, y_selection, class1_selection, concentration_selection,
        class2_selection, class3_selection, class1_plot_selection,
        concentration_plot_selection, class2_plot_selection,
        class3_plot_selection, yaxis_type_selection, xaxis_type_selection):
    """
    Short description.
    """
    fig.data = []

    data = dataset[dataset[class1_selection] == class1_plot_selection]

    concentration = [concentration_plot_selection] if concentration_plot_selection else data[concentration_selection].unique()

    for index_concentration, concentration_selected in enumerate(concentration):
        concentration_data = data.loc[data[concentration_selection]==concentration_selected]
        class2 = [class2_plot_selection] if class2_plot_selection else concentration_data[class2_selection].unique()

        for index_class2, class2_selected in enumerate(class2):
            
            class2_data = concentration_data.loc[concentration_data[class2_selection]==class2_selected]

            if class3_plot_selection :
                class3 = class2_data[class3_selection].unique()

                for index_class3, class3_selected in enumerate(class3):
                    class3_data = class2_data.loc[class2_data[class3_selection]==class3_selected]

                    fig.add_trace(go.Scatter(
                    x = class3_data[time_selection],
                    y = class3_data[y_selection],
                    name = "%s : %s, %s : %s, %s : %s" %(concentration_selection, concentration_selected,class2_selection,
                                                        class2_selected, class3_selection, class3_selected),
                    showlegend = True,
                    visible = True,
                    hovertemplate=(
                    "<b>Measurement </b><br>" +
                    "%s : %s<br>" % (class1_selection, class1_plot_selection) +
                    "%s : %s<br>" % (concentration_selection, concentration_selected) +
                    "%s : %s<br>" % (class2_selection, class2_selected) +
                    "X : %{x:}<br>" +
                    "Y: %{y:}<br>" +
                    "<extra></extra>"),
                    mode="markers",
                    marker=dict(
                        symbol=symbols[index_concentration*8],
                        opacity=0.7,
                        line=dict(color='black', width=1),
                        color=colors[index_class2]
                    )
                ))
            else:
                fig.add_trace(go.Scatter(
                    x = class2_data[time_selection],
                    y = class2_data[y_selection],
                    name = "%s : %s, %s : %s" %(concentration_selection, concentration_selected,class2_selection, class2_selected),
                    showlegend = True,
                    visible = True,
                    hovertemplate=(
                    "<b>Measurement </b><br>" +
                    "%s : %s<br>" % (class1_selection, class1_plot_selection) +
                    "%s : %s<br>" % (concentration_selection, concentration_selected) +
                    "%s : %s<br>" % (class2_selection, class2_selected) +
                    "X : %{x:}<br>" +
                    "Y: %{y:}<br>" +
                    "<extra></extra>"),
                    mode="markers",
                    marker=dict(
                        symbol=symbols[index_concentration*8],
                        opacity=0.7,
                        line=dict(color='black', width=1),
                        color=colors[index_class2]
                    )
                )) 
    fig.update_layout(
    autosize=True,
    xaxis_title='Time in hours',
    yaxis_title='Concentration',
    xaxis_type = xaxis_type_selection,
    yaxis_type = yaxis_type_selection,
    template="plotly_white",
    ),
                              
    return fig


def update_app():

    app.layout = html.Div(children=[
        dcc.Graph(
            id='explore-dashboard',
            figure=fig
        ),

        dcc.Tabs(
            id='explore-tabs',
            value='explore',
            children=[
                dcc.Tab(
                    label='Data Selection',
                    value='data-selection',
                    children=html.Div(className='control-tab', children=[
                        html.Br(),
                        html.Br(),
                        html.Div([html.Span("Time :", style={'font-weight':'bold'}),
                                dcc.Dropdown(id='time-selection', 
                                                options=[{'label':i, 'value':i} for i in columns],
                                                value = 'Time',
                                                style = dict(
                                                    width = '50%',
                                             )),
                                html.Br(),
                                html.Span("Measurements :", style={'font-weight':'bold'}),
                                dcc.Dropdown(id='y-selection', 
                                                options=[{'label':i, 'value':i} for i in columns],
                                                value = 'Y',
                                                style = dict(
                                                    width = '50%',
                                             )),
                                html.Br(),
                                html.Br(),
                                html.Span("Dose group :", style={'font-weight':'bold'}),
                                dcc.Dropdown(id='concentration-selection', 
                                                options=[{'label':i, 'value':i} for i in columns],
                                                value = 'ConcInit',
                                                style = dict(
                                                    width = '50%',
                                                    display = ''
                                             )),
                                html.Span("Dose group selection :", style={'color':'grey'}),
                                dcc.Dropdown(id='concentration-plot-selection', 
                                             placeholder = 'Optional...',   
                                             style = dict(
                                                width = '40%',
                                                display = 'inline-block'
                                             )),
                                html.Br(),              
                                html.Span("Classifier 1 :", style={'font-weight':'bold'}),
                                dcc.Dropdown(id='class1-selection', 
                                                options=[{'label':i, 'value':i} for i in columns],
                                                value = 'Y_type',
                                                style = dict(
                                                    width = '50%',
                                                    display = ''
                                             )),
                                html.Span("Classifier 1 selection : ", style={'font-weight':'bold'}),
                                dcc.Dropdown(id='class1-plot-selection', 
                                                
                                             style = dict(
                                                width = '40%',
                                                display = 'inline-block'
                                             )),

                                html.Br(),
                                html.Br(),
                                html.Span("Classifier 2 :", style={'font-weight':'bold'}),
                                dcc.Dropdown(id='class2-selection', 
                                                options=[{'label':i, 'value':i} for i in columns],
                                                value = 'CL_Drug',
                                                style = dict(
                                                    width = '50%',
                                                    display = ''
                                             )),
                                html.Span("Classifier 2 selection :", style={'color':'grey'}),
                                dcc.Dropdown(id='class2-plot-selection', 
                                             placeholder = 'Optional...',   
                                             style = dict(
                                                width = '40%',
                                                verticalalign = 'middle',
                                                display = 'inline-block'
                                             )),
                                html.Br(),
                                html.Br(),
                                html.Span("Classifier 3 :", style={'color':'grey'}),
                                dcc.Dropdown(id='class3-selection',
                                                placeholder = 'Optional...', 
                                                options=[{'label':i, 'value':i} for i in columns],
                                                value = '',
                                                style = dict(
                                                    width = '50%',
                                                    display = ''
                                             )),
                                html.Span("Classifier 3 selection :", style={'color':'grey'}),
                                dcc.Dropdown(id='class3-plot-selection', 
                                             placeholder = 'Optional...',   
                                             style = dict(
                                                width = '40%',
                                                verticalalign = 'middle',
                                                display = 'inline-block'
                                             )),

                        ], style={'width': '100%'})                
                    ])
                ),
                dcc.Tab(
                    label='Graph Settings',
                    value='graph-settings',
                    children=html.Div(className='control-tab', children=[
                        html.Br(),
                        html.Br(),
                        html.Div(["Y axis :",
                                dcc.RadioItems(
                                    id= 'yaxis-type',
                                    options=[{'label':i, 'value':i} for i in ['linear','log']],
                                    value = 'linear',
                                ),
                                html.Br(),
                                "X axis :",
                                dcc.RadioItems(
                                    id= 'xaxis-type',
                                    options=[{'label':i, 'value':i} for i in ['linear','log']],
                                    value = 'linear',
                                )
                        ], style={'width': '40%'})                
                    ])
                ),
            ]
        )
    ], style = {'font-family':'sans-serif'})

update_app()

@app.callback(
    Output('explore-dashboard','figure'),
    [Input('time-selection', 'value'),
    Input('y-selection', 'value'),
    Input('class1-selection', 'value'),
    Input('concentration-selection', 'value'),
    Input('class2-selection', 'value'),
    Input('class3-selection', 'value'),
    Input('class1-plot-selection', 'value'),
    Input('concentration-plot-selection', 'value'),
    Input('class2-plot-selection', 'value'),
    Input('class3-plot-selection', 'value'),
    Input('yaxis-type', 'value'),
    Input('xaxis-type', 'value')]
)
def update_output_div(time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
                      class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
                      class3_plot_selection, yaxis_type_selection, xaxis_type_selection):

    update_app()
    fig = update_figure(time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
                        class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
                        class3_plot_selection, yaxis_type_selection, xaxis_type_selection)
    return fig

@app.callback(
    Output('class1-plot-selection', 'options'),
    [Input('class1-selection', 'value')]
)
def update_selected_class1(class1_selection):
    if class1_selection:
        return [{'label':i, 'value':i} for i in dataset[class1_selection].unique()]
    else:
        return ''    

@app.callback(
    Output('concentration-plot-selection', 'options'),
    [Input('concentration-selection', 'value')]
)
def update_selected_concentration(concentration_selection):
    if concentration_selection:
        return [{'label':i, 'value':i} for i in dataset[concentration_selection].unique()]
    else:
        return ''

@app.callback(
    Output('class2-plot-selection', 'options'),
    [Input('class2-selection', 'value')]
)
def update_selected_class2(class2_selection):
    if class2_selection:
        return [{'label':i, 'value':i} for i in dataset[class2_selection].unique()]
    else:
        return ''    

@app.callback(
    Output('class3-plot-selection', 'options'),
    [Input('class3-selection', 'value')]
)
def update_selected_class3(class3_selection):
    if class3_selection:
        return [{'label':i, 'value':i} for i in dataset[class3_selection].unique()]
    else:
        return '' 
