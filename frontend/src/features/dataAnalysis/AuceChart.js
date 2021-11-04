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
        type: 'linear',
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
        filter: function(item, chart) {
          console.log('running filter', item.text)
          return !item.text.includes('noLabel');
        }
      },
      tooltip: {
        mode: 'interpolate',
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

  const optionsVsTime = {
    ...options,
    scales: {
      x: {
        type: 'linear',
        title: {
          text: 'Time ',
          display: true,
        }
      },
      y: {
        type: 'linear',
        position: 'left',
        title: {
          text: 'Data Variable',
          display: true,
        }
      },
    },
  }

  return (
    <div className={classes.root}>
      {renderChart &&
        <Scatter data={data} options={optionsVsTime}/>
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
      pointRadius: 0,
      fill: false,
      type: 'line',
      data: data,
    }
  })
  var i = 0
  for (const auce of auces) {
    const dataLower = auce.x ? 
      auce.x.map((x, i) => ({x: x, y: auce.y_lower[i]})) :
      [];
    const dataUpper= auce.x ? 
      auce.x.map((x, i) => ({x: x, y: auce.y_lower[i]})) :
      [];
    datasets.push({
      borderColor: getColor(i),
      backgroundColor: getColorBackground(i),
      type: 'line',
      pointRadius: 0,
      fill: false,
      label: auce.name + 'noLabel',
      data: dataLower,
    })
    datasets.push({
      borderColor: getColor(i),
      backgroundColor: getColorBackground(i),
      type: 'line',
      pointRadius: 0,
      fill: '-1', // fill to previous dataset
      label: auce.name + 'noLabel',
      data: dataUpper,
    })
    i += 1
  }

  const data = { datasets }

  const optionsVsConcentration = {
    ...options,
    scales: {
      x: {
        type: 'logarithmic',
        title: {
          text: 'Concentration',
          display: true,
        }
      },
      y: {
        type: 'logarithmic',
        position: 'left',
        title: {
          text: 'AUCE',
          display: true,
        }
      },
    },
  }

  return (
    <div className={classes.root}>
      {renderChart &&
        <Scatter data={data} options={optionsVsConcentration}/>
      }
    </div>
  )

}

