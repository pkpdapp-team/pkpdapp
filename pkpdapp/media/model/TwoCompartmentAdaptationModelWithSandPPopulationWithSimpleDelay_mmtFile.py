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
import myokit
import pandas as pd

# In[Initialization] :
"""
Call model from myokit 

"""

#m = myokit.load_model('./ThreeCompartment_UnsymetricalDistribution_OralSCModel.mmt') #path for the model file 
m = myokit.load_model('./AdpativeModelWithTwoCompartmentLinearPK.mmt') #path for the model file 
p = myokit.load_protocol('./protocol_TID.mmt')#path for the protocol file(e.g. dose regimen)

ref = myokit.Simulation(m, p) #set up myokit model: input model and protocol 
save_state = ref.state()  #save the original initial state 
#doseLevel_mgPerKg = np.array([10,20,40,60]) # all BID 5431 dose for lung DFS
#doseLevel_mgPerKg = np.array([5,10,20,30]) # all QID 5431 dose for lung DFS #np.array([5,10,20,30,60]) # 5431 QID for 935
#doseLevel_mgPerKg = np.array([20,40]) # all SID 5431 dose for lung DFS
#doseLevel_mgPerKg = np.array([2.5,5,10,15,45]) # all q3hr 8x 5431 dose for lung DFS
#doseLevel_mgPerKg = np.array([0,3,10,20,30,45,60,90]) # all q3hr 8x 5431 dose for lung DRS
doseLevel_mgPerKg = np.array([0,10,30,90]) # POC Lung

#doseLevel_mgPerKg = np.array([0])
#InitialCFU =[3.96E+06,3.96E+06,3.96E+06,3.96E+06,3.96E+06] #inital CFU for 5431 00445 lung DFS

#InitialCFU =[6.00E+07,6.00E+07,6.00E+07,6.00E+07,6.00E+07,6.00E+07,6.00E+07,6.00E+07] #inital CFU for 5431 01085 lung DRS
#InitialCFU =[3.07E+07,3.07E+07,3.07E+07,3.07E+07,3.07E+07,3.07E+07,3.07E+07,3.07E+07] #inital CFU for 5431 01087 lung DRS
#InitialCFU =[3.77E+07,3.77E+07,3.77E+07,3.77E+07,3.77E+07,3.77E+07,3.77E+07,3.77E+07] #inital CFU for 5431 01073 lung DRS


#InitialCFU =[4.80E+06,4.80E+06,4.80E+06,4.80E+06,4.80E+06]#inital CFU for 5431 00535 lung DFS
#InitialCFU =[1.29E+07,1.29E+07,1.29E+07,1.29E+07,1.29E+07]#inital CFU for 5431 00935 lung DFS

#InitialCFU =[1.29E+07,1.29E+07,1.29E+07,1.29E+07,1.29E+07]#inital CFU for 5431 00935 lung DFS
#InitialCFU =[1.16E+07,1.16E+07,1.16E+07,1.16E+07,1.16E+07]#inital CFU for 7443416 00935 lung DFS
InitialCFU =[2.57E+06,2.57E+06,2.57E+06,2.57E+06,2.57E+06]#inital CFU for 7443416 00535 lung DFS

#InitialCFU =[9.65E+06]#inital CFU for 5431 lung DRS

mice_weight = 0.026
doseLevel_ng = doseLevel_mgPerKg*mice_weight*1e6
event_duration = p.events()[0].duration() # Extract duration of the dosing event from the protocol
DoseLevel = doseLevel_ng / event_duration
PK_parameters = [5.68273,7.07734,6.82514,0.762044,4.22779]
#PD_parameters =[1.10184,1.76E+09,2.60118,0.106947,4.16813,80.6628,0.0209511,0.679452,0.333418,1.84568] #00445 TK lung best fit 

#PD_parameters =[2.01465,1.36E+09,3.61E+00,0.436112,2.34549,42.7164,0.00436842,1.0044,2.00004,0.000565172] #00535 TK
#PD_parameters =[1.845816,2.50E+09,3.852118,0.4648,2.277174,47.09966,0.004556,0.820474,2.586108,0.978326]#00535 TK MCMC mean 
#PD_parameters=[1.30386,1.15E+09,3.36301,0.413567,3.37522,36.4649,7.19E-03,0.490801,0.0367193,0.0010644] #01807 TK
#PD_parameters=[1.99233,2.62E+08,4.82714,5.59E-01,5.17E+00,7.51E+01,2.52E-03,5.74E-01,3.20E-01,1.67E-01]#01805 TK
#PD_parameters=[1.46332,1.37E+09,3.42306,0.41493,3.8596,28.6489,0.010703,0.747824,0.182372,0.038294]#01073 TK

