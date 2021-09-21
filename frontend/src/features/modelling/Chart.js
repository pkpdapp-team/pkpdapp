import React from "react";
import { useSelector } from 'react-redux'
import { selectAllBiomarkerTypes } from '../datasets/biomarkerTypesSlice'
import { selectAllSubjects } from '../datasets/subjectsSlice'
import { selectAllVariables } from '../variables/variablesSlice'

import { makeStyles } from '@material-ui/core/styles';

import { Scatter } from 'react-chartjs-2';

import { Chart, registerables, Interaction } from 'chart.js';
import { CrosshairPlugin, Interpolate } from 'chartjs-plugin-crosshair';
import {getColor, getShape} from './ShapesAndColors'

Chart.register(...registerables, CrosshairPlugin);
Interaction.modes.interpolate = Interpolate;



const useStyles = makeStyles((theme) => ({
  root: {
    height: '85vh',
    width: '100%',
  },
}));


export default function ModellingChart({datasets, pkModels, pdModels}) {
  let renderChart = true;
  const classes = useStyles();
  
  console.log('chart re-render', pdModels)

  const biomarkers = useSelector((state) => state.biomarkerTypes.entities)
  const subjects = useSelector((state) => state.subjects.entities)
  const variables = useSelector((state) => state.variables.entities)

  const getChartData = (model) => {
    const time_id = variables.filter(v => v.name === 'time')[0].id
    return Object.entries(model.simulate).map(([variable_id, data]) => {
      const variable = variables[variable_id]
      const color = getColor(variable.color)
      return {
        type: 'line',
        label: variable.name,
        borderColor: color,
        backgroundColor: color,
        showLine: true,
        fill: false,
        lineTension: 0,
        interpolate: true,
        data: data.map((y, i) => ({x: model.simulate[time_id][i], y: y}))
      }
    }).filter(x => x);
  }
  console.log('biomarkers', biomarkers)

  const getChartDataDataset = (dataset) => {
    return dataset.biomarker_types
      .map(id => {
        const biomarker = biomarkers[id]
        console.log('rendering d=',dataset.id,'bt=',id, biomarker)
        const times = biomarker.data.times
        const values = biomarker.data.values
        const color = getColor(biomarker.color);
        const pointStyle = biomarker.data.subjects.map(
          id => getShape(subjects[id].shape)
        )
        if (!biomarker.display) {
          return null
        }
        if (values.length === 0) {
          return null
        }
        return {
          label: dataset.name + '.' + biomarker.name,
          pointStyle: pointStyle,
          borderColor: color,
          backgroundColor: color,
          data: values.map((y, i) => ({x: times[i], y: y}))
        }
    }).filter(x => x);
  }

  const data = {
    datasets: [
      ...datasets.map(d => getChartDataDataset(d)).flat().flat(),
      ...pkModels.map(m => getChartData(m)).flat(),
      ...pdModels.map(m => getChartData(m)).flat(),
    ]
  }
  console.log('chart data', data)

  const options = {
    animation: {
        duration: 0
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear'
      }
    },
    plugins: {
      legend: {
        labels: {
          usePointStyle: true,
        },
      },
      tooltip: {
        mode: 'interpolate',
        intersect: false,
        callbacks: {
          title: function(a, d) {
            return a[0].element.x.toPrecision(4);
          },
          label: function(d) {
            return (
              d.dataset.label + ": " + d.element.y.toPrecision(4)
            );
          }
        }
      },
      crosshair: {
        sync: {
          enabled: false
        }
      }
    }
  }

  return (
    <div className={classes.root}>
      {renderChart &&
        <Scatter data={data} options={options}/>
      }
    </div>
  )
 
}
