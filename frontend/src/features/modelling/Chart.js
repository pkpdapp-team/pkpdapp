import React from "react";
import { useSelector } from 'react-redux'

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

  const biomarkers = useSelector((state) => state.biomarkerTypes.entities)
  const subjects = useSelector((state) => state.subjects.entities)
  const variables = useSelector((state) => state.variables.entities)

  const getChartData = (model) => {
    const have_all_variables = Object.keys(model.simulate)
      .filter(id => id in variables).length === Object.keys(model.simulate).length 
    if (!have_all_variables) {
      return {}
    }
    const time_id = Object.keys(model.simulate)
      .filter(id => variables[id].name === 'time')[0]

    return Object.entries(model.simulate).map(([variable_id, data]) => {
      const variable = variables[variable_id]
      const color = getColor(variable.color)
      if (!variable.display) {
        return null;
      }
      const yAxisID = variable.axis ? 'yRhs' : 'yLhs'
      return {
        yAxisID: yAxisID,
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

  const getChartDataDataset = (dataset) => {
    return dataset.biomarker_types
      .map(id => {
        const biomarker = biomarkers[id]
        const subjectsDisplay = biomarker.data.subjects.map(
          id => subjects[id].display
        )
        const subjectsDisplayFilter = (_, i) => subjectsDisplay[i]
        const times = biomarker.data.times.filter(subjectsDisplayFilter)
        const values = biomarker.data.values.filter(subjectsDisplayFilter)
        const color = getColor(biomarker.color);
        const pointStyle = biomarker.data.subjects
          .filter(subjectsDisplayFilter).map(
            id => getShape(subjects[id].shape)
          )
        if (!biomarker.display) {
          return null
        }
        if (values.length === 0) {
          return null
        }
        const yAxisID = biomarker.axis ? 'yRhs' : 'yLhs'
        return {
          yAxisID: yAxisID,
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

  const options = {
    animation: {
        duration: 0
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear',
        title: {
          text: 'Time (units defined in detail panels)',
          display: true,
        }
      },
      yLhs: {
        position: 'left',
        title: {
          text: 'Data Variable / Model Output (units defined in detail panels)',
          display: true,
        }
      },
      yRhs: {
        position: 'right',
        title: {
          text: 'Data Variable / Model Output (units defined in detail panels)',
          display: true,
        }
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
