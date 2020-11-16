# -*- coding: utf-8 -*-
"""
Created on Tue Mar  5 17:15:08 2019

@author: wangk39
"""

from __future__ import print_function
import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import odeint
import pints
import math
import pandas as pd
#%% data import 

#NumberTimePoint=8 # excluding the zero time point 
NumberTimePoint=8 # excluding the zero time point 
#File_path='\\\\rbansis04\\pRED-COMFS-EMEA\\PKPD_MS\\wangk\\ProjectWork\\LipoProteinTrasportInhibitor\\OtherTK\\ACC00445_TK.csv'
#File_path='\\\\rbansis04\\pRED-COMFS-EMEA\\PKPD_MS\\wangk\\ProjectWork\\LipoProteinTrasportInhibitor\\OtherTK\\ACC08706_TK.csv'
#File_path='\\\\rbansis04\\pRED-COMFS-EMEA\\PKPD_MS\\wangk\\ProjectWork\\LipoProteinTrasportInhibitor\\LeadCompoundRO7248203\\TK\\ACC00445_TK_New.csv'
#File_path='\\\\rbansis04\\pRED-COMFS-EMEA\\PKPD_MS\\wangk\\ProjectWork\\LipoProteinTrasportInhibitor\\RO7285431\\TK\\ACC01077_TK.csv'
File_path='\\\\rbansis04\\pRED-COMFS-EMEA\\PKPD_MS\\wangk\\ProjectWork\\LipoProteinTrasportInhibitor\\RO7285431\\TK\\ACC01087_TK.csv'

with open (File_path) as f : 
    data=pd.read_csv (f, sep=',')
    data.head()
    f.close()

type(data)
data=data.as_matrix()
InitialCFU=data[0,2]
timeReadIn=data[:,0]#np.reshape(data[1:-1,0],(NumberTimePoint, )
concReadIn=data[:,1]
CFUReadIn=data[:,2]
print(InitialCFU)
timeFinal=timeReadIn[0:NumberTimePoint]
#print(int(len(CFUReadIn)/5))
CFUFinal=np.reshape(CFUReadIn,(int(len(CFUReadIn)/NumberTimePoint), NumberTimePoint,))
concTemp=np.reshape(concReadIn,(int(len(CFUReadIn)/NumberTimePoint), NumberTimePoint,))
drug_conc=concTemp[:,0]#/1000
#data_time=data("Time")
print(drug_conc)
InitialCFU=CFUFinal[:,0]
Original_data = {'time': timeFinal,
                 'observation': CFUFinal}
colorlist=['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C0']
plt.figure()
for i in range(len(drug_conc)):
    drug_conc_i = drug_conc[i]
    plt.semilogy(Original_data['time'],Original_data['observation'][i,:], color=colorlist[i])

#%% Adpative Model Equation 
# Simple adaptive model taken from Nicolas Gregoire 2010 (Modelling TK for Ciprofloxacin against PA), adapted to have the P population

def AdpativeModelODEWithSandP(y, t, p, DrugConc):
    # parameters
    kNetgrowth = p[0]  # /h: Net growth rate of bacterial
    tvbmax = p[1]   # CFU/mL maximal possible size of the inoculum 
    Kmax = p[2] # /h Maximum killing rate of the compound 
    EC50k= p[3] # ug/mL EC50 of antibiotic killing without any adaptation  
    gamma = p[4]  # dimensionless Hill Coefficient of killling
    beta = p[5]  # dimensionless Maximum adaptation on EC50 
    tau= p[6] # mL/h.ug rate of adaptation 
    Alpha =p[7] #/h time rate at which the kill can reach maximum (mimicking delay) 
    Kdeath = p[8] #/h death rate of the P population 
    Ksr_max=p[9] #/h maximum transit rate between S and P (traditionally it was just a fraction of netgrowh but could be idependent)
    EC50Adapted= EC50k*(1+beta*(1-math.e**(-DrugConc*tau*t)))
    Ksr = ( (Ksr_max/tvbmax) *(y[0]+y[1]) )  # transition rate from S to P drug senstive pop
    # state variable
    # y  # CFU/mL bacterial   

    dydt = np.zeros(y.shape)    
    dydt[0] = kNetgrowth*(1-(y[0]+y[1])/tvbmax)*y[0]-Ksr*y[0]-Kmax*(1-math.e**(-t*Alpha))*DrugConc**gamma/(EC50Adapted**gamma+DrugConc**gamma)*y[0]
    dydt[1] =Ksr*y[0]- Kdeath*y[1]
 
    if y[0]<1:
       y[0]=0
    
    if y[1]<1:
       y[1]=0   
    
    return dydt