#PD_parameters =[1.26696,715000000,3,0.276157,3.30653,31.9305,0.0176,0.599985,0.183982,0.00771674]#00935 TK
#PD_parameters =[2.22088,1.00E+09,3.14338,0.235812,2.69563,50.3545,0.00789054,3.03893,0.348177,3.05454]#00935 TK 7443416\
#PD_parameters =[2.31653,1.00E+09,3.21689,0.533611,3.88652,44.0737,0.00231843,3.14621,0.333315,2.77994]#00935 TK 7443416\
#PD_parameters =[2.23E+00,3.01E+09,3.50E+00,1.97E-01,6.,93E+00,1.04E+01,6.36E-02,1.47E+00,3.37E-01,4.83E+00]#00445 TK 7443416\
PD_parameters =[1.90203,2.30E+09,3.00439,0.430394,18.0686,9.75967,0.0304804,1.68333,0.315546,3.30517]#0535 TK 7443416\
#PD_parameters =[3.49169,1.00E+09,22.7206,0.262111,3.32492,32.1358,0.0316485,0.196845,0.384712,1.11212]#0535 TK 7443416\



#PD_parameters =[2.22088,1.00E+09,3.14338,0.235812,2.69563,50.3545,0.00789054,3.03893,0.183982,0.00771674]#00935 TK 7443416

#PD_parameters =[1.76553811301497,	588831154.868378,	3,	0.266687543649647	,4,	33.6282835646004,	0.0172568605866814,	0.673444258291604	,0.229815252327256,	0.0186854409462930]

#P1 = m.get('PDCompartment.P1')
#P1.state_value()
#P1.set_state_value(1000000)
#m.state ()



#%% # Define solving 

