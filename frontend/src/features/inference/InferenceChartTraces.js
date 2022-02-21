import React from "react";
import { useSelector } from "react-redux";

import { makeStyles } from "@material-ui/core/styles";

import { Scatter } from "react-chartjs-2";

import { Chart, registerables, Interaction } from "chart.js";
import { CrosshairPlugin, Interpolate } from "chartjs-plugin-crosshair";
import { getColor, getShape } from "../modelling/ShapesAndColors";

import {
  selectVariablesByPdModel,
  selectVariablesByDosedPkModel,
} from "../variables/variablesSlice";




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

function InferenceChartTrace({ prior }) {
  const classes = useStyles();

  const data = {
    datasets: prior.chains.map((chain, index) => {
      const color = getColor(prior.id);
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
        data: chain.map((y, i) => ({ x: i, y: y })),
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
        <InferenceChartTrace prior={prior} />
      ))}
    </div>
  )
}
