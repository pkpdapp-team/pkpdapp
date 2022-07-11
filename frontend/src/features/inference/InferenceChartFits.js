import React from "react";
import { useSelector } from "react-redux";
import Grid from "@material-ui/core/Grid";

import { makeStyles } from "@material-ui/core/styles";
import iqr from 'compute-iqr'

import { Scatter } from "react-chartjs-2";

import FormControl from "@material-ui/core/FormControl";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";

import { Chart, registerables, Interaction } from "chart.js";
import { CrosshairPlugin, Interpolate } from "chartjs-plugin-crosshair";
import { getColor, getColorBackground } from "../modelling/ShapesAndColors";
import { selectSubjectsByIds } from "../datasets/subjectsSlice";
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
    height: "40vh",
    width: "100%",
  },
}));



function InferenceChartFits({ inference, observed }) {
  // TODO: assumes a single log likelihood
  //
  const classes = useStyles();

  const has_distribution = true
  const times = observed.outputs ? observed.outputs[0].times : []
  const datas = observed.outputs ? observed.outputs[0].datas : []

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

  const yLabelUnit = outputUnit ? outputUnit.symbol : ''
  const yLabelName = outputVariable ? outputVariable.name : ''
  const xLabelUnit = timeUnit ? timeUnit.symbol : ''
  const xLabelName = timeVariable ? timeVariable.name : ''
  const yLabel = `${yLabelName} [${yLabelUnit}]`
  const xLabel = `${xLabelName} [${xLabelUnit}]`

  // TODO: assume single output
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
          pointRadius: 0,
          backgroundColor: backgroundColor,
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
      title: {
        display: true,
        text: observed.name,
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


function InferenceChartTracesObserved({ inference, observed}) {

  const subjectIds = observed.outputs ? observed.outputs[0].subjects : []
  const uniqueSubjectsIds = [...new Set(subjectIds)]
  const [subjectIndex, setSubjectIndex] = React.useState(0);
  const subjects = useSelector((state) => selectSubjectsByIds(state, uniqueSubjectsIds));
  const subjectOptions = subjects.map((s, i) => ({label: s.id_in_dataset, value: i}))
  const multiple_subjects = uniqueSubjectsIds.length > 1
  const observedFiltered = subjects ? {
    ...observed,
    outputs: observed.outputs.map(outputs => ({
        ...outputs,
        percentile_mins: outputs.percentile_mins.filter((_, i) => subjectIds[i] === uniqueSubjectsIds[subjectIndex]),
        percentile_maxs: outputs.percentile_maxs.filter((_, i) => subjectIds[i] === uniqueSubjectsIds[subjectIndex]),
        medians: outputs.medians.filter((_, i) => subjectIds[i] === uniqueSubjectsIds[subjectIndex]),
        datas: outputs.datas.filter((_, i) => subjectIds[i] === uniqueSubjectsIds[subjectIndex]),
        times: outputs.times.filter((_, i) => subjectIds[i] === uniqueSubjectsIds[subjectIndex]),
      }))
  } : observed

  const handleSubjectChange = (event) => {
    setSubjectIndex(event.target.value);
  };

  return (
    <React.Fragment>
    { multiple_subjects &&
        <FormControl fullWidth>
          <InputLabel id="subject-select-label">Subject</InputLabel>
          <Select
            labelId="subject-select-label"
            id="subject-select"
            value={subjectIndex}
            label="Subject"
            onChange={handleSubjectChange}
          >
            {subjectOptions.map(so => (
              <MenuItem value={so.value}>{so.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
     }
     <Grid item xs={12}>
     <InferenceChartFits inference={inference} observed={observedFiltered} />
     </Grid>
    </React.Fragment>
  )
}


export default function InferenceChartTraces({ inference, observedWithChainValues}) {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Grid container spacing={1}>
      {observedWithChainValues.map(observed => (
          <InferenceChartTracesObserved inference={inference} observed={observed}/>
      ))}
      </Grid>
    </div>
  )
}