class MyokitModel(pints.ForwardModel):
    def __init__(self):
        m = myokit.load_model('./AdpativeModelWithTwoCompartmentLinearPK.mmt') #path for the model file 
        p = myokit.load_protocol('./protocol_TID.mmt')#path for the protocol file(e.g. dose regimen)
        
        self.simulation = myokit.Simulation(m, p) #define simulation (i.e. run the model via myokit)
        
    def n_parameters(self):
        return 10 # number of parameters to Fit
    
    def n_outputs(self):
        return len(DoseLevel) 
    
    def simulate(self, PK_parameters,PD_parameters,times):
        total_CFU = []
        Drug_Central = []
        
        self.simulation.set_state(save_state)
        self.simulation.reset() 
        P1 = m.get('PDCompartment.P1')
        self.simulation.set_time(0)
        self.simulation.set_constant('doseCompart.Ka', PK_parameters[0]) # define parameter 
        self.simulation.set_constant('PKCompartment.fu', 0.019) # define parameter
        self.simulation.set_constant('PKCompartment.CL', PK_parameters[1]) # define parameter 
        self.simulation.set_constant('PKCompartment.Vc', PK_parameters[2]) # define parameter 
        self.simulation.set_constant('PKCompartment.Qp1', PK_parameters[3]) # define parameter         
        self.simulation.set_constant('PKCompartment.Vp1', PK_parameters[4]) # define parameter 
                #self.simulation.set_constant('PDCompartment.KNetgrowth', 0.25) # define parameter lung 1073
        #self.simulation.set_constant('PDCompartment.KNetgrowth', 0.277) # define parameter lung 1085
        #self.simulation.set_constant('PDCompartment.KNetgrowth', 0.277) # define parameter lung 1087
        self.simulation.set_constant('PDCompartment.KNetgrowth', 0.22) # define parameter lung 935 RO7443416
        #self.simulation.set_constant('PDCompartment.KNetgrowth', 0.25) # define parameter lung 935 RO7443416
        #self.simulation.set_constant('PDCompartment.KNetgrowth', 0.277) # define parameter lung 445
        #self.simulation.set_constant('PDCompartment.KNetgrowth', 0.83) # define parameter thigh 445
        #self.simulation.set_constant('PDCompartment.tvbmax', PD_parameters[1]) # define parameter 
        #self.simulation.set_constant('PDCompartment.tvbmax', 1.5e9) # define parameter thigh 445
        #self.simulation.set_constant('PDCompartment.tvbmax',4e8) # define parameter lung 1087
        #self.simulation.set_constant('PDCompartment.tvbmax',2e9) # define parameter lung 935 RO7443416
        #self.simulation.set_constant('PDCompartment.tvbmax',2.5e9) # define parameter lung 935 RO7443416
        #self.simulation.set_constant('PDCompartment.tvbmax',6.05e9) # define parameter lung 1085
        #self.simulation.set_constant('PDCompartment.tvbmax',2.3e9) # define parameter lung 1073
        self.simulation.set_constant('PDCompartment.tvbmax',1.3e8) # define parameter lung 535
        self.simulation.set_constant('PDCompartment.Kmax', PD_parameters[2]) # define parameter 
        #self.simulation.set_constant('PDCompartment.Kmax', PD_parameters[2]/PD_parameters[0]*0.277) # define parameter 
        self.simulation.set_constant('PDCompartment.EC50k', PD_parameters[3]) # define parameter         
        self.simulation.set_constant('PDCompartment.gamma', PD_parameters[4]) # define parameter 
        self.simulation.set_constant('PDCompartment.beta', PD_parameters[5]) # define parameter 
        self.simulation.set_constant('PDCompartment.tau', PD_parameters[6]) # define parameter/1.3
        self.simulation.set_constant('PDCompartment.Alpha', PD_parameters[7]) # define parameter         
        self.simulation.set_constant('PDCompartment.Kdeath', PD_parameters[8]) # define parameter 
        self.simulation.set_constant('PDCompartment.Ksr_max', PD_parameters[9]) # define parameter 
        
          
        # simulating multiple dose levels
        PD_var_to_log = 'PDCompartment.Total_Bacterial'
        PK_var_to_log = 'PKCompartment.Drug_Concentration_Central'
        
        DoseAmounts=DoseLevel # Define dose level, can move this line to the initialization part 
        for i in range(len(DoseAmounts)):
            self.simulation.reset() 
            P1.set_state_value(InitialCFU[i])
            updated_state = m.state()
            self.simulation.set_state(updated_state)
            self.simulation.set_constant('dose.doseAmount', float(DoseAmounts[i]))
            Output = self.simulation.run(times[-1]+1, log_times = times)
            
            total_CFU.append(Output[PD_var_to_log]) 
            Drug_Central.append(Output[PK_var_to_log])       
                
        return  np.array(Drug_Central).T, np.array(total_CFU).T
        
AdaptiveModel = MyokitModel()


colorlist=['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C0']


#%% # run a test simulation
times_Simulation = np.arange(0, 24, 0.5)
Plasma_PK, CFU=AdaptiveModel.simulate(PK_parameters,PD_parameters, times_Simulation)

# Plot the result
fig = plt.figure()
ax = fig.add_subplot(1, 1, 1)
for i, trace in enumerate(Plasma_PK.T):
    plt.plot(times_Simulation, trace, color=colorlist[i],label='Simulation--Dose:' + str(doseLevel_mgPerKg[i])+ ' mg/kg')
ax.set_yscale('log')
plt.legend()
plt.xlabel('time (hr)')
plt.ylabel('plasma concentration (ng/mL)')
plt.show()

fig = plt.figure()
ax = fig.add_subplot(1, 1, 1)  
LogCFU_24hr=np.empty ((len(doseLevel_mgPerKg),0)) 
for j, trace in enumerate(CFU.T):
    plt.plot(times_Simulation, np.log10(trace),color=colorlist[j], label='Simulation--Dose:' + str(doseLevel_mgPerKg[j])+ ' mg/kg')
    LogCFU_24hr=np.append(LogCFU_24hr,np.log10(trace)[-1])
#ax.set_yscale('log')
plt.legend()
plt.xlabel('time (hr)')
plt.ylabel('CFU')
plt.ylim (2,10)
plt.show()


#%% MCMC simulation 