#%% # Define solving 
def AdaptiveModel_sol(param, time, DrugConc, InitialCondition):
    # Since drug case, take drug concentration as one input argument
    
    # Special initial condition if needed
    # e.g. parameter dependent initial condition
    #y0 = [param[8]*2e6, param[8]*param[9]*2e6, (1-param[8])*2e6, (1-param[8])*param[9]*2e6]
    y0 = [InitialCondition,0]
    # ODE solver
    #solution = odeint(TwoPopDrugODE, y0, time, args=(param, DrugConc))
    
    solution = odeint(AdpativeModelODEWithSandP, y0, time, args=(param, DrugConc))
    CFU = np.array(solution)
    CFU[CFU<1]=0
    return CFU

class Model(pints.ForwardModel):
    
    def simulate(self, parameters, times, DrugConc, IntialCondition):
        # Run a simulation with the given parameters for the
        # given times and return the simulated values.
        # We are only interested in the total population
        sol = AdaptiveModel_sol(parameters, times, DrugConc, IntialCondition)
        CFU = np.sum(sol, axis=1)
        return CFU
    
    def dimension(self):
        # Return the dimension of the parameter vector
        return 10
    
    def n_parameters(self):
        return 10


# Then create an instance of our new model class
model = Model()

#%% Test the model with initial set of parameter 
#drug_conc=drug_conc*1.2
    
#param_test=[ 1.5, 5e8, 5, 0.25, 4,10,8e-2,0.3,0.35,0.002]
#param_test=[1.26696,7.15E+08,3,0.276157,3.30653,80,0.015,0.599985,0.183982,0.00771674]


param_test=[1.30386,1.15E+09,3.36301,0.413567,3.37522,36.4649,7.19E-03,0.490801,0.0367193,0.0010644] #01807 TK
#param_test=[1.3,8.64261e+08,2.6846,0.526035,8,57.9848,0.00285937,1.29105,0.272662,0.217672]



#param_test=[1.06503490252520,	679349607.056712,	1.69096777643540,	0.436454828543367, 	19.8549396130509,	39.6682407797463,	0.00512027156079460,	1.15906931649257,	0.100464308419853,	0.999985854158940]
#param_test=[1.5,1725710210,4,0.002,1.5,500,0.1,0.8,1.073721334,1.033901051]
#param_test=[1.1,	8e+08, 2.37,	0.06,	6.08,	80	,0.0196,	0.65,	0.2,0.05]

#param_test=[1.1,	1e+09,	2,	0.08,	10,	95,	0.019,	0.658,	0.2,	0.05]

#param_test=[1.1,	8e+08,	2.35,	0.0937	,5.54,	55,	0.018,	0.768,	0.205,	0.0174,	0.326]

#drug_conc=np.array([0,0.25,0.5,1,2,4,8])  


#param_test=[1.20361200000000, 679250000,	2.85000000000000,	0.262349150000000	,3.14120350000000,	  30.3339750000000,	0.0167200000000000,	0.569985750000000,	0.174782900000000	,0.00694506600000000]
#kNetgrowth = p[0]  # /h: Net growth rate of bacterial
#tvbmax = p[1]   # CFU/mL maximal possible size of the inoculum 
#Kmax = p[2] # /h Maximum killing rate of the compound 
#EC50k= p[3] # ug/mL EC50 of antibiotic killing without any adaptation  
#gamma = p[4]  # dimensionless Hill Coefficient of killling
#beta = p[5]  # dimensionless Maximum adaptation on EC50 
#tau= p[6] # mL/h.ug rate of adaptation 
#Alpha =p[7] #/h time rate at which the kill can reach maximum (mimicking delay) 
#Kdeath = p[8] #/h death rate of the P population 
#Ksr_max=p[9] #/h maximum transit rate between S and P

