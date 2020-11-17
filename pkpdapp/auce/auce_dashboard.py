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


# Import data
path = settings.MEDIA_ROOT
dataset = pd.read_csv(path + '/data/antibiotics_dataset.csv')

columns = dataset.columns

fig = go.Figure()
auce_vs_concentration_fig = go.Figure()
simulation_fig = go.Figure()

available_models = [f for f in listdir(path + '/model') if isfile(join(path + '/model', f))]
########################################################


NumberTimePoint=8 # excluding the zero time point 
File_path=(path + '/data/antibiotics_dataset.csv')
with open (File_path) as f : 
    data=pd.read_csv (f, sep=',')
    data.head()
    f.close()
data=data.to_numpy()
InitialCFU=data[0,2]
timeReadIn=data[:,0]#np.reshape(data[1:-1,0],(NumberTimePoint, )
concReadIn=data[:,1]
CFUReadIn=data[:,2]
timeFinal=timeReadIn[0:NumberTimePoint]

CFUFinal=np.reshape(CFUReadIn,(int(len(CFUReadIn)/NumberTimePoint), NumberTimePoint,))
concTemp=np.reshape(concReadIn,(int(len(CFUReadIn)/NumberTimePoint), NumberTimePoint,))
drug_conc=concTemp[:,0]/1000

InitialCFU=CFUFinal[:,0]
Original_data = {'time': timeFinal,
                 'observation': CFUFinal}

# Define model
m = myokit.load_model(path + '/model/AdpativeModelWithConstentDrugConcentration.mmt') #path for the model file 
p = myokit.load_protocol(path + '/model/protocol_FixedConc.mmt')#path for the protocol file(e.g. dose regimen)

ref = myokit.Simulation(m, p) #set up myokit model: input model and protocol 
save_state = ref.state()  #save the original initial state 
P1 = m.get('PDCompartment.P1')
P1.state_value()
P1.set_state_value(1000000)
m.state ()

class MyokitModel(pints.ForwardModel):
    def __init__(self):
        m = myokit.load_model(path + '/model/AdpativeModelWithConstentDrugConcentration.mmt') #path for the model file 
        p = myokit.load_protocol(path + '/model/protocol_FixedConc.mmt')#path for the protocol file(e.g. dose regimen)
        
        self.simulation = myokit.Simulation(m, p) #define simulation (i.e. run the model via myokit)
        
    def n_parameters(self):
        return 10 # number of parameters to Fit
    
    def n_outputs(self):
        return len(drug_conc) 
    
    def simulate(self, PD_parameters,times):
        total_CFU = []
        
        self.simulation.set_state(save_state)
        self.simulation.reset() 
        P1 = m.get('PDCompartment.P1')
        self.simulation.set_time(0)
        self.simulation.set_constant('PDCompartment.KNetgrowth', PD_parameters[0]) # define parameter 
        self.simulation.set_constant('PDCompartment.tvbmax', PD_parameters[1]) # define parameter 
        self.simulation.set_constant('PDCompartment.Kmax', PD_parameters[2]) # define parameter 
        self.simulation.set_constant('PDCompartment.EC50k', PD_parameters[3]) # define parameter         
        self.simulation.set_constant('PDCompartment.gamma', PD_parameters[4]) # define parameter 
        self.simulation.set_constant('PDCompartment.beta', PD_parameters[5]) # define parameter 
        self.simulation.set_constant('PDCompartment.tau', PD_parameters[6]) # define parameter
        self.simulation.set_constant('PDCompartment.Alpha', PD_parameters[7]) # define parameter         
        self.simulation.set_constant('PDCompartment.Kdeath', PD_parameters[8]) # define parameter 
        self.simulation.set_constant('PDCompartment.Ksr_max', PD_parameters[9]) # define parameter 
        
          
        # simulating multiple dose levels
        var_to_log = 'PDCompartment.Total_Bacterial'
        
        DrugConcentration=drug_conc
        IntialCondition= InitialCFU
        for i in range(len(DrugConcentration)):
            self.simulation.reset()  
            P1.set_state_value(IntialCondition[i])
            updated_state = m.state()
            self.simulation.set_state(updated_state)
            self.simulation.set_constant('drug.drugAmount', float(DrugConcentration[i]))
            Output = self.simulation.run(times[-1]+1, log=[var_to_log], log_times = times)
            total_CFU.append(Output[var_to_log])
        
        return np.array(total_CFU).T


