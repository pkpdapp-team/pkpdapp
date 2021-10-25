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


export function NcaChart({nca, biomarker_type, subject, mode}) {
  const classes = useStyles();
  const renderChart = true;

  const first_point = [nca.times[0], nca.concentrations[0]];
  const last_point = [
    nca.times[nca.times.length-1], 
    nca.concentrations[nca.concentrations.length-1]
  ];

  const max_point = [nca.t_max, nca.c_max]

  let before = [first_point, [0.0, nca.c_0]]
  if (before[0][0] == 0.0) {
    before = [before[1]]
  }

  const after = [
    last_point, 
    [last_point[0] + 0.5  * nca.t_half, last_point[1] * 0.75],
    [last_point[0] + nca.t_half, last_point[1] * 0.5],
  ]

  let datasets = []

  // main scatter plot
  if (mode !== 'aucm') {
    datasets.push({
      borderColor: getColor(0),
      backgroundColor: getColorBackground(0),
      fill: mode === 'auc',
      label: biomarker_type.name + 
             " Concentration for ID " + 
             subject.id_in_dataset,
      data: nca.concentrations.map((y, i) => ({
        x: nca.times[i], y: y
      }))
    })
  }


  const rounding = 3
  const c0_text = "C_0 = " + nca.c_0.toPrecision(rounding)
  const lambdaz_text = [
      "Lambda_z = " + nca.lambda_z.toPrecision(rounding),
      "T_half = " + nca.t_half.toPrecision(rounding),
      "Num_points = " + nca.num_points,
      "R2 = " + nca.r2.toPrecision(rounding),
    ]
  const t_half_text = "T_half = " + nca.t_half.toPrecision(rounding)

  if (mode === 'extrapolation') {
    datasets.push({
      borderColor: getColor(1),
      backgroundColor: getColor(1),
      label: 'Extrapolation before',
      tooltipText: c0_text,
      data: before.map((pt, i) => ({
        x: pt[0], y: pt[1]
      }))

    })

    datasets.push({
      borderColor: getColor(1),
      backgroundColor: getColor(1),
      label: 'Extrapolation after',
      type: 'line',
      tooltipText: t_half_text,
      lineTension: 0,
      interpolate: true,
      data: after.map((pt, i) => ({
        x: pt[0], y: pt[1]
      }))
    })

    datasets.push({
      borderColor: getColor(2),
      backgroundColor: getColorBackground(2),
      label: 'Extrapolation',
      tooltipText: lambdaz_text,
      lineTension: 0,
      interpolate: true,
      data: [
        {x: after[0][0], y: after[0][1]},
        {x: after[2][0], y: after[2][1]},
      ]
    })
  }

  if (mode === 'aucm') {
    const first_moment_y = nca.concentrations.map((c, i) =>
      c * nca.times[i]
    );
    datasets.push({
      borderColor: getColor(3),
      backgroundColor: getColorBackground(3),
      label: 'First Moment',
      fill: true,
      lineTension: 0,
      interpolate: true,
      data: first_moment_y.map((fm, i) => ({
        x: nca.times[i], y: fm 
      })),
    })

    datasets.push({
      borderColor: getColor(4),
      backgroundColor: getColorBackground(4),
      label: 'Extrapolation before',
      tooltipText: c0_text,
      lineTension: 0,
      interpolate: true,
      data: before.map((pt, i) => ({
        x: pt[0], y: pt[1]*pt[0]
      }))
    })

    datasets.push({
      borderColor: getColor(5),
      backgroundColor: getColorBackground(5),
      label: 'Extrapolation after',
      type: 'line',
      tooltipText: t_half_text,
      lineTension: 0,
      interpolate: true,
      data: after.map((pt, i) => ({
        x: pt[0], y: pt[1]*pt[0]
      }))
    })

    const aumcHoverPoint = [
      0.5 * (Math.max(...nca.times) + Math.min(...nca.times)),
      0.5 * Math.max(...first_moment_y),
    ]
    const aumcText = "AUMC_0_last = " + 
      nca.aumc_0_last.toPrecision(rounding)

    datasets.push({
      borderColor: getColor(6),
      backgroundColor: getColorBackground(6),
      label: 'AUMC_0_last',
      tooltipText: aumcText,
      data: [{
        x: aumcHoverPoint[0], y: aumcHoverPoint[1]
      }]
    })

    const aumcInfHoverPoint = [
      last_point[0] * 1.05, last_point[1] * last_point[0] * 0.5
    ]
    const aumcInfText = [
      "AUMC = " + nca.aumc.toPrecision(rounding),
      "AUMC_extrap_percent = " + nca.aumc_extrap_percent.toPrecision(rounding)
    ]
    console.log('aumc', aumcHoverPoint, aumcInfHoverPoint)

    datasets.push({
      borderColor: getColor(8),
      backgroundColor: getColorBackground(8),
      label: 'AUMC',
      tooltipText: aumcInfText,
      data: [{
        x: aumcInfHoverPoint[0], y: aumcInfHoverPoint[1]
      }]
    })
  }

  if (mode === 'auc') {
    const aucHoverPoint = [
      max_point[0], 0.5 * max_point[1]
    ]
    const aucText = "AUC_0_last = " + 
      nca.auc_0_last.toPrecision(rounding)

    datasets.push({
      borderColor: getColor(6),
      backgroundColor: getColorBackground(6),
      label: 'AUC_0_last',
      tooltipText: aucText,
      data: [{
        x: aucHoverPoint[0], y: aucHoverPoint[1]
      }]
    })

    const aucInfHoverPoint = [
      last_point[0] * 1.05, last_point[1] * 0.5
    ]
    const aucInfText = [
      "AUC = " + nca.auc_infinity.toPrecision(rounding),
      "AUC_infinity_dose = " + nca.auc_infinity_dose.toPrecision(rounding),
      "AUC_extrap_percent = " + nca.auc_extrap_percent.toPrecision(rounding),
    ]

    datasets.push({
      borderColor: getColor(7),
      backgroundColor: getColorBackground(7),
      label: 'AUC',
      tooltipText: aucInfText,
      data: [{
        x: aucInfHoverPoint[0], y: aucInfHoverPoint[1]
      }]
    })
  }

  if (mode === 'tmax') {
    const tmax_text = "T_max = " + max_point[0]
    const cmax_text = "C_max = " + max_point[1]

    datasets.push({
      borderColor: getColor(8),
      backgroundColor: getColorBackground(8),
      label: 'T_max/C_max',
      tooltipText: [tmax_text, cmax_text],
      data: [
        {x: max_point[0], y: 0},
        {x: max_point[0], y: max_point[1]},
        {x: 0, y: max_point[1]},
      ]
    })
  }



  console.log(datasets)

  const data = { datasets }

  return (
    <div className={classes.root}>
      {renderChart &&
        <Scatter data={data} options={options}/>
      }
    </div>
  )

}

export function NcaAucChart({nca, biomarker_type, subject}) {
  let renderChart = true;
  const classes = useStyles();

  const first_point = [nca.times[0], nca.concentrations[0]];
  const last_point = [
    nca.times[nca.times.length-1], 
    nca.concentrations[nca.concentrations.length-1]
  ];

  const max_point = [nca.t_max, nca.c_max]

  

  const after = [
    last_point, 
    [last_point[0] + 0.5  * nca.t_half, last_point[1] * 0.75],
    [last_point[0] + nca.t_half, last_point[1] * 0.5],
  ]


  // main scatter plot
  let datasets = [{
    label: biomarker_type.name + 
           " Concentration for ID " + 
           subject.id_in_dataset,
    data: nca.concentrations.map((y, i) => ({
      x: nca.times[i], y: y
    }))
  }]


       

  const data = { datasets }

  return (
    <div className={classes.root}>
      {renderChart &&
        <Scatter data={data} options={options}/>
      }
    </div>
  )
 
}
