#
# This file is part of PKDPApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

'''
Temporary demo.
'''

import dash_core_components as dcc
import dash_html_components as html
from django.conf import settings
from django_plotly_dash import DjangoDash

import dash_table
import numpy as np
import pandas as pd 
import plotly
import plotly.colors
import plotly.graph_objects as go
from plotly.validators.scatter.marker import SymbolValidator
from dash.dependencies import Input, Output, State
from scipy.optimize import curve_fit
import myokit
import pints
from os import listdir
from os.path import isfile, join

from . import data_selection
from . import auce


# Import data
path = settings.MEDIA_ROOT

datasets = [f for f in listdir(path + '/data') if isfile(join(path + '/data', f))]

fig = go.Figure()
auce_vs_concentration_fig = go.Figure()

fig.data = []
auce_vs_concentration_fig.data = []

# Create dash app 

app = DjangoDash('data_dashboard') 

colors = plotly.colors.qualitative.Plotly[:1000]
symbols = SymbolValidator().values


################################# LAYOUT #################################
def update_app() :

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
                        html.Div([html.Span("Dataset :", style={'font-weight':'bold'}),
                                dcc.Dropdown(id='dataset-selection', 
                                                options=[{'label':i, 'value':i} for i in datasets],
                                                value = '',
                                                style = dict(
                                                    width = '80%',
                                             )),
                                html.Br(),
                                html.Br(),
                                html.Br(),
                                html.Span("Time :", style={'font-weight':'bold'}),
                                dcc.Dropdown(id='time-selection',
                                                style = dict(
                                                    width = '50%',
                                             )),
                                html.Br(),
                                html.Span("Measurements :", style={'font-weight':'bold'}),
                                dcc.Dropdown(id='y-selection', 
                                                style = dict(
                                                    width = '50%',
                                             )),
                                html.Br(),
                                html.Br(),
                                html.Span("Dose group :", style={'font-weight':'bold'}),
                                dcc.Dropdown(id='concentration-selection',
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
                dcc.Tab(
                    label='AUCE',
                    value='explore-auce',
                    children=html.Div(className='control-tab', children=[
                        html.H4(className='explore-auce', children='AUCE'),
                        html.Button(id='auce-button', n_clicks = 0, children='Compute AUC parameters'),
                        html.Button(id='auce-concentration-button', n_clicks = 0, children='Compute AUCE vs concentration'),
                        html.Div(id='auce-values'),
                        dcc.Graph(
                            id='auce-concentration-fig',
                            figure=auce_vs_concentration_fig
                        ),
                        html.Div(["Y axis :",
                            dcc.RadioItems(
                                id= 'auce-y-axis-type',
                                options=[{'label':i, 'value':i} for i in ['linear','log']],
                                value = 'linear',
                            ),
                            html.Br(),
                            "X axis :",
                            dcc.RadioItems(
                                id= 'auce-x-axis-type',
                                options=[{'label':i, 'value':i} for i in ['linear','log']],
                                value = 'linear',
                            )
                        ], style={'width': '40%'}),  
                        html.Br(),
                        html.Br(),
                        "Fit type :",
                        dcc.RadioItems(
                                id= 'auce-conc-fit-type',
                                options=[{'label':i, 'value':i} for i in ['None','Sigmoid', 'Hockey-Stick']],
                                value = 'None',
                        ),

                    ], style={'width': '100%'})
                ),
                dcc.Tab(
                    label='About',
                    value='explore-about',
                    children=html.Div(className='control-tab', children=[
                        html.H4(className='explore-about', children='How to plot you data'),
                        html.P(
                            """
                            In the 'Settings' panel, you can choose between your different measurement types, that should have
                            'Y_type' as a title. Then, choose whatever concentration you want to plot with the left buttons,
                            and click on the individual series you want to display.
                            """
                        )
                    ])
                )
            ]
        )       
    ], style = {'font-family':'sans-serif'})

update_app()

@app.callback(
    [Output('time-selection', 'options'),
    Output('y-selection', 'options'),
    Output('concentration-selection', 'options'),
    Output('class1-selection', 'options'),
    Output('class2-selection', 'options'),
    Output('class3-selection', 'options')],
    [Input('dataset-selection', 'value')]
)

def update_column_choices(dataset_selection):
    dataset = pd.read_csv(path + '/data/' + dataset_selection)
    columns = dataset.columns

    time_options=[{'label':i, 'value':i} for i in columns]
    y_options=[{'label':i, 'value':i} for i in columns]
    concentration_options=[{'label':i, 'value':i} for i in columns]
    class1_options=[{'label':i, 'value':i} for i in columns]
    class2_options=[{'label':i, 'value':i} for i in columns]
    class3_options=[{'label':i, 'value':i} for i in columns]

    return time_options, y_options, concentration_options, class1_options, class2_options, class3_options

