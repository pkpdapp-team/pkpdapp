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

import numpy as np
import pandas as pd 
import plotly
import plotly.colors
import plotly.graph_objects as go
from plotly.validators.scatter.marker import SymbolValidator
from dash.dependencies import Input, Output, State
from scipy.optimize import curve_fit

# Import data
path = settings.MEDIA_ROOT
dataset = pd.read_csv(path + '/data/TCB4dataset.csv')

columns = dataset.columns

fig = go.Figure()
auce_vs_concentration_fig = go.Figure()

# Create dash app 
app = DjangoDash('auce_dashboard') 

colors = plotly.colors.qualitative.Plotly[:1000]
symbols = SymbolValidator().values

class modeling_class:
    def __init__(self):
        self.series = ""
        self.auce=0
def fsigmoid(concentration,top,bottom,EC50):
    # this function simulates Emax-EC50 curve for a given concentration range
    return bottom + concentration*(top-bottom)/(EC50  + concentration)

################################# GRAPH #################################

def update_figure(time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
                  class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
                  class3_plot_selection, yaxis_type_selection, xaxis_type_selection):
    fig.data = []

    data = dataset.loc[dataset[class1_selection]==class1_plot_selection]

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

################################# MODELING #################################

def model(time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
        class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
        class3_plot_selection):

    modeling_values = []

    data = dataset.loc[dataset[class1_selection]==class1_plot_selection]

    concentration = [concentration_plot_selection] if concentration_plot_selection else data[concentration_selection].unique()

    series_nb = 0
    for index_concentration, concentration_selected in enumerate(concentration): 

        concentration_data = data.loc[data[concentration_selection]==concentration_selected]
        class2 = [class2_plot_selection] if class2_plot_selection else concentration_data[class2_selection].unique()

        for index_class2, class2_selected in enumerate(class2):
            
            class2_data = concentration_data.loc[concentration_data[class2_selection]==class2_selected]

            if class3_plot_selection :
                class3 = class2_data[class3_selection].unique()

                for index_class3, class3_selected in enumerate(class3):
                    True
            else:
                modeling_values.append(calculate_model_values(class2_data, time_selection, y_selection, class1_plot_selection, concentration_selected, class2_selected, 
                                    False))
                series_nb += 1
                 
    return modeling_values

def calculate_model_values(data, time_selection, y_selection, class1_selected, concentration_selected, class2_selected, 
                           class3_selected):
    modeling_values = modeling_class()

    if class3_selected :
        modeling_values.series = '''Y_type : {}, Concentration : {}, Drug : {}, ID : {}'''.format(class1_selected, concentration_selected, class2_selected, class3_selected)
    else :
        modeling_values.series = '''Y_type : {}, Concentration : {}, Drug : {}'''.format(class1_selected, concentration_selected, class2_selected)

    modeling_values.auce = np.trapz(data[y_selection], data[time_selection])

    return modeling_values

def compute_auce_vs_concentration(time_selection, auce_conc_fit_type, auce_y_axis_type, auce_x_axis_type, y_selection, class1_selection, concentration_selection, class2_selection, 
             class3_selection, class1_plot_selection, class2_plot_selection, 
             class3_plot_selection):

    auce_vs_concentration_fig.data = []
    data = dataset.loc[dataset[class1_selection]==class1_plot_selection]

    class2 = [class2_plot_selection] if class2_plot_selection else data[class2_selection].unique()

    for index_class2, class2_selected in enumerate(class2): 

        class2_data = data.loc[data[class2_selection]==class2_selected]
        concentrations = class2_data[concentration_selection].unique()
        auce_vs_concentration_data = np.zeros(len(concentrations))

        for index_concentration, concentration_selected in enumerate(concentrations):

            concentration_data = class2_data.loc[class2_data[concentration_selection]==concentration_selected]

            auce_vs_concentration_data[index_concentration] = np.trapz(concentration_data[y_selection],concentration_data[time_selection])

        if not (auce_conc_fit_type == 'None'):
            auce_fit(auce_conc_fit_type, auce_y_axis_type, auce_x_axis_type, class2_selection, class2_selected, index_class2, concentrations, auce_vs_concentration_data)

        auce_vs_concentration_fig.add_trace(go.Scatter(
            x = concentrations,
            y = auce_vs_concentration_data,
            name = "%s, %s" %(class2_selection, class2_selected),
            showlegend = True,
            visible = True,
            hovertemplate=(
            "<b>Measurement </b><br>" +
            "%s : %s<br>" % (class1_selection, class1_plot_selection) +
            "%s : %s<br>" % (class2_selection, class2_selected) +
            "X : %{x:}<br>" +
            "Y: %{y:}<br>" +
            "<extra></extra>"),
            mode="markers",
            marker=dict(
                opacity=0.7,
                line=dict(color='black', width=1),
                color=colors[index_class2]
            )
        )) 
    auce_vs_concentration_fig.update_layout(
        autosize=True,
        xaxis_title='Concentration',
        yaxis_title='AUCE',
        xaxis_type = auce_x_axis_type,
        yaxis_type = auce_y_axis_type,
        template="plotly_white",
    )
    return auce_vs_concentration_fig

