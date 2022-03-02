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
    height: "120vh",
    width: "100%",
  },
}));


function InferenceChartDistribution({ prior }) {
  const classes = useStyles();

  const data = {
    datasets: prior.chains.map((chain, index) => {
      const binStep = 2 * iqr(chain) * Math.pow(chain.length, -0.333);
      const binStart = Math.min(...chain)
      const binStop = Math.max(...chain) + 10 * Number.EPSILON
      let nBins = Math.floor((binStop - binStart) / binStep) + 1
      if (nBins > 1000) {
        nBins = 1000
      }
      if (nBins < 1) {
        nBins = 1 
      }
      let bins = Array.from({length: nBins }, _ => 0);
      for (const y of chain) {
        const index = Math.floor((y - binStart) / binStep)
        bins[index] += 1;
      }

      const color = getColor(prior.id);
      const backgroundColor = getColorBackground(prior.id);
      return {
        type: "line",
        label: `Chain ${index}`,
        borderColor: color,
        backgroundColor: backgroundColor,
        showLine: true,
        pointRadius: 0,
        fill: true,
        borderWidth: 2.5,
        data: bins.map((y, i) => ({ x: binStart + i * binStep, y: y })),
      };
    })
  }
  let options = {
    animation: {
      duration: 0,
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          text: prior.name,
          display: true,
        },
      },
      y: {
        position: "left",
        title: {
          text: "count",
          display: true,
        },
      },
    },
    plugins: {
      decimation: {
        enabled: true,
        algorithm: 'lttb',
      },
      legend: {
        display: false,
        labels: {
          boxHeight: 1
        },
      },
      
    },
  };

  return (
    <div className={classes.chart}>
      <Scatter data={data} options={options} />
    </div>
  );
} 

function InferenceChartTrace({ prior }) {
  const classes = useStyles();

  const data = {
    datasets: prior.chains.map((chain, index) => {
      const color = getColor(prior.id);
      const downsample = chain.length > 1000
      const everyNsample = Math.floor(chain.length / 1000.0)
      return {
        type: "line",
        label: `Chain ${index}`,
        borderColor: color,
        backgroundColor: color,
        showLine: true,
        pointRadius: 0,
        fill: false,
        borderWidth: 1.5,
        lineTension: 0,
        interpolate: true,
        data: downsample ? 
          chain.filter((y, i) => 
            i % everyNsample === 0
          ).map((y, i) => ({ x: everyNsample * i, y: y }))
        : chain.map((y, i) => ({ x: i, y: y })),
      };
    })
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
          text: "Iteration",
          display: true,
        },
      },
      y: {
        position: "left",
        title: {
          text: prior.name,
          display: true,
        },
      },
    },
    plugins: {
      decimation: {
        enabled: true,
        algorithm: 'lttb',
      },
      legend: {
        labels: {
          boxHeight: 1
        },
      },
      tooltip: {
        mode: "interpolate",
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
    <div className={classes.chart}>
      <Scatter data={data} options={options} />
    </div>
  );
} 

export default function InferenceChartTraces({ inference, priorsWithChainValues }) {
  const classes = useStyles();
  
  return (
    <div className={classes.root}>
      {priorsWithChainValues.map(prior => (
        <Grid container spacing={1}>
          <Grid item xs={12} md={8}>
          <InferenceChartTrace prior={prior} />
          </Grid>
          <Grid item xs={12} md={4}>
          <InferenceChartDistribution prior={prior} />
          </Grid>
        </Grid>
      ))}
    </div>
  )
}