time_test = np.arange(0, 24, 0.1) #timeFinal #
colorlist=['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C0']

plt.figure()
for i in range(len(drug_conc)):
    drug_conc_i = drug_conc[i]
    Initial_conc_i=1e7 #InitialCFU[i]
    EC50Adapted= param_test[3]*(1+param_test[5]*(1-math.e**(-drug_conc_i*param_test[6]*time_test)))
   # KillRate= param_test[2]*(1-math.e**(-time_test*param_test[7]))*drug_conc_i**param_test[4]/(EC50Adapted+drug_conc_i**param_test[4])
    
    plt.xlabel('time')
    plt.ylabel('ED50')
    plt.plot(time_test,EC50Adapted, color=colorlist[i])
   



plt.figure()
for i in range(len(drug_conc)):
    drug_conc_i = drug_conc[i]
    
    Initial_conc_i=InitialCFU[i]
    EC50Adapted= param_test[3]*(1+param_test[5]*(1-math.e**(-drug_conc_i*param_test[6]*time_test)))
    KillRate= param_test[2]*(1-math.e**(-time_test*param_test[7]))*(drug_conc_i**param_test[4])/(EC50Adapted**param_test[4]+drug_conc_i**param_test[4])
    
    plt.xlabel('time')
    plt.ylabel('KillRate')
    plt.plot(time_test,KillRate, color=colorlist[i])
    plt.plot(time_test, np.ones(time_test.shape)*param_test[0])
    plt.plot(time_test, np.ones(time_test.shape)*4)
#    
plt.figure()
for i in range(len(drug_conc)):
    drug_conc_i = drug_conc[i]
    Initial_conc_i=InitialCFU[i] #For TK simulation 
    #Initial_conc_i=1.4e5 #For MBC Simulation
    sol_test = AdaptiveModel_sol(param_test, time_test, drug_conc_i,Initial_conc_i)
      
    plt.xlabel('time')
    plt.ylabel('population')
    
    plt.semilogy(time_test, np.sum(sol_test, axis=1),
             label='drug conc '+str(drug_conc_i),  color=colorlist[i])

    plt.semilogy(Original_data['time'],Original_data['observation'][i,:],'^', color=colorlist[i])
#plt.legend()
plt.show()    
#plt.figure()
#for i in range(len(drug_conc)):
#    drug_conc_i = drug_conc[i]
#    #Initial_conc_i=1e7 #InitialCFU[i]
#    drug_conc_i = drug_conc[i]
#    
#    Initial_conc_i=InitialCFU[i] #For TK simulation 
#    #Initial_conc_i=5.4e5 #For MBC Simulation 
#    sol_test = AdaptiveModel_sol(param_test, time_test, drug_conc_i,Initial_conc_i)
#    Ksr =  (param_test[0]/param_test[1]) * np.sum(sol_test, axis=1) 
#    plt.xlabel('time')
#    plt.ylabel('population')
#    
#    plt.semilogy(time_test, Ksr ,
#             label='drug conc '+str(drug_conc_i),  color=colorlist[i])    
    
