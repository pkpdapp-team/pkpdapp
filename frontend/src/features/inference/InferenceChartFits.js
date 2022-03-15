import React from "react";
import { useSelector } from "react-redux";
import Grid from "@material-ui/core/Grid";

import { makeStyles } from "@material-ui/core/styles";
import iqr from 'compute-iqr'

import { Scatter } from "react-chartjs-2";

import { Chart, registerables, Interaction } from "chart.js";
import { CrosshairPlugin, Interpolate } from "chartjs-plugin-crosshair";
import { getColor, getColorBackground } from "../modelling/ShapesAndColors";


Chart.register(...registerables, CrosshairPlugin);
Interaction.modes.interpolate = Interpolate;

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
  },
  plot: {
    height: "85vh",
    width: "100%",
  },
}));



function InferenceChartFits({ chains }) {
  const classes = useStyles();

  const has_distribution = chains[0].inference_output_results.length > 0 ? 
    chains[0].inference_output_results[0].value_max : false
  const outputs = chains[0].inference_output_results
  const times = chains[0].inference_output_results.map(output => output.time)

  // TODO: assume single output
  const outputName = "test"
  console.log('outputs', outputs)
  let data = {
  }
  if (has_distribution) {
    data['datasets'] = chains.map((chain, i) => {
      const outputs = chain.inference_output_results
      const color = getColor(chain.id);
      const backgroundColor = getColorBackground(chain.id);
      return [
        {
          type: "line",
          label: '10% percentile',
          fill: false,
          borderColor: color,
          borderWidth: 2.5,
          pointRadius: 0,
          backgroundColor: backgroundColor,
          lineTension: 0,
          interpolate: true,
          data: outputs.map((output, i) => ({ x: times[i], y: output.value }))
        },
        {
          type: "line",
          label: '90% percentile',
          borderColor: color,
          borderWidth: 2.5,
          backgroundColor: backgroundColor,
          pointRadius: 0,
          fill: -1,
          lineTension: 0,
          interpolate: true,
          data: outputs.map((output, i) => ({ x: times[i], y: output.value_max }))
        },
      ]
    }).concat([
        {
          type: "line",
          label: 'data',
          borderColor: 'black',
          borderWidth: 2.5,
          backgroundColor: 'black',
          showLine: false,
          data: chains[0].inference_output_results.map((output, i) => (
            { x: times[i], y: output.data }
          ))
        },
    ]).flat()

  } else {
    data['datasets'] = chains.map((chain, i) => {
      const outputs = chain.inference_output_results
      const color = getColor(chain.id);
      const backgroundColor = getColorBackground(chain.id);
      return {
        type: "line",
        label: 'final fit',
        borderColor: color,
        borderWidth: 2.5,
        pointRadius: 0,
        backgroundColor: backgroundColor,
        lineTension: 0,
        interpolate: true,
        data: outputs.map((output, i) => ({ x: times[i], y: output.value }))
      }
    }).concat([
      {
        type: "line",
        label: 'data',
        borderColor: 'black',
        backgroundColor: 'black',
        borderWidth: 2.5,
        showLine: false,
        data: chains[0].inference_output_results.map((output, i) => (
          { x: times[i], y: output.data }
        ))
      },
    ])
  }
  
  let options = {
    animation: {
      duration: 0,
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "linear",
        title: {
          text: "Time",
          display: true,
        },
      },
      y: {
        position: "left",
        title: {
          text: outputName,
          display: true,
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          boxHeight: 1
        },
      },
      tooltip: {
        mode: "interpolate",
        intersect: false,
        callbacks: {
          title: function (a, d) {
            return a[0].element.x.toPrecision(4);
          },
          label: function (d) {
            return d.dataset.label + ": " + d.element.y.toPrecision(4);
          },
        },
      },
      crosshair: {
        sync: {
          enabled: false,
        },
      },
    },
  };

  return (
    <div className={classes.plot}>
      <Scatter data={data} options={options} />
    </div>
  );
} 

export default function InferenceChartTraces({ inference, chains, priorsWithChainValues }) {
  const classes = useStyles();
  
  return (
    <InferenceChartFits chains={chains} />
  )
}