def auce_fit(auce_conc_fit_type, auce_y_axis_type, auce_x_axis_type, class2_selection, class2_selected, index_class2, concentrations, auce_vs_concentration_data):
    if auce_conc_fit_type == 'Sigmoid' and len(concentrations) >= 4:

        p0 = [max(auce_vs_concentration_data), min(auce_vs_concentration_data), 1000]
        fitted_params, covariates = curve_fit(fsigmoid,concentrations, auce_vs_concentration_data, p0=p0)
        fit_top,fit_bottom,fit_EC50 = fitted_params

        if auce_x_axis_type == 'linear' :
            x = np.linspace(min(concentrations), max(concentrations), 500) 
        elif min(concentrations):
            x = np.geomspace(min(concentrations), max(concentrations), 500)
        else :
            x = np.geomspace(0.1, max(concentrations), 500)

        y = fsigmoid(x, fit_top,fit_bottom,fit_EC50)

        print(x)
        print(y)
        auce_vs_concentration_fig.add_trace(go.Scatter(
                x = x,
                y = y,
                name = "FIT %s, %s" %(class2_selection, class2_selected),
                showlegend = True,
                visible = True,
                hovertemplate=(
                "<b>Fit </b><br>" +
                "Parameters :<br>"+
                "Top : %f<br>" % fit_top +
                "Bottom : %f<br>" % fit_bottom +
                "EC50 : %f<br><br>" % fit_EC50 +
                "X : %{x:}<br>" +
                "Y: %{y:}<br>" +
                "<extra></extra>"),
                mode="lines",
                line=dict(color=colors[index_class2])
                
            )) 
        auce_vs_concentration_fig.update_layout(
            autosize=True,
            xaxis_title='Concentration',
            yaxis_title='AUCE',
            xaxis_type = auce_x_axis_type,
            yaxis_type = auce_y_axis_type,
            template="plotly_white",
        )
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
                dcc.Tab(
                    label='Modeling',
                    value='explore-modeling',
                    children=html.Div(className='control-tab', children=[
                        html.H4(className='explore-modeling', children='Modeling'),
                        html.Button(id='auce-button', n_clicks = 0, children='Compute AUC parameters'),
                        html.Button(id='auce-concentration-button', n_clicks = 0, children='Compute AUCE vs concentration'),
                        html.Div(id='modeling-values'),
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
                        dcc.RadioItems(
                                id= 'auce-conc-fit-type',
                                options=[{'label':i, 'value':i} for i in ['None','Sigmoid']],
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
    ])

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

@app.callback(
    Output('modeling-values', 'children'),
    [Input('auce-button', 'n_clicks')],
    [State('time-selection', 'value'),
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
def modeling(n_clicks, time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
             class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
             class3_plot_selection):
    if  n_clicks % 2 == 0 :  #to toggle if the AUCE appears or not
        modeling_output = []
    else :    
        modeling_values = model(time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
                        class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
                        class3_plot_selection)
        series_nb = len(modeling_values)

        modeling_output = []
        for i in range(series_nb):
            modeling_output.append(html.Div(
                id=modeling_values[i].series, 
                children=[
                    '''{} :'''.format(modeling_values[i].series),
                    html.Span(''' AUCE is {} '''.format(modeling_values[i].auce), style={'font-weight':'bold'}),
                    html.Br(),
                    html.Br()
                ]
            ))
    return modeling_output

@app.callback(
    Output('auce-concentration-fig', 'figure'),
    [Input('auce-concentration-button', 'n_clicks'),
    Input('auce-conc-fit-type', 'value'),
    Input('auce-y-axis-type', 'value'),
    Input('auce-x-axis-type', 'value')],
    [State('time-selection', 'value'),
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
def auce_vs_concentration(n_clicks, auce_conc_fit_type, auce_y_axis_type, auce_x_axis_type, time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
             class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
             class3_plot_selection):
    if not concentration_plot_selection :         
        auce_vs_concentration_fig = compute_auce_vs_concentration(time_selection, auce_conc_fit_type, auce_y_axis_type, auce_x_axis_type, y_selection, class1_selection, concentration_selection, class2_selection, 
                                                    class3_selection, class1_plot_selection, class2_plot_selection, 
                                                    class3_plot_selection)

    return auce_vs_concentration_fig