#PDParameter_File_path='\\\\rbansis04\\pRED-COMFS-EMEA\\PKPD_MS\\wangk\\ProjectWork\\LipoProteinTrasportInhibitor\\PKPDSimulation\\MarchModel\\MCMC\\AdptationWithSandPFRO5431_0535_LogCFUGaussianNoise_Chain_0.csv'
PDParameter_File_path='\\\\rbansis04\\pRED-COMFS-EMEA\\PKPD_MS\\wangk\\ProjectWork\\LipoProteinTrasportInhibitor\\PKPDSimulation\\MarchModel\\MCMC\\AdptationWithSandPFRO5431_01087_LogCFUGaussianNoise_Chain_0.csv'
NumberMCMC=2000
with open (PDParameter_File_path) as f : 
    PDParameterWhole=pd.read_csv (f, sep=',')
    PDParameterWhole.head()
    f.close()
PDParameterWhole= PDParameterWhole.as_matrix()
#PDParameterForSimu=PDParameterWhole[-NumberMCMC:-1,0:-1] if noise saved in MCMC
PDParameterForSimu=PDParameterWhole[-NumberMCMC:-1,:]
times_Simulation_test = np.arange(0, 24, 0.5) #timeFinal #    

# Plot the results
colorlist=['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C0']



LogCFU_24hr=np.empty ((len(doseLevel_mgPerKg),0)) 
Dose_array=np.empty ((len(doseLevel_mgPerKg),0)) 
#DailyDose_array=np.empty ((len(doseLevel_mgPerKg,0))) 
for j in range(0,len(PDParameterForSimu)):
    #LogCFU_24hr=[]
    PD_parameters=PDParameterForSimu[j,:] 
    Plasma_PK, CFU =AdaptiveModel.simulate(PK_parameters,PD_parameters, times_Simulation)
    test=np.log10(CFU[-1])    
    LogCFU_24hr=np.append(LogCFU_24hr, test)
    Dose_array= np.append(Dose_array,doseLevel_mgPerKg)
   

DailyDose_array=Dose_array*3
df= {'LogCFU 24 hr':list(LogCFU_24hr),'Dose':list(Dose_array),'DailyDose':list(DailyDose_array)}
#df= {'24LogCFU':[1,2,3,4,5],'Dose':[1,2,3,4,5],'DailyDose':[1,2,3,4,5]}
#df= {'LogCFU 24 hr':[8.38941,7.57459,5.88021,4.61774,2.17281,8.26444,7.29496,5.77249,4.72644,7.69599,6.54683,8.38461,7.51539,5.66664,4.30618,1.55442],'Dose':[5,10,20,30,60,10,20,40,60,20,40,2.5,5,10,15,45],'DailyDose':[20,40,80,120,240,20,40,80,120,20,40,20,40,80,120,360]}

Table_TID=pd.DataFrame(df)




    
#%%  
#Table_DFS=pd.concat([Table_Controal,Table_SID,Table_BID,Table_QID,Table_Q3hr8x])

#df_={'LogCFU 24 hr':[7.21543,5.45101,3.53348,2.60516,1.43732,7.25135,5.7723,4.01845,2.96696,6.97509,5.71087,4.25706,3.36799,6.12607,4.97267],'Dose':[2.5,5,10,15,45,5,10,20,30,10,20,40,60,20,40],'DailyDose':[20,40,80,120,360,20,40,80,120,20,40,80,120,20,40]}
#Table_DFS=pd.DataFrame(df)
#dataDRS= pd.read_csv('\\\\rbansis04\\pRED-COMFS-EMEA\\PKPD_MS\\wangk\\ProjectWork\\LipoProteinTrasportInhibitor\\PKPDSimulation\\MarchModel\\PKPDCombined\\DRSData_5431_01087.csv')

fig, ax= plt.subplots()
import seaborn as sns
#ns.violinplot(x="DailyDose", y="LogCFU 24 hr",hue="Dose",hue_order= [60,45,40,30,20,15,10,5,2.5,0], data=Table_TID, Palette="muted")    
sns.violinplot(x="DailyDose", y="LogCFU 24 hr",hue="Dose",hue_order= [0,3,10,20,30,45,60,90], data=Table_TID, Palette="muted")   
sns.swarmplot(x="DailyDose", y="LogCFU 24 hr",data=dataDRS)  
#sns.plt.plot(6.5,'r-', linewidth=4)   
plt.ylim (1.5,10)
plt.show() 
#ax=sns.violinplot(LogCFU_24hr)

dataDRS= pd.read_csv('\\\\rbansis04\\pRED-COMFS-EMEA\\PKPD_MS\\wangk\\ProjectWork\\LipoProteinTrasportInhibitor\\PKPDSimulation\\MarchModel\\PKPDCombined\\DRSData_5431_01087.csv')