#%% Define error function for fitting 
class ScoreFunction(pints.ErrorMeasure):
    
    def __init__(self, model, times, values, simulate_param, InitialCondition):
        # Using sum of squares error for all values
        #
        # model: pints.ForwardModel
        # times: time series to simulate
        # values: multiple series that match model with simulate_param
        # simulate_param: parameters that correspond to each series in values
        super(ScoreFunction, self).__init__()
        
        self._model = model
        self._dimension = self._model.dimension()
        self._times = times
        if len(values) == len(simulate_param):
            self._values = np.asarray(values)
            self._param = np.asarray(simulate_param)
            self._InitialCondition = np.asarray(InitialCondition)
        else:
            raise ValueError('Length of values must be the same as simulate_param')

    def dimension(self):
        """ See :meth:`ErrorMeasure.dimension`. """
        return self._dimension
    
    def n_parameters(self):
        return self._dimension

    def __call__(self, x):
        total = 0
        # go through all simulation parameter (drug concentration)
        for i in range(len(self._param)):
            sim_param=self._param[i]
            InitialCondition=self._InitialCondition[i]
            # simulate the model
            values = self._model.simulate(x, self._times, sim_param,InitialCondition)
            # sum of square error for corresponding values
            # total += np.sum(((values - self._values[i])/self._values[i])**2)
            
            total += np.sum((np.log10(values) - np.log10(self._values[i]))**2)
            # total += np.sum(((np.log10(values) - np.log10(self._values[i]))/np.log10(self._values[i]))**2)
        return total
# In[21]: Optimization 
    
#InitialEstimate =  [ 1.5, 5e8, 5, 0.25, 4,10,8e-2,0.3,0.35,0.002]
#InitialEstimate =  [0.703234, 0.304283, 7.07E+08, 1.48412, 1.12309, 7.88296, 3.99219, 0.9999]
#InitialEstimate =  [1.10141,1.9E+09,3.02922,0.293615,3.34753,32.354,1.80E-02,0.539193,0.380963,0.999992]
#InitialEstimate = [1.09742,1.26E+09,3.08741,0.295415,3.35566,32.4728,0.0179902,0.519998,0.408524]
        
#InitialEstimate = [1.1,	1e+09,	2,	0.08,	10,	95,	0.019,	0.658,	0.2,	0.05]
#InitialEstimate = [1.23282,9.47E+08,1.97541,0.159046,7.04659,107.004,5.08E-03,1.16637,0.030043,0.000500094]
#InitialEstimate = [1.03165,1.26E+09,3.07858,0.0829399,7.49681,90.4321,2.53E-02,0.501498,0.0760908,0.011741]
#InitialEstimate = [1.26696,7.15E+08,3,0.276157,3.30653,31.9305,0.0176,0.599985,0.183982,0.00771674]
InitialEstimate = [1.3,8.64261e+08,2.6846,0.526035,8,57.9848,0.00285937,1.29105,0.272662,0.217672]

#InitialEstimate = [1.3,8.64261e+08,2.6846,0.526035,8,57.9848,0.00285937,1.29105,0.272662,0.217672]




#[1.5,1725710210,3.633813573,0.001,1,368.4883979,0.0546253,0.656233025,1.073721334,1.033901051]
 
#InitialEstimate = [1.26696,7.15E+08,3,0.276157,3.30653,31.9305,0.0176,0.599985,0.183982,0.00771674]
#InitialEstimate = [1.20361200000000, 679250000,	2.85000000000000,	0.262349150000000	,3.14120350000000,	  30.3339750000000,	0.0167200000000000,	0.569985750000000,	0.174782900000000	,0.00694506600000000]
#    kNetgrowth = p[0]  # /h: Net growth rate of bacterial
#    tvbmax = p[1]   # CFU/mL maximal possible size of the inoculum 
#    Kmax = p[2] # /h Maximum killing rate of the compound 
#    EC50k= p[3] # ug/mL EC50 of antibiotic killing without any adaptation  
#    gamma = p[4]  # dimensionless Hill Coefficient of killling
#    beta = p[5]  # dimensionless Maximum adaptation on EC50 
#    tau= p[6] # mL/h.ug rate of adaptation 
#    Alpha =p[7] #/h time rate at which the kill can reach maximum (mimicking delay) 
#    Kdeath = p[8] #/h death rate of the P population 
#    Ksr_max=p[9] #/h maximum transit rate between S and P (traditionally it was just a fraction of netgrowh but could be idependent)

times =Original_data  ['time']  # time_test
# values = Original_sampling['observation']
#values = [model.simulate(true_parameters, times, drug_conc_i) for drug_conc_i in drug_conc]
values = Original_data  ['observation']

# Add some noise
#values = [v + np.random.normal(0, 0.05*np.max(v), v.shape) for v in values]

