import React from "react";
import { useSelector } from "react-redux";

import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import Alert from "@material-ui/lab/Alert";
import Tooltip from "@material-ui/core/Tooltip";
import Grid from "@material-ui/core/Grid";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";



import { Scatter } from "react-chartjs-2";
import Header from "../modelling/Header";

import { Chart, registerables, Interaction } from "chart.js";
import { CrosshairPlugin, Interpolate } from "chartjs-plugin-crosshair";
import { getColor, getShape } from "./ShapesAndColors";
import {Typography} from "@material-ui/core";

Chart.register(...registerables, CrosshairPlugin);
Interaction.modes.interpolate = Interpolate;

export default function ModellingChart({ datasets, pkModels, pdModels, className }) {
  let renderChart = true;

  let showRhsAxis = false;

  const biomarkers = useSelector((state) => state.biomarkerTypes.entities);
  const subjects = useSelector((state) => state.subjects.entities);
  const variables = useSelector((state) => state.variables.entities);
  const units = useSelector((state) => state.units.entities);

  let labelsShown = {}

  const getChartData = (model) => {
    console.log("getChartData");
    if (!model.simulate) {
      return {};
    }
    let model_simulate = { ...model.simulate };
    delete model_simulate.status;
    const have_all_variables =
      Object.keys(model_simulate).filter((id) => id in variables).length ===
      Object.keys(model_simulate).length;
    if (!have_all_variables) {
      return {};
    }
    const time_id = Object.keys(model_simulate).filter(
      (id) => variables[id].binding === "time"
    )[0];
    const time_variable = variables[time_id]
    const time_unit = time_variable ? units[time_variable.unit] : null;

    return Object.entries(model_simulate)
      .map(([variable_id, data]) => {
        const variable = variables[variable_id];
        const unit = units[variable.unit];
        console.log("doing variable", variable, variable_id);
        const color = getColor(variable.color);
        if (!variable.display) {
          return null;
        }
        const yAxisID = variable.axis ? "yRhs" : "yLhs";
        if (variable.axis) {
          showRhsAxis = true;
        }
        // chartjs crashes if there are identical labels
        let label = `${variable.qname} [${unit ? unit.symbol : ''}]`;
        if (label in labelsShown) {
          label = `${label}${labelsShown[label]}`
          labelsShown[label] += 1
        } else {
          labelsShown[label] = 1
        }
        return {
          yAxisID: yAxisID,
          type: "line",
          label: label,
          borderColor: color,
          backgroundColor: color,
          showLine: true,
          fill: false,
          lineTension: 0,
          interpolate: true,
          myMetadata: {
            ylabel: label,
            xlabel: `${model.name}.time [${time_unit ? time_unit.symbol : ''}]`,
            yunit: unit,
            xunit: time_unit,
          },
          data: data.map((y, i) => ({ x: model_simulate[time_id][i], y: y })),
        };
      })
      .filter((x) => x);
  };

  const getChartDataDataset = (dataset) => {
    return dataset.biomarker_types
      .map((id) => {
        const biomarker = biomarkers[id];
        const display_unit = units[biomarker.display_unit];
        const display_time_unit = units[biomarker.display_time_unit];
        if (!biomarker) {
          return null;
        }
        const subjectsDisplay = biomarker.data.subjects.map((id) =>
          subjects[id] ? subjects[id].display : false
        );
        const subjectsDisplayFilter = (_, i) => subjectsDisplay[i];
        const times = biomarker.data.times.filter(subjectsDisplayFilter);
        const values = biomarker.data.values.filter(subjectsDisplayFilter);
        const color = getColor(biomarker.color);
        const pointStyle = biomarker.data.subjects
          .filter(subjectsDisplayFilter)
          .map((id) => getShape(subjects[id].shape));
        if (!biomarker.display) {
          return null;
        }
        if (values.length === 0) {
          return null;
        }
        const yAxisID = biomarker.axis ? "yRhs" : "yLhs";
        if (biomarker.axis) {
          showRhsAxis = true;
        }
        const label = `${dataset.name}.${biomarker.name} [${display_unit ? display_unit.symbol : ''}]`;
        return {
          yAxisID: yAxisID,
          label: label,
          pointStyle: pointStyle,
          borderColor: color,
          backgroundColor: color,
          myMetadata: {
            ylabel: label,
            xlabel: `${dataset.name}.time [${display_time_unit ? display_time_unit.symbol : ''}]`,
            yunit: display_unit,
            xunit: display_time_unit,
          },
          data: values.map((y, i) => ({ x: times[i], y: y })),
        };
      })
      .filter((x) => x);
  };

  const data = {
    datasets: [
      ...datasets
        .map((d) => getChartDataDataset(d))
        .flat()
        .flat(),
      ...pkModels.map((m) => getChartData(m)).flat(),
      ...pdModels.map((m) => getChartData(m)).flat(),
    ],
  };

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
          text: "Time (units defined below)",
          display: true,
        },
      },
      yLhs: {
        position: "left",
        title: {
          text: "Data Variable / Model Output (units described above)",
          display: true,
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          usePointStyle: true,
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
      },
    },
  };

  if (showRhsAxis) {
    options.scales["yRhs"] = {
      position: "right",
      title: {
        text: "Data Variable / Model Output (units defined above)",
        display: true,
      },
    };
  }

  const has_first_dataset = data.datasets.length > 0 && data.datasets[0] && data.datasets[0].myMetadata;
  const first_x_unit = has_first_dataset ? data.datasets[0].myMetadata.xunit : null;
  const first_y_unit = has_first_dataset ? data.datasets[0].myMetadata.yunit : null;
  let incompatible_x_unit = false;
  let incompatible_y_unit = false;
  console.log('XXX', has_first_dataset, first_x_unit, first_y_unit)
  if (has_first_dataset) {
    for (const dataset of data.datasets) {
      if (dataset) {
        // catch when unit is undefined
        if (typeof dataset.myMetadata.xunit !== typeof first_x_unit) {
          incompatible_x_unit = true;
        }
        if (typeof dataset.myMetadata.yunit !== typeof first_y_unit) {
          incompatible_y_unit = true;
        }
        if (dataset.myMetadata.xunit && first_x_unit) {
          if (dataset.myMetadata.xunit.id !== first_x_unit.id) {
            incompatible_x_unit = true;
          }
        }
        if (dataset.myMetadata.yunit && first_y_unit) {
          if (dataset.myMetadata.yunit.id !== first_y_unit.id) {
            incompatible_y_unit = true;
          }
        }
      }
    }
  }

  console.log('data', data, options, renderChart)
  return (
    <React.Fragment>
    <div className={className}>
      {renderChart && <Scatter data={data} options={options} />}
    </div>
    <Grid container spacing={1}>
    <Grid item xs={12}>
      {incompatible_y_unit &&
          <Alert severity="warning">
            Different units on y-axis
          </Alert>
      } 
     </Grid>
     <Grid item xs={12}>
      <Typography>
        On the x-axis:
        </Typography>
       <List component="div" dense disablePadding>
       {data.datasets.map(dataset => (
          <ListItem>
            <Typography>
              - {dataset.myMetadata.xlabel}
            </Typography>
          </ListItem>
       ))}
       </List>
       {incompatible_x_unit &&
            <Alert severity="warning">
              Different units on x-axis
            </Alert>
        }
     </Grid>
     </Grid>
    </React.Fragment>
  );
}