############################################################


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
                        symbol=symbols[index_class2*8],
                        opacity=0.7,
                        line=dict(color='black', width=1),
                        color=colors[index_concentration]
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
                        symbol=symbols[index_class2*8],
                        opacity=0.7,
                        line=dict(color='black', width=1),
                        color=colors[index_concentration]
                    )
                ))

    fig.update_layout(
    autosize=True,
    xaxis_title='Time in hours',
    yaxis_title='Bacteria count',
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
    auce_vs_concentration_fig.layout={}
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

def auce_fit(auce_conc_fit_type, auce_y_axis_type, auce_x_axis_type, class2_selection, class2_selected, 
            index_class2, concentrations, auce_vs_concentration_data):

    if auce_conc_fit_type == 'Sigmoid' and len(concentrations) >= 4:
        p0 = [max(auce_vs_concentration_data), min(auce_vs_concentration_data), 1000]
        fitted_params, covariates = curve_fit(fsigmoid,concentrations, auce_vs_concentration_data, p0=p0)
        fit_top,fit_bottom,fit_EC50 = fitted_params

        sigma_top,sigma_bottom,sigma_EC50 = np.sqrt(np.diag(covariates))

        if auce_x_axis_type == 'linear' :
            x = np.linspace(min(concentrations), max(concentrations), 500) 
        elif min(concentrations):
            x = np.geomspace(min(concentrations), max(concentrations), 500)
        else :
            x = np.geomspace(0.1, max(concentrations), 500)

        y = fsigmoid(x, *fitted_params)

        y_upper = fsigmoid(x, fit_top+abs(sigma_top), fit_bottom+abs(sigma_bottom), fit_EC50-abs(sigma_EC50))
        y_lower = fsigmoid(x, fit_top-abs(sigma_top), fit_bottom-abs(sigma_bottom), fit_EC50+abs(sigma_EC50))

        if (fit_EC50>0 and sigma_bottom and sigma_EC50 and sigma_top and (fit_EC50-abs(sigma_EC50)) >0):    
            auce_vs_concentration_fig.add_trace(go.Scatter(
                x=[fit_EC50, fit_EC50],
                y=[0,fsigmoid(fit_EC50, *fitted_params)],
                line=dict(width=1,color=colors[index_class2], dash = 'dot'),
                mode='lines',
                hovertemplate=(
                "EC50 : %f +/- %f<br><br>" % (fit_EC50, sigma_EC50)+
                "<extra></extra>"),
                showlegend=False
            ))
            auce_vs_concentration_fig.add_trace(go.Scatter(
                x = x,
                y = y,
                name = "FIT %s, %s" %(class2_selection, class2_selected),
                showlegend = True,
                visible = True,
                hovertemplate=(
                "<b>Fit </b><br>" +
                "Parameters :<br>"+
                "Top : %f +/- %f<br> " % (fit_top, sigma_top) +
                "Bottom : %f +/- %f<br>" % (fit_bottom, sigma_bottom) +
                "EC50 : %f +/- %f<br><br>" % (fit_EC50, sigma_EC50)+
                "X : %{x:}<br>" +
                "Y: %{y:}<br>" +
                "<extra></extra>"),
                mode="lines",
                line=dict(color=colors[index_class2])        
            ))
            auce_vs_concentration_fig.add_trace(go.Scatter(
                x=x,
                y=y_upper,
                mode='lines',
                line=dict(width=0.3,color=colors[index_class2]),
                showlegend=False,
                hoverinfo='skip'
            ))
            auce_vs_concentration_fig.add_trace(go.Scatter(
                x=x,
                y=y_lower,
                line=dict(width=0.3,color=colors[index_class2]),
                mode='lines',
                showlegend=False,
                hoverinfo='skip'
            ))
            auce_vs_concentration_fig.update_layout(
                autosize=True,
                xaxis_title='Concentration',
                yaxis_title='AUCE',
                xaxis_type = auce_x_axis_type,
                yaxis_type = auce_y_axis_type,
                template="plotly_white",
            )
        else :
            auce_vs_concentration_fig.add_annotation(text=("Could not fit %s %s<br> " %(class2_selection, class2_selected)), 
                                                    xref='paper', yref='paper', x=0.05, y=1-index_class2*0.1, showarrow=False,font=dict(color=colors[index_class2]))

def update_simulation(time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
                  class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
                  class3_plot_selection, yaxis_sim_type_selection, xaxis_sim_type_selection, model, parameters):


    AdaptiveModel = MyokitModel()

    if xaxis_sim_type_selection == 'linear' :
        x_simulation = np.linspace(0, 24, 500) 
    else :
        x_simulation = np.geomspace(0.1, 24, 500)

    test_simulation = AdaptiveModel.simulate (parameters,x_simulation)

    simulation_fig.data = []

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

                    simulation_fig.add_trace(go.Scatter(
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
                        symbol=symbols[index_class2*8],
                        opacity=0.7,
                        line=dict(color='black', width=1),
                        color=colors[index_concentration]
                    )
                ))
            else:
                simulation_fig.add_trace(go.Scatter(
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
                        symbol=symbols[index_class2*8],
                        opacity=0.7,
                        line=dict(color='black', width=1),
                        color=colors[index_concentration]
                    )
                ))
    if concentration_plot_selection :

        index = np.where(drug_conc.astype(np.float) == (float(concentration_plot_selection)/1000))
        trace = (test_simulation.T[index])
        simulation_fig.add_trace(go.Scatter(
            x = x_simulation,
            y = trace[0],
            name = "Model of concentration %s" % str(concentration_plot_selection/1000),
            showlegend = True,
            visible = True,
            hovertemplate=(
                "<b>Model </b><br>" +
                "Concentration : %s<br>" % str(concentration_plot_selection/1000) +
                "X : %{x:}<br>" +
                "Y: %{y:}<br>" +
                "<extra></extra>"),
            mode="lines",
            line=dict(color=colors[0])  
        )) 
    else :        
        for i, trace in enumerate(test_simulation.T): 
            simulation_fig.add_trace(go.Scatter(
                x = x_simulation,
                y = trace,
                name = "Model of concentration %s" % str(drug_conc [i]),
                showlegend = True,
                visible = True,
                hovertemplate=(
                    "<b>Model </b><br>" +
                    "Concentration : %f<br>" % drug_conc[i] +
                    "X : %{x:}<br>" +
                    "Y: %{y:}<br>" +
                    "<extra></extra>"),
                mode="lines",
                line=dict(color=colors[i])  
            )) 

    simulation_fig.update_layout(
    autosize=True,
    xaxis_title='Time in hours',
    yaxis_title='Bacteria count',
    xaxis_type = xaxis_sim_type_selection,
    yaxis_type = yaxis_sim_type_selection,
    template="plotly_white",
    ),
                              
    return simulation_fig

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
                                                value = 'CFU',
                                                style = dict(
                                                    width = '50%',
                                             )),
                                html.Br(),
                                html.Br(),
                                html.Span("Dose group :", style={'font-weight':'bold'}),
                                dcc.Dropdown(id='concentration-selection', 
                                                options=[{'label':i, 'value':i} for i in columns],
                                                value = 'Conc',
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
                                                value = 'Drug',
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
                                                value = 'Dosing',
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
                    label='AUCE',
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
                        html.Br(),
                        html.Br(),
                        "Fit type :",
                        dcc.RadioItems(
                                id= 'auce-conc-fit-type',
                                options=[{'label':i, 'value':i} for i in ['None','Sigmoid']],
                                value = 'None',
                        ),

                    ], style={'width': '100%'})
                ),
                dcc.Tab(
                    label='Simulation',
                    value='simulation',
                    children=html.Div(className='control-tab', children=[
                        html.Br(),
                        html.Br(),
                        html.Button(id='simulate-button', n_clicks = 0, children='Simulate'),
                        html.Span("Model selection :", style={'color':'grey'}),
                        dcc.Dropdown(id='model-selection', 
                                    placeholder = '...',  
                                    options = [{'label':i, 'value':i} for i in available_models], 
                                    style = dict(
                                    width = '40%',
                                    display = 'inline-block'
                                    )),
                        html.Br(),
                        dcc.Graph(
                            id='simulation-fig',
                            figure=simulation_fig
                        ),
                        html.Div(["Y axis :",
                                dcc.RadioItems(
                                    id= 'yaxis-sim-type',
                                    options=[{'label':i, 'value':i} for i in ['linear','log']],
                                    value = 'linear',
                                ),
                                html.Br(),
                                "X axis :",
                                dcc.RadioItems(
                                    id= 'xaxis-sim-type',
                                    options=[{'label':i, 'value':i} for i in ['linear','log']],
                                    value = 'linear',
                                ),
                                html.Br(),
                                html.Br(),
                        ], style={'width': '40%'}), 
                        html.Div([
                            html.Span(id='p1-label', style={'color':'grey'}),
                            dcc.Slider(
                                id='p1',
                                min=0,
                                max=10,
                                step=0.1,
                                value= 2.3,
                            ),  
                            html.Span(id='p2-label', style={'color':'grey'}),   
                            dcc.Slider(
                                id='p2',
                                min=1E+8,
                                max=1E+10,
                                step=1E+7,
                                value=1E+9,
                            ), 
                            html.Span(id='p3-label', style={'color':'grey'}),
                            dcc.Slider(
                                id='p3',
                                min=0,
                                max=20,
                                step=0.1,
                                value=3.2,
                            ), 
                            html.Span(id='p4-label', style={'color':'grey'}),
                            dcc.Slider(
                                id='p4',
                                min=0,
                                max=3,
                                step=0.05,
                                value=0.5,
                            ), 
                            html.Span(id='p5-label', style={'color':'grey'}),
                            dcc.Slider(
                                id='p5',
                                min=0,
                                max=10,
                                step=0.1,
                                value=3.8,
                            ),
                            html.Span(id='p6-label', style={'color':'grey'}), 
                            dcc.Slider(
                                id='p6',
                                min=0,
                                max=100,
                                step=1,
                                value=44,
                            ), 
                            html.Span(id='p7-label', style={'color':'grey'}),
                            dcc.Slider(
                                id='p7',
                                min=0,
                                max=0.01,
                                step=0.001,
                                value=0.002,
                            ), 
                            html.Span(id='p8-label', style={'color':'grey'}),
                            dcc.Slider(
                                id='p8',
                                min=0,
                                max=10,
                                step=0.1,
                                value=3.1,
                            ), 
                            html.Span(id='p9-label', style={'color':'grey'}),
                            dcc.Slider(
                                id='p9',
                                min=0,
                                max=3,
                                step=0.1,
                                value=0.3,
                            ), 
                            html.Span(id='p10-label', style={'color':'grey'}),
                            dcc.Slider(
                                id='p10',
                                min=0,
                                max=10,
                                step=0.1,
                                value=2.8,
                            ),  
                        ], style={'width': '50%'})

                    ])
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

@app.callback(
    [Output('p1','max'),
    Output('p2', 'max'),
    Output('p3','max'),
    Output('p4','max'),
    Output('p5','max'),
    Output('p6','max'),
    Output('p7','max'),
    Output('p8','max'),
    Output('p9','max'),
    Output('p10','max'),
    Output('p1','step'),
    Output('p2', 'step'),
    Output('p3','step'),
    Output('p4','step'),
    Output('p5','step'),
    Output('p6','step'),
    Output('p7','step'),
    Output('p8','step'),
    Output('p9','step'),
    Output('p10','step'),
    Output('p1','value'),
    Output('p2', 'value'),
    Output('p3','value'),
    Output('p4','value'),
    Output('p5','value'),
    Output('p6','value'),
    Output('p7','value'),
    Output('p8','value'),
    Output('p9','value'),
    Output('p10','value'),
    Output('p1','marks'),
    Output('p2', 'marks'),
    Output('p3','marks'),
    Output('p4','marks'),
    Output('p5','marks'),
    Output('p6','marks'),
    Output('p7','marks'),
    Output('p8','marks'),
    Output('p9','marks'),
    Output('p10','marks')],
    [Input('model-selection', 'value')]
)
def update_sliders(model):
    if model == 'AdpativeModelWithConstentDrugConcentration.mmt':
        p1_max=10
        p1_step=0.1
        p1_value=2.3
        p2_max=1E+10
        p2_step=1E+8
        p2_value=1E+9
        p3_max=10
        p3_step=0.1
        p3_value=3.2
        p4_max=5
        p4_step=0.1
        p4_value=0.5
        p5_max=10
        p5_step=0.1
        p5_value=3.8
        p6_max=100
        p6_step=1
        p6_value=44
        p7_max=0.01
        p7_step=0.0005
        p7_value=0.002
        p8_max=10
        p8_step=0.1
        p8_value=3.1
        p9_max=2
        p9_step=0.01
        p9_value=0.35
        p10_max=10
        p10_step=0.1
        p10_value=2.8

        p1_marks={
            0:{'label':'0'},
            p1_max:{'label':'%f'%p1_max}
        }
        p2_marks={
            0:{'label':'0'},
            p2_max:{'label':'%f'%p2_max}
        }
        p3_marks={
            0:{'label':'0'},
            p3_max:{'label':'%f'%p3_max}
        }
        p4_marks={
            0:{'label':'0'},
            p4_max:{'label':'%f'%p4_max}
        }
        p5_marks={
            0:{'label':'0'},
            p5_max:{'label':'%f'%p5_max}
        }
        p6_marks={
            0:{'label':'0'},
            p6_max:{'label':'%f'%p6_max}
        }
        p7_marks={
            0:{'label':'0'},
            p7_max:{'label':'%f'%p7_max}
        }
        p8_marks={
            0:{'label':'0'},
            p8_max:{'label':'%f'%p8_max}
        }
        p9_marks={
            0:{'label':'0'},
            p9_max:{'label':'%f'%p9_max}
        }
        p10_marks={
            0:{'label':'0'},
            p10_max:{'label':'%f'%p10_max}
        }


    return p1_max,p2_max,p3_max,p4_max,p5_max,p6_max,p7_max,p8_max,p9_max,p10_max, p1_step,p2_step,p3_step,p4_step,p5_step,p6_step,p7_step,p8_step,p9_step,p10_step,p1_value,p2_value,p3_value,p4_value,p5_value,p6_value,p7_value,p8_value,p9_value,p10_value,p1_marks,p2_marks,p3_marks,p4_marks,p5_marks,p6_marks,p7_marks,p8_marks,p9_marks,p10_marks

@app.callback(
    [Output('p1-label', 'children'),
    Output('p2-label', 'children'),
    Output('p3-label', 'children'),
    Output('p4-label', 'children'),
    Output('p5-label', 'children'),
    Output('p6-label', 'children'),
    Output('p7-label', 'children'),
    Output('p8-label', 'children'),
    Output('p9-label', 'children'),
    Output('p10-label', 'children')],
    [Input('p1', 'value'),
    Input('p2', 'value'),
    Input('p3', 'value'),
    Input('p4', 'value'),
    Input('p5', 'value'),
    Input('p6', 'value'),
    Input('p7', 'value'),
    Input('p8', 'value'),
    Input('p9', 'value'),
    Input('p10', 'value')],
    [State('model-selection', 'value')]
)
def update_sliders_labels(p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,model):
    if model == 'AdpativeModelWithConstentDrugConcentration.mmt':
        p1_label = 'KNetgrowth : %f'%p1
        p2_label = 'tvbmax : %f'%p2
        p3_label = 'Kmax : %f'%p3
        p4_label = 'EC50k : %f'%p4
        p5_label = 'gamma : %f'%p5
        p6_label = 'beta : %f'%p6
        p7_label = 'tau : %f'%p7
        p8_label = 'Alpha : %f'%p8
        p9_label = 'Kdeath : %f'%p9
        p10_label = 'Ksr_max : %f'%p9

    return p1_label,p2_label,p3_label,p4_label,p5_label,p6_label,p7_label,p8_label,p9_label,p10_label

@app.callback(
    Output('simulation-fig','figure'),
    [Input('simulate-button', 'n_clicks'),
    Input('p1', 'value'),
    Input('p2', 'value'),
    Input('p3', 'value'),
    Input('p4', 'value'),
    Input('p5', 'value'),
    Input('p6', 'value'),
    Input('p7', 'value'),
    Input('p8', 'value'),
    Input('p9', 'value'),
    Input('p10', 'value'),
    Input('yaxis-sim-type', 'value'),
    Input('xaxis-sim-type', 'value')],
    [State('model-selection', 'value'),
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
def callback_update_simulation(n_clicks, p1,p2,p3,p4,p5,p6,p7,p8,p9,p10, yaxis_sim_type_selection, xaxis_sim_type_selection, model, time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
                  class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
                  class3_plot_selection):
    if n_clicks:
        parameters = [p1,p2,p3,p4,p5,p6,p7,p8,p9,p10]

        simulation_fig_updated = update_simulation(time_selection, y_selection, class1_selection, concentration_selection, class2_selection, 
                    class3_selection, class1_plot_selection, concentration_plot_selection, class2_plot_selection, 
                    class3_plot_selection, yaxis_sim_type_selection, xaxis_sim_type_selection, model, parameters)  

    return simulation_fig_updated        