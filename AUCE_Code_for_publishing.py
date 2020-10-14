#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Tuesday Jun 18 16:11:17 2019

@author: ovacika
This File creates figures for each donor ID, Treatment and Readout from the excel file provided.
The data was provided in the following format 
Cell-line	ID	  Trt-Group	  Conc   	PD_Readout	Time	Obs
Tu1	      ID233    DrugA	      0.01	     LDH	         24	     11.176
The difference from CreateFigures_1.py is that DrugA, DrugA_3 and DrugA_4 (and etc) were plotted together
"""



import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import matplotlib as mpl
from sklearn.metrics import auc
from scipy.optimize import curve_fit
import xlsxwriter
mpl.rc('figure', max_open_warning = 0) ## this is to turn off an error for plotting  



def plotsObsOverTime(DrugName,ReadoutName,CellLineName,Data):
    # this functions plots the observatsions over time at ecach concentration
    # Figure name is Drug name + Readout + Cell line name, each concentraiton is plotted on the same Figure
    fig= plt.figure()
    Get_ConcandTime=Data.loc[DrugName,ReadoutName,CellLineName]
    Conc_Id=Get_ConcandTime.index.codes[0]
    my_List=[]
    for x in Conc_Id:
        my_List.append(x)
    my_List = list(set(my_List))         
    colors=['purple','blue','teal','green','yellow','orange','red','darkred','maroon']
    color_index=0
    for y in my_List:  
        Get_Conc=Get_ConcandTime.index.levels[0][y] 
        Final_Data=Get_ConcandTime.loc[Get_Conc]     
        label_name=str(Get_Conc)+' pM'
        Final_Data.plot( x='Time',y = 'Observation', label=label_name, kind='line',color='black',  marker='o',markerfacecolor=colors[color_index])
        color_index=color_index+1
    plt.xlabel('Time(hr)')
    plt.ylabel('Observation')
    fig_name=str(drug) + ' '+  Read + ' '+ cell 
    fig.suptitle(fig_name)
    plt.legend()
    plt.savefig('./Figures/'+'Over Time ' + fig_name +'.jpeg') 
    return Final_Data


def Sigmoidal_model(Concentration,Top,Bottom,EC50,):
    # this function simulates Emax-EC50 curve for a given concentration range
    return Bottom + Concentration*(Top-Bottom)/(EC50  + Concentration)


def Calculate_AUCs(Drug_id,Readout_id,Cellline_id,SeriesData):
   # this function calculates AUCs for a given experiment
   # the  inputs are the drug name , Readout name and cell line  name, dataset and the timepoints
   # the outputs are the AUC valuues at each concentration 
    AUC=[]
    Get_ConcandTime=SeriesData.loc[Drug_id,Readout_id,Cellline_id]

    Conc_Id=Get_ConcandTime.index.codes[0]
 
    Time_Id=Get_ConcandTime.index.codes[1]
            
    Time_List=[]
    for a in Time_Id:
        Time_List.append(a)
    Time_List=list(set(Time_List))  
    Time_newList=[]            
    for b in Time_List:
        Get_Time=Get_ConcandTime.index.levels[1][b] 
        Time_newList.append(Get_Time)    
    
    my_List=[]
    for x in Conc_Id:
         my_List.append(x)
    Conc_List=[]
    my_List = list(set(my_List))                   
    for y in my_List:  
        Get_Conc=Get_ConcandTime.index.levels[0][y] 
        Conc_List.append(Get_Conc)
        Final_Data=Get_ConcandTime.loc[Get_Conc]  
        Time_data=[]
        for a in range(len(Final_Data.index)):   
            Time_data.append(Final_Data.index[a])

        AUC.append(auc(Time_data,Final_Data.to_numpy()))
    return AUC,Conc_List


def AUCdata_toFit(AUC_data,Conc_List):
   # this function fit the concentration AUC data to Emax and EC50 model. 
   Dict={}
   List=[]
   init_guess = [max(AUC_data),min(AUC_data),1000]
   Fitted_params,covariates = curve_fit(Sigmoidal_model,Conc_List ,AUC_data, p0=init_guess)
   SE_perc = np.sqrt(np.diag(covariates))/Fitted_params
   SE_Top,SE_Bottom,SE_EC50=SE_perc      
   fit_Top,fit_Bottom,fit_EC50 = Fitted_params 
   dict_name= str(drug) + ' '+  Read + ' '+ cell
   Dict.update({dict_name :fit_EC50})
   List.append([drug,Read,cell,fit_EC50])
   return fit_Top,fit_Bottom,fit_EC50,SE_Top,SE_Bottom,SE_EC50

def Simulation_SigmoidalModel(Conc_List,T,B,EC):
   Simulation_Conc=np.linspace(min(Conc_List),max(Conc_List),1000)
   Stim_output=[]
   for x in Simulation_Conc:
        Stim_output.append(Sigmoidal_model(x,T,Bottom,EC))    
   return  Simulation_Conc,Stim_output   

def plotConcvsAUC(Sim_x,Sim_y,Data_x,Data_y,DrugName,Readout_name,CellLine_Name):
   fig = plt.figure()
   plt.semilogx(Sim_x,Sim_y,label="Sigmoidal Model Fit ",color='black')                       
   plt.semilogx(Data_x,Data_y,'o',label=str(drug) + ' '+  Read + ' '+ cell, color='black',  marker='o',markerfacecolor='red')
   plt.xlabel('Conc')
   plt.ylabel('Observation')
   fig_name=str(DrugName) + ' '+  Readout_name + ' '+ CellLine_Name # Figure name is ID + Readout + Treatment, each concentraiton is plotted on the same Figure
   fig.suptitle(fig_name)
   plt.legend()
   plt.savefig('./Figures/'+ fig_name +'.jpeg')    
   plt.close()
   return fig_name
 
def plotEC50OverTime(DrugName,ReadoutName,CellLineName,Data):
   Get_ConcandTime=Data.loc[drug,Read,cell]
   Time_Id=Get_ConcandTime.index.codes[0]
   Time_List=[]
   for a in Time_Id:
                Time_List.append(a)
   Time_List=list(set(Time_List))  
   Time_newList=[]            
   for b in Time_List:
                Get_Time=Get_ConcandTime.index.levels[0][b] 
                Time_newList.append(Get_Time)
   EC_50_list=[]
   for time in Time_newList:
                Data_toappend=[]
                Conc_list=[]
                for l in range(len(Get_ConcandTime.index.values)):
                    if  Get_ConcandTime.index.values[l][0]==time:
                        Data_toappend.append(Get_ConcandTime.loc[time][Get_ConcandTime.index.values[l][1]])
                        Conc_list.append(Get_ConcandTime.index.values[l][1])
                init_guess = [max(Data_toappend),min(Data_toappend),1000]
                fit = curve_fit(Sigmoidal_model,Conc_list ,Data_toappend, p0=init_guess, maxfev = 1000)
                Fitted_params,covariates=fit
                print(covariates)
                fit_Top,fit_Bottom,fit_EC50 = Fitted_params
                EC_50_list.append(fit_EC50)
   Fig2=plt.figure()
   fig2_name=str(drug)+' '+Read+ ' '+cell # Figure name is Readout +, each concentraiton is plotted on the same Figure
   Fig2.suptitle(fig2_name)
   color_name=['limegreen','darkgreen','blue','darkblue']
   Str_time=[]
   for t in Time_newList:
              Str_time.append(str(t))              
   if drug == 1 and cell=='LowExpr':
              plt.bar(Str_time,EC_50_list,color=color_name[0])  
   if drug== 2 and cell=='LowExpr':
              plt.bar(Str_time,EC_50_list,color=color_name[1])   
   if drug== 1 and cell=='HighExpr':
              plt.bar(Str_time,EC_50_list,color=color_name[2])   
   if drug== 2  and cell=='HighExpr':
              plt.bar(Str_time,EC_50_list,color=color_name[3])  
   plt.xlabel('(hr)')
   plt.ylabel('EC50 (pM)')
   plt.savefig('./Figures/'+'BarChart over time'+ fig2_name +'.jpeg') 

      
def File_write(Filename,FigureName,T,B,EC,err_T,err_B,err_EC50): 
      Filename.write(FigureName+"\t"+ str(round(T))+"\t" + str(round(err_T,2))+"\t" + str(round(B)) +"\t"+str(round(err_B,2))+"\t" + str(round(EC))+ "\t"+str(round(err_EC50,2))+"\t" + '\n' )   
      



# In[Initialization] :
## the code starts here
      
      
File= open('Sigmoidal Model Parameters.txt','w') ## This line creates a text file and write the below line on top of the txt line
File.write('Figure name '+"\t"+'Top'+ "\t" +'Top SE %' +"\t" + 'Bottom' +"\t"+ 'Bottom SE %' +"\t" 'EC50' +"\t" +'EC50 SE %' + '\n' )
Data_read = pd.read_excel('TCB dynamic PKPD.xlsx', sheet_name='Sheet1')  ##This line uploads excelDataFile to DataFrame
df_Drug=Data_read['Drug'] 
Drug_Ids=df_Drug.unique(); # unique Drug Ids
df_CellLine=Data_read['CellLine']
CellLine=df_CellLine.unique(); # unique Cell Lone descriptions
df_PD_Readout=Data_read['Readout']
Readouts=df_PD_Readout.unique(); # unique Readouts - cell killing or cytokines
Groupd_ser_data=Data_read.groupby(['Drug','Readout','CellLine','Conc','Time']).Obs.mean() # this transforms dataframe to a series


# In[Initialization] :

#This loop creates 
# 1-) Oberservation over time at each concentration figures
# 2-) a txt file with EMax-EC50 model parameters and associated SE % 
# 3-) figures for each model fit
# 4-) a txt file with simulations for each model fit

Dict_f={}
List_f=[]

workbook=xlsxwriter.Workbook('simulations.xlsx')
for drug in Drug_Ids: #for each unique ID
    for cell in CellLine: 
      for Read in Readouts:  #for each unique REadout
            Mero=plotsObsOverTime(drug,Read,cell,Groupd_ser_data)   
            AUC_f=[]          
            AUC_f,Conc_List_f=Calculate_AUCs(drug,Read,cell,Groupd_ser_data)           
            Top,Bottom,EC50,err_Top,err_Bottom,err_EC50= AUCdata_toFit(AUC_f,Conc_List_f)             
            List_f.append([drug,Read,cell,EC50])            
            Sim_C_f,Simulation_f=Simulation_SigmoidalModel(Conc_List_f,Top,Bottom,EC50)         
            Fig_name=plotConcvsAUC(Sim_C_f,Simulation_f,Conc_List_f, AUC_f,drug,Read,cell)           
            File_write(File,Fig_name,Top,Bottom,EC50,err_Top,err_Bottom,err_EC50)  
            Report_Sheet= workbook.add_worksheet(Fig_name)            
            for row_ind, row_value in enumerate(zip(Sim_C_f,Simulation_f)):
                for col_ind, col_value in enumerate(row_value):
                    Report_Sheet.write(row_ind + 1, col_ind, col_value)
            Report_Sheet.write(0, 0, 'Concentration pM')
            Report_Sheet.write(0, 1, 'Observations')
File.close()           
workbook.close()

# In[Initialization] :


EC50_data = pd.DataFrame(List_f,columns = ['Drug' , 'Readout', 'CellLine','EC50']) 
New_EC50_data=EC50_data.groupby(['Drug','Readout','CellLine']).EC50.mean()

#This loop creates bar charts  of EC50 for each readout across drugs and expression levels
for Read in Readouts:
    Fig2=plt.figure()
    dat=[]
    str_dat=[]
    for drug in Drug_Ids: 
        for cell in CellLine:
            dat.append(New_EC50_data.loc[drug][Read][cell])
            str_dat.append(str(drug)+' '+cell)
    plt.bar(str_dat,dat,color=['limegreen','darkgreen','blue','darkblue']) 
    plt.xlabel(' Drug and Cell line')
    plt.ylabel('EC50 (pM)')
    fig2_name=Read # Figure name is Readout +, each concentraiton is plotted on the same Figure
    Fig2.suptitle(fig2_name)
    plt.savefig('./Figures/'+ 'BarCharts ' + fig2_name +'.jpeg')    


# In[Initialization] :


Groupd_ser_data2=Data_read.groupby(['Drug','Readout','CellLine','Time','Conc']).Obs.mean() # this transforms dataframe to a series
    
for drug in Drug_Ids: #for each unique ID
    for Read in Readouts:   #for each unique REadout
        for cell in CellLine: 
            
           plotEC50OverTime(drug,Read,cell,Groupd_ser_data2)