@app.callback(
    Output('explore-dashboard','figure'),
    [Input('dataset-selection', 'value'),
    Input('time-selection', 'value'),
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
def update_output_div(dataset_selection, time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
                      class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
                      class3_plot_selection, yaxis_type_selection, xaxis_type_selection):

    update_app()
    fig_new = data_selection.update_figure(fig, path, colors, symbols, dataset_selection, time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
                        class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
                        class3_plot_selection, yaxis_type_selection, xaxis_type_selection)
    return fig_new

@app.callback(
    Output('class1-plot-selection', 'options'),
    [Input('dataset-selection', 'value'),
    Input('class1-selection', 'value')]
)
def update_selected_class1(dataset_selection, class1_selection):
    dataset = pd.read_csv(path + '/data/' + dataset_selection)

    if class1_selection:
        return [{'label':i, 'value':i} for i in dataset[class1_selection].unique()]
    else:
        return ''    

@app.callback(
    Output('concentration-plot-selection', 'options'),
    [Input('dataset-selection','value'),
    Input('concentration-selection', 'value')]
)
def update_selected_concentration(dataset_selection, concentration_selection):
    dataset = pd.read_csv(path + '/data/' + dataset_selection)
    if concentration_selection:
        return [{'label':i, 'value':i} for i in dataset[concentration_selection].unique()]
    else:
        return ''  

@app.callback(
    Output('class2-plot-selection', 'options'),
    [Input('dataset-selection', 'value'),
    Input('class2-selection', 'value')]
)
def update_selected_class2(dataset_selection, class2_selection):
    dataset = pd.read_csv(path + '/data/' + dataset_selection)
    if class2_selection:
        return [{'label':i, 'value':i} for i in dataset[class2_selection].unique()]
    else:
        return ''    

@app.callback(
    Output('class3-plot-selection', 'options'),
    [Input('dataset-selection', 'value'),
    Input('class3-selection', 'value')]
)
def update_selected_class3(dataset_selection, class3_selection):
    dataset = pd.read_csv(path + '/data/' + dataset_selection)
    if class3_selection:
        return [{'label':i, 'value':i} for i in dataset[class3_selection].unique()]
    else:
        return '' 

@app.callback(
    Output('auce-values', 'children'),
    [Input('auce-button', 'n_clicks')],
    [State('dataset-selection', 'value'),
    State('time-selection', 'value'),
    State('y-selection', 'value'),
    State('class1-selection', 'value'),
    State('concentration-selection', 'value'),
    State('class2-selection', 'value'),
    State('class3-selection', 'value'),
    State('class1-plot-selection', 'value'),
    State('concentration-plot-selection', 'value'),
    State('class2-plot-selection', 'value'),
    State('class3-plot-selection', 'value')]
)
def auce_comp(n_clicks, dataset_selection,time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
             class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
             class3_plot_selection):
    if  n_clicks % 2 == 0 :  #to toggle if the AUCE appears or not
        auce_output = []
    else :    
        auce_values = auce.auce_main(path, dataset_selection, time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
                        class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
                        class3_plot_selection)
        series_nb = len(auce_values)

        auce_output = []
        for i in range(series_nb):
            auce_output.append(html.Div(
                id=auce_values[i].series, 
                children=[
                    '''{} :'''.format(auce_values[i].series),
                    html.Span(''' AUCE is {} '''.format(auce_values[i].auce), style={'font-weight':'bold'}),
                    html.Br(),
                    html.Br()
                ]
            ))
    return auce_output

@app.callback(
    Output('auce-concentration-fig', 'figure'),
    [Input('auce-concentration-button', 'n_clicks'),
    Input('auce-conc-fit-type', 'value'),
    Input('auce-y-axis-type', 'value'),
    Input('auce-x-axis-type', 'value')],
    [State('dataset-selection', 'value'),
    State('time-selection', 'value'),
    State('y-selection', 'value'),
    State('class1-selection', 'value'),
    State('concentration-selection', 'value'),
    State('class2-selection', 'value'),
    State('class3-selection', 'value'),
    State('class1-plot-selection', 'value'),
    State('concentration-plot-selection', 'value'),
    State('class2-plot-selection', 'value'),
    State('class3-plot-selection', 'value')]
)
def auce_vs_concentration(n_clicks, auce_conc_fit_type, auce_y_axis_type, auce_x_axis_type, dataset_selection, time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
             class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
             class3_plot_selection):
    if not concentration_plot_selection :         
        auce_vs_concentration_fig_new = auce.compute_auce_vs_concentration(path, auce_vs_concentration_fig, colors, dataset_selection, time_selection, auce_conc_fit_type, auce_y_axis_type, auce_x_axis_type, y_selection, 
                                                    class1_selection, concentration_selection, class2_selection, 
                                                    class3_selection, class1_plot_selection, class2_plot_selection, 
                                                    class3_plot_selection)

    return auce_vs_concentration_fig_new