# Create self defined score function
score = ScoreFunction(model, times, values, drug_conc, InitialCFU)

#boundaries =  pints.RectangularBoundaries([ 0.2, 1e8, 1, 0.05, 0.5, 0, 8e-5, 0.05, 0.1], [ 3, 2e9, 50, 16, 20, 100, 8, 1.2,1])
boundaries =  pints.RectangularBoundaries([ 0.2, 1e8, 1, 0, 0.5, 0, 8e-5, 0.05, 0, 0], [ 3, 9e9, 50, 16, 20, 1000, 8, 5,5, 5])

print('Score at initial estimate:')
print(score(InitialEstimate))

# Perform an optimization using SNES (see docs linked above). 
found_parameters, found_value = pints.optimise(score, InitialEstimate, boundaries=boundaries, method=pints.CMAES)
#found_parameters, found_value = pints.snes(score, boundaries=boundaries)

print('Found solution:          True parameters:' )
for k, x in enumerate(found_parameters):
    print(pints.strfloat(x) + '    ' + pints.strfloat(InitialEstimate[k]))

# In[21]:
#found_parameters=[2.035794806,1725710210,4.633813573,0.072284129,2.585008143,368.4883979,0.005206253,0.656233025,1.073721334,1.033901051]

    
test_parameters= [1.38375557050016,2794225113.36737,2.09852356518843,0.126806167534736,10.3180880641971,141.873870168736,0.00435788441810327,1.31661547537535,1.14864692366042,1.46994401124969]
# Plot the results
#plt.figure()
#plt.xlabel('time')
#plt.ylabel('population')
#for i in range(6):
#    plt.semilogy(times, values[i], 's', alpha=0.5, 
#             label='observ.; drug conc '+str(drug_conc[i]))
#    plt.semilogy(time_test, model.simulate(InitialEstimate, time_test, drug_conc[i],InitialCFU[i]), 
#             label='Starting; drug conc '+str(drug_conc[i]))
#plt.legend()
#plt.show()    
time_test = np.arange(0, 24, 0.1) #timeFinal #    
times =Original_data  ['time']  # time_test
# values = Original_sampling['observation']
#values = [model.simulate(true_parameters, times, drug_conc_i) for drug_conc_i in drug_conc]
values = Original_data  ['observation']  
# Plot the results
plt.figure()
plt.xlabel('time')
plt.ylabel('population')
for i in range(len(drug_conc)):
    plt.semilogy(times, values[i], 's', alpha=0.5, 
             label='observ.; drug conc '+str(drug_conc[i]))
    plt.semilogy(time_test, model.simulate(found_parameters, time_test, drug_conc[i],InitialCFU[i]), 
             label='fitted; drug conc '+str(drug_conc[i]))
    
#    plt.semilogy(time_test, model.simulate(test_parameters, time_test, drug_conc[i],InitialCFU[i]), 
#             label='fitted; drug conc '+str(drug_conc[i]))
plt.legend()
plt.show()

plt.figure()
plt.xlabel('value logCFU')
plt.ylabel('prediction logCFU')
for i in range(len(drug_conc)):
    #plt.semilogy(times, values[i], 's', alpha=0.5, 
    #         label='observ.; drug conc '+str(drug_conc[i]))
#    SimulatedValueTemp= model.simulate(found_parameters, times, drug_conc[i],InitialCFU[i])
    
#    plt.semilogy([0,18],[1e8,1e8])
#    plt.semilogy([18,18],[0,1e8])
#    plt.semilogy([0,18],[1e7,1e7])
#    plt.semilogy([18,18],[0,1e7])
    SimulatedValueTemp= model.simulate(found_parameters, times, drug_conc[i],InitialCFU[i])
    #plt.semilogy(time_test, SimulatedValueTemp, label='fitted; drug conc '+str(drug_conc[i]))
    plt.plot(np.log10(values[i]), np.log10(SimulatedValueTemp),  's',label='fitted; drug conc '+str(drug_conc[i]))
    #error= np.append(error, (SimulatedValueTemp-values[i]),axis=0)
    
   # errorlog10= np.append(errorlog10, (np.log10(SimulatedValueTemp)-np.log10(values[i])))

