import React from "react";
import { useSelector } from 'react-redux'
import { selectBiomarkerDatasByDatasetIds } from '../datasets/biomarkerDatasSlice'

import ColorScheme from 'color-scheme'

import { Scatter } from 'react-chartjs-2';

import { Chart, registerables, Interaction } from 'chart.js';
import { CrosshairPlugin, Interpolate } from 'chartjs-plugin-crosshair';
Chart.register(...registerables, CrosshairPlugin);
Interaction.modes.interpolate = Interpolate;

// https://stackoverflow.com/questions/21646738/convert-hex-to-rgba
function hexToRGB(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);

    if (alpha) {
        return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
    } else {
        return "rgb(" + r + ", " + g + ", " + b + ")";
    }
}

export default function ModellingChart({datasets, pkModels, pdModels}) {
  let renderChart = true;

  var scheme = new ColorScheme();
  scheme.from_hue(21)         
        .scheme('tetrade')   
        .variation('hard');

  const colors = scheme.colors().map(hexToRGB);
  let colorIndex = 0;
  const incrementColorIndex = () => {
    colorIndex += 1;
    if (colorIndex >= colors.length) {
      colorIndex = 0;
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
    console.log('for dataset', dataset, 'got biomarkers', biomarkers)
    return biomarkers
      .filter(biomarker => biomarker.display)
      .map(biomarker => {
        console.log('doing biomarker', biomarker);
        const color = colors[colorIndex];
        incrementColorIndex()
        return {
          label: dataset.name + '.' + biomarker.name,
          borderColor: color,
          backgroundColor: color,
          data: biomarker.data.values.map((y, i) => ({x: biomarker.data.times[i], y: y}))
        }
    });
  }

  const data = {
    datasets: [
      ...pkModels.map(m => getChartData(m.simulate)).flat(),
      ...pdModels.map(m => getChartData(m.simulate)).flat(),
      ...datasets.map(d => getChartDataDataset(d)).flat()
    ]
  }

  const options = {
    aspectRatio: 4,
    scales: {
      x: {
        type: 'linear'
      }
    },
    plugins: {
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
    <div>
      {renderChart &&
        <Scatter data={data} options={options}/>
      }
    </div>
  )
 
}
