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
import annotationPlugin from 'chartjs-plugin-annotation';
import { selectSubjectsByIds } from "../datasets/subjectsSlice";



Chart.register(...registerables, CrosshairPlugin, annotationPlugin);
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
    datasets: prior.kdes.map((kde, index) => {
      const color = getColor(prior.id);
      const backgroundColor = getColorBackground(prior.id);
      const data = kde ? 
        kde.densities.map((y, i) => ({ x: kde.values[i], y: y })) : 
        { x: null, y: null }
      return {
        type: "line",
        label: `Chain ${index}`,
        borderColor: color,
        backgroundColor: backgroundColor,
        showLine: true,
        pointRadius: 0,
        fill: true,
        borderWidth: 2.5,
        data: data,
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
      crosshair: false,
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
      const data = chain ? 
        chain.values.map((y, i) => ({ x: chain.iterations[i], y: y })) :
        { x : null, y: null }
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
        data: data,
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
      crosshair: false,
    },
  };

  return (
    <div className={classes.chart}>
      <Scatter data={data} options={options} />
    </div>
  );
} 

function InferenceChartFunction({ chains }) {
  const classes = useStyles();

  const data = {
    datasets: chains.map((chain, index) => {
      const color = getColor(index);
      const data = chain ? 
        chain.data.function.values.map((y, i) => ({ x: chain.data.function.iterations[i], y: y })) :
        { x : null, y: null }
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
        data: data,
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
          text: "Log-likelihood",
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
      crosshair: false,
    },
  };

  return (
    <div className={classes.chart}>
      <Scatter data={data} options={options} />
    </div>
  );
}


function InferenceChartTracesPrior({ prior }) {
  console.log('prior', prior)
  const multiple_subjects = prior.chains.length !== 0 && !('values' in prior.chains[0])
  const subjectIds = multiple_subjects ? Object.keys(prior.chains[0]) : []
  const subjects = useSelector((state) => selectSubjectsByIds(state, subjectIds));
  const [subjectIndex, setSubjectIndex] = React.useState(0);
  const subjectOptions = subjects.map((s, i) => ({label: s.id_in_dataset, value: i}))
  const chosenSubject = subjects && subjectIndex ? subjects[subjectIndex] : null
  console.log('subjects', multiple_subjects, subjectIds, subjects, chosenSubject)
  let priorForSubject = prior
  if (multiple_subjects) {
    if (chosenSubject) {
      priorForSubject = {
        ...prior,
        chains: prior.chains.map(chain => chain[chosenSubject.id]) ,
        kdes: prior.kdes.map(kde => kde[chosenSubject.id]),
      }
    } else {
      const firstKey = Object.keys(prior.chains[0])[0]
      priorForSubject = {
        ...prior,
        chains: prior.chains.map(chain => chain[firstKey]) ,
        kdes: prior.kdes.map(kde => kde[firstKey]),
      }
    }
  }

  const handleSubjectChange = (event) => {
    setSubjectIndex(event.target.value);
  };

  return (

      <React.Fragment key={prior.id}>
        {multiple_subjects &&
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
        <Grid item xs={12} md={8}>
        <InferenceChartTrace prior={priorForSubject} />
        </Grid>
        <Grid item xs={12} md={4}>
        <InferenceChartDistribution prior={priorForSubject} />
        </Grid>
      </React.Fragment>
  )
}

export default function InferenceChartTraces({ inference, priorsWithChainValues, chains }) {
  const classes = useStyles();
  
  return (
    <div className={classes.root}>
      <Grid container spacing={1}>
        <Grid item xs={12} md={8}>
          <InferenceChartFunction chains={chains} />
        </Grid>
      {priorsWithChainValues.map(prior => (
        <InferenceChartTracesPrior prior={prior} />
      ))}
      </Grid>
    </div>
  )
}