plt.plot([2,10],[2,10])
plt.legend()
plt.show()
    
    #%% MCMC simulation 

PDParameter_File_path='\\\\rbansis04\\pRED-COMFS-EMEA\\PKPD_MS\\wangk\\ProjectWork\\LipoProteinTrasportInhibitor\\PKPDSimulation\\MarchModel\\MCMC\\AdptationWithSandPFRO5431_01087_LogCFUGaussianNoise_Chain_0.csv'
with open (PDParameter_File_path) as f : 
    PDParameterWhole=pd.read_csv (f, sep=',')
    PDParameterWhole.head()
    f.close()
PDParameterWhole= PDParameterWhole.as_matrix()
PDParameterForSimu=PDParameterWhole[-500:-1,0:-1]

time_test = np.arange(0, 24, 0.1) #timeFinal #    
times =Original_data  ['time']  # time_test
values = Original_data  ['observation']  

#drug_conc_Test=[0, 0.5, 1, 2,4,8,16,32]
drug_conc_Test=[0,1.51E+00, 2.86E+00,5.83E+00,  1.10E+01, 2.13E+01, 4.11E+01	]

InitialCFU_Test=[2.38E+06, 4.38E+06, 3.25E+06,2.63E+06, 4.50E+06	, 2.75E+06,  5.13E+06]	


# Plot the results
colorlist=['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C0']

plt.figure()
plt.xlabel('Time (hr)')
plt.ylabel('CFU')
for i in range(len(drug_conc_Test)):
    
    for j in range(0,len(PDParameterForSimu)):
        PD_param=PDParameterForSimu[j,:] 
        plt.semilogy(time_test, model.simulate(PD_param, time_test, drug_conc[i],InitialCFU[i]), alpha=0.2,
                 color=colorlist[i])
    plt.semilogy(times, values[i], 's', color=colorlist[i], markersize=10)  
    
#plt.legend()
    
plt.ylim((10,10e9))
    
plt.xlim((0,25))  
plt.show()




    #%% Define loglikelihood 

class GuassianLogLikelihoodWithUnkonwNoise(pints.ProblemLogLikelihood):
    '''
    Define a tailored log-Likelihood for our problem.
    '''
    def __init__(self, model, times, values, simulate_param, InitialCondition):
        # Using sum of squares error for all values
        #
        # model: pints.ForwardModel
        # times: time series to simulate
        # values: multiple series that match model with simulate_param
        # simulate_param: parameters that correspond to each series in values
        # super(LogLikelihoodWithNoise, self).__init__()
        
        self._model = model
        self._dimension = self._model.dimension() + 1
        self._n_parameters = self._model.n_parameters() + 1
        self._times = times
        #print(str(len(values)))
        #print(str(len(simulate_param)))
        if len(values) == len(simulate_param):
            self._values = np.asarray(values)
            self._param = np.asarray(simulate_param)
            self._InitialCondition = np.asarray(InitialCondition)
        else:
            raise ValueError('Length of values must be the same as simulate_param')
        self._size = len(self._times)
        self._logn = 0.5 * self._size * np.log(2 * np.pi)

    def dimension(self):
        return self._dimension

    def __call__(self, x):
        # Note x[:-1] model parameters; x[-1] is noise.
        total = 0
        # go through all simulation parameter (drug concentration)
        for i in range(len(self._param)):
            # simulate the model
            sim_param=self._param[i]
            InitialCondition=self._InitialCondition[i]
            
            
            valuesSim = self._model.simulate(x, self._times, sim_param,InitialCondition)
            
            error = np.log10(valuesSim) - np.log10(self._values[i])
            #error = log10(valuesSim) - log10(self._values[i])
            # sum of square error for corresponding values
            total += self._logn + self._size * np.log(x[-1]) \
                    + np.sum(error**2) / (2 * x[-1]**2)
        return -1.0 * total
   
#%% MCMC  on synthesised Data 

