import React from "react";
import { useSelector } from 'react-redux'

import { makeStyles } from '@material-ui/core/styles';

import { Scatter } from 'react-chartjs-2';

import { Chart, registerables, Interaction } from 'chart.js';

import {getColor, getColorBackground} from '../modelling/ShapesAndColors'

const useStyles = makeStyles((theme) => ({
  root: {
    height: '70vh',
    width: '100%',
  },
}));

let options = {
    animation: {
        duration: 0
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear',
        title: {
          text: 'Time ',
          display: true,
        }
      },
      y: {
        position: 'left',
        title: {
          text: 'Data Variable / Model Output (units defined in detail panels)',
          display: true,
        }
      },
    },
    plugins: {
      legend: {
        labels: {
          usePointStyle: true,
        },
      },
      tooltip: {
        mode: 'interpolate',
        callbacks: {
          label: function(context) {
            const tooltipText = context.dataset.tooltipText
            if (tooltipText) {
              return tooltipText
            }
            return `(${context.parsed.x}, ${context.parsed.y})`
          }
        },
      },
    }
  }


export function AuceChartDataVsTime({auces, biomarker_type}) {
  const classes = useStyles();
  const renderChart = true;

  const datasets = auces.map((auce, i) => {
    const subjectsDisplay = biomarker_type.data.subjects.map(
      id => auce.subject_ids.includes(id)
    )
    const subjectsDisplayFilter = (_, i) => subjectsDisplay[i]
    const times = biomarker_type.data.times.filter(subjectsDisplayFilter)
    const values = biomarker_type.data.values.filter(subjectsDisplayFilter)
    return {
      borderColor: getColor(i),
      backgroundColor: getColorBackground(i),
      label: auce.name,
      data: values.map((y, i) => ({x: times[i], y: y})),
    }
  })

  const data = { datasets }

  return (
    <div className={classes.root}>
      {renderChart &&
        <Scatter data={data} options={options}/>
      }
    </div>
  )

}

export function AuceChartFitsVsConcentration({auces, biomarker_type}) {
  const classes = useStyles();
  const renderChart = true;

  let datasets = auces.map((auce, i) => {
    console.log('doing auce', auce)
    const data = auce.x ? 
      auce.x.map((x, i) => ({x: x, y: auce.y[i]})) :
      [];
    return {
      borderColor: getColor(i),
      backgroundColor: getColorBackground(i),
      label: auce.name,
      data: data,
    }
  }).concat(auces.map((auce, i) => {
    const data = auce.x ? 
      auce.x.map((x, i) => ({x: x, y: auce.y_upper[i]})) :
      [];
    return {
      borderColor: getColor(i),
      backgroundColor: getColorBackground(i),
      label: auce.name,
      data: data,
    }
  })).concat(auces.map((auce, i) => {
    const data = auce.x ? 
      auce.x.map((x, i) => ({x: x, y: auce.y_lower[i]})) :
      [];
    return {
      borderColor: getColor(i),
      backgroundColor: getColorBackground(i),
      label: auce.name,
      data: data,
    }
  }))
  const data = { datasets }

  return (
    <div className={classes.root}>
      {renderChart &&
        <Scatter data={data} options={options}/>
      }
    </div>
  )

}

