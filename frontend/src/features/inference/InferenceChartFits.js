import React from "react";
import { useSelector } from "react-redux";
import Grid from "@material-ui/core/Grid";

import { makeStyles } from "@material-ui/core/styles";
import iqr from 'compute-iqr'

import { Scatter } from "react-chartjs-2";

import { Chart, registerables, Interaction } from "chart.js";
import { CrosshairPlugin, Interpolate } from "chartjs-plugin-crosshair";
import { getColor, getColorBackground } from "../modelling/ShapesAndColors";
import {
  selectVariableById,
} from "../variables/variablesSlice";
import {
  selectUnitById,
} from "../projects/unitsSlice";


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



function InferenceChartFits({ inference, observed }) {
  // TODO: assumes a single log likelihood
  //
  const classes = useStyles();

  const has_distribution = true
  const times = observed.outputs[0].times
  const datas = observed.outputs[0].datas

  const outputVariable = useSelector((state) => {
        return selectVariableById(state, observed.parameters[0].variable);
  });
  const timeVariable = useSelector((state) => {
        return selectVariableById(state, observed.model_loglikelihoods[0].time_variable);
  });
  const outputUnit = useSelector((state) => {
    if (outputVariable) {
      return selectUnitById(state, outputVariable.unit)
    }
  });
  const timeUnit = useSelector((state) => {
    if (timeVariable) {
      return selectUnitById(state, timeVariable.unit)
    }
  });

  console.log('observed', observed, outputVariable, outputUnit)
  const yLabel = `${outputVariable.name} [${outputUnit.symbol}]`
  const xLabel = `${timeVariable.name} [${timeUnit.symbol}]`

  // TODO: assume single output
  console.log('outputs', observed, outputVariable, timeVariable, outputUnit, timeUnit)
  let data = {
  }
  if (has_distribution) {
    data['datasets'] = observed.outputs.map((outputs, i) => {
      const color = getColor(i);
      const backgroundColor = getColorBackground(i);
      return [
        {
          type: "line",
          label: `chain ${i}: 10% percentile`,
          fill: false,
          borderColor: color,
          borderWidth: 0,
          pointRadius: 0,
          backgroundColor: backgroundColor,
          lineTension: 0,
          interpolate: true,
          data: outputs.percentile_mins.map((y, i) => ({ x: times[i], y: y }))
        },
        {
          type: "line",
          label: `chain ${i}: 90% percentile`,
          borderColor: color,
          borderWidth: 0,
          backgroundColor: backgroundColor,
          pointRadius: 0,
          fill: '-1',
          lineTension: 0,
          interpolate: true,
          data: outputs.percentile_maxs.map((y, i) => ({ x: times[i], y: y }))
        },
        {
          type: "line",
          label: `chain ${i}: median`,
          borderColor: color,
          borderWidth: 2.5,
          backgroundColor: backgroundColor,
          pointRadius: 0,
          fill: false,
          lineTension: 0,
          interpolate: true,
          data: outputs.medians.map((y, i) => ({ x: times[i], y: y }))
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
          data: datas.map((y, i) => ({ x: times[i], y: y }))
        },
    ]).flat()

  } else {
    data['datasets'] = observed.outputs.map((outputs, i) => {
      const color = getColor(i);
      const backgroundColor = getColorBackground(i);
      return {
        type: "line",
        label: `chain ${i}: final fit`,
        borderColor: color,
        borderWidth: 2.5,
        pointRadius: 0,
        backgroundColor: backgroundColor,
        lineTension: 0,
        interpolate: true,
        data: outputs.medians.map((y, i) => ({ x: times[i], y: y }))
      }
    }).concat([
      {
        type: "line",
        label: 'data',
        borderColor: 'black',
        backgroundColor: 'black',
        borderWidth: 2.5,
        showLine: false,
        data: datas.map((y, i) => ({ x: times[i], y: y }))
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
          text: xLabel,
          display: true,
        },
      },
      y: {
        position: "left",
        title: {
          text: yLabel,
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

export default function InferenceChartTraces({ inference, observedWithChainValues}) {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Grid container spacing={1}>
      {observedWithChainValues.map(observed => (
          <Grid item xs={12} md={6}>
          <InferenceChartFits inference={inference} observed={observed} />
          </Grid>
      ))}
      </Grid>
    </div>
  )
}