#found_parameters=[1.26696,7.15E+08,3,0.276157,3.30653,31.9305,0.0176,0.599985,0.183982,0.00771674];
values = Original_data  ['observation']
values_synthesized=values

plt.figure()
plt.xlabel('time')
plt.ylabel('population')
for i in range(6):
   values_synthesized[i,:]= model.simulate(found_parameters, times, drug_conc[i],InitialCFU[i]) 

   plt.semilogy(times, model.simulate(found_parameters, times, drug_conc[i],InitialCFU[i]) , 's', alpha=0.5, 
             label='syn.; drug conc '+str(drug_conc[i]))
plt.legend()
values = Original_data  ['observation']
plt.figure()
plt.xlabel('time')
plt.ylabel('population')
for i in range(6):
   plt.semilogy(times, values[i], 's', alpha=0.5, 
         label='observ. ; drug conc '+str(drug_conc[i]))
plt.legend()
plt.show()
#%% MCMC  on Data 

#found_parameters=[1.26696,7.15E+08,3,0.276157,3.30653,31.9305,0.0176,0.599985,0.183982,0.00771674];
Noise_sigma=0.4
initialPoint=5000

log_likelihood = GuassianLogLikelihoodWithUnkonwNoise(model, times, values, drug_conc,InitialCFU)
# Starting point use optimised result
#found_parameters_noise = [np.array(list(found_parameters) + [Noise_sigma])]
found_parameters_noise = [np.array(found_parameters + [Noise_sigma])]
#for i in range(len(found_parameters_noise)):
#   found_parameters_noise[i] =  np.random.uniform(low=0.9, high=1.11, size=None)*found_parameters_noise[i] 
  
#log_prior = pints.UniformLogPrior([ 0.2, 1e8, 1, 0.05, 0.5, 0, 8e-5, 0.05, 0.1, 0.0005,0], [ 3, 2e9, 50, 16, 20, 100, 8, 1.2,1, 1,1])

log_prior = pints.UniformLogPrior([ 0.2, 1e8, 1, 0, 0.5, 0, 8e-5, 0.05, 0, 0,0], [ 3, 5e9, 50, 16, 20, 1000, 8, 5,5, 5,1])
#log_prior = pints.UniformLogPrior(np.array(found_parameters_noise[0]*0.5).tolist(),np.array(found_parameters_noise[0]*2).tolist())
log_posterior = pints.LogPosterior(log_likelihood, log_prior)

found_parameters_noise = np.array(list(found_parameters) + [Noise_sigma])

# Choose starting points for 3 mcmc chains
xs = [
    found_parameters_noise * 1,
    found_parameters_noise * 0.9,
    found_parameters_noise * 1.05,
    found_parameters_noise * 0.95,
    found_parameters_noise * 1.1,
]


#for i in range(len(xs)):
#    xs[i][-2]=found_parameters[-1]*0.95


# Create mcmc routine
mcmc = pints.MCMCSampling(log_posterior, len(xs), xs, method=pints.AdaptiveCovarianceMCMC)

# Add stopping criterion
mcmc.set_max_iterations(150000)

# Start adapting after 1000 iterations
mcmc.set_initial_phase_iterations(initialPoint)

mcmc.set_chain_filename('\\\\rbansis04\\pRED-COMFS-EMEA\\PKPD_MS\\wangk\\ProjectWork\\LipoProteinTrasportInhibitor\\PKPDSimulation\\MarchModel\\MCMC\\AdptationWithSandPFRO5431_01085_CompleteTK_LogCFUGaussianNoise_Chain.csv')
mcmc.set_log_pdf_filename('\\\\rbansis04\\pRED-COMFS-EMEA\\PKPD_MS\\wangk\\ProjectWork\\LipoProteinTrasportInhibitor\\PKPDSimulation\\MarchModel\\MCMC\\AdptationWithSandPRO5431_01085_CompleteTK_LogCFUGaussianNoise_PLogPDF.csv')

# Disable verbose mode
#mcmc.set_verbose(False)

# Run!
print('Running...')
chains = mcmc.run()
print('Done!')