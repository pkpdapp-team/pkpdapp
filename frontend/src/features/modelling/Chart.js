import React from "react";
import { useSelector } from 'react-redux'
import { selectBiomarkerDatasByDatasetIds } from '../datasets/biomarkerDatasSlice'

import { makeStyles } from '@material-ui/core/styles';

import { Scatter } from 'react-chartjs-2';

import { Chart, registerables, Interaction } from 'chart.js';
import { CrosshairPlugin, Interpolate } from 'chartjs-plugin-crosshair';
import {colors, shapes} from './ShapesAndColors'

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

  
  let colorIndex = 0;
  const incrementColorIndex = () => {
    colorIndex += 1;
    if (colorIndex >= colors.length) {
      colorIndex = 0;
    }
  }

  
  let pointStyleIndex = 0;
  const incrementPointStyleIndex = () => {
    pointStyleIndex += 1;
    if (pointStyleIndex >= shapes.length) {
      pointStyleIndex = 0;
    }
  }

  const datasetBiomarkers = useSelector((state) =>
    selectBiomarkerDatasByDatasetIds(
      state, datasets.map(d => d.id)
    )
  )

  const getChartData = (simulate) => Object.entries(simulate).map(([key, data]) => {
    if (key !== 'myokit.time') {
      const color = colors[colorIndex];
      incrementColorIndex()
      return {
        type: 'line',
        label: key,
        borderColor: color,
        backgroundColor: color,
        showLine: true,
        fill: false,
        lineTension: 0,
        interpolate: true,
        data: data.map((y, i) => ({x: simulate['myokit.time'][i], y: y}))
      }
    }
    return null
  }).filter(x => x);

  

  const getChartDataDataset = (dataset) => {
    const biomarkers = datasetBiomarkers[dataset.id];
    const savedColorIndex = colorIndex;

    // for each subject, we generate a dataset for each biomarker
    return dataset.subjects.map(subject => {
      const pointStyle = shapes[pointStyleIndex];
      incrementPointStyleIndex()
      colorIndex = savedColorIndex;
      if (!dataset.displayGroups.includes(subject.group)) {
        return null
      }
      return biomarkers
        .filter(biomarker => biomarker.display)
        .map(biomarker => {
          const filterBySubject = (y, i) => 
            biomarker.data.subjects[i] === subject.id_in_dataset;
          const times = biomarker.data.times.filter(filterBySubject)
          const values = biomarker.data.values.filter(filterBySubject)
          const color = colors[colorIndex];
          incrementColorIndex()
            
          if (values.length === 0) {
            return null
          }
          return {
            label: dataset.name + '.' + subject.id_in_dataset +  '.' + biomarker.name,
            pointStyle: pointStyle,
            borderColor: color,
            backgroundColor: color,
            data: values.map((y, i) => ({x: times[i], y: y}))
          }
        }).filter(x => x);
    }).filter(x => x);
  }

  const data = {
    datasets: [
      ...datasets.map(d => getChartDataDataset(d)).flat().flat(),
      ...pkModels.map(m => getChartData(m.simulate)).flat(),
      ...pdModels.map(m => getChartData(m.simulate)).flat(),
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
