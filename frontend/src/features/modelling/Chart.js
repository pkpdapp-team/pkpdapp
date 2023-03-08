import React from "react";
import { useSelector } from "react-redux";

import makeStyles from '@mui/styles/makeStyles';
import List from "@mui/material/List";
import Alert from '@mui/material/Alert';
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Grid from "@mui/material/Grid";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";



import { Scatter } from "react-chartjs-2";
import Header from "../modelling/Header";

import { Chart, registerables, Interaction } from "chart.js";
import { CrosshairPlugin, Interpolate } from "chartjs-plugin-crosshair";
import { getColor, getShape } from "./ShapesAndColors";
import {Typography} from "@mui/material";

Chart.register(...registerables, CrosshairPlugin);
Interaction.modes.interpolate = Interpolate;


export default function ModellingChart({ datasets, pkModels, pdModels, visualHeight }) {
  let renderChart = true;

  let showRhsAxis = false;

  const biomarkers = useSelector((state) => state.biomarkerTypes.entities);
  const subjects = useSelector((state) => state.subjects.entities);
  const variables = useSelector((state) => state.variables.entities);
  const units = useSelector((state) => state.units.entities);

  let labelsShown = {}

  let xLimits = [0, 0];
  let updateXLimits = (data) => {
    xLimits[0] = Math.min(xLimits[0], Math.min(...data));
    xLimits[1] = Math.max(xLimits[1], Math.max(...data));
  };

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
        updateXLimits(model_simulate[time_id]);
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
        if (!biomarker) {
          return null;
        }
        const display_unit = units[biomarker.display_unit];
        const display_time_unit = units[biomarker.display_time_unit];
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
        updateXLimits(times);
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
  
  const getChartDataProtocol = (dataset) => {
    return dataset.protocols
      .map((protocol, index) => {
        const display_unit = units[protocol.amount_unit];
        const display_time_unit = units[protocol.time_unit];
        const subjectsDisplay = protocol.subjects.map(id => subjects[id] ? subjects[id].display : false)
        console.log("subjectsDisplay", subjectsDisplay)
        const protocolDisplay = subjectsDisplay.some((x) => x);
        if (!protocolDisplay) {
          return null;
        }
        let times = protocol.doses.map(dose => [dose.start_time, dose.start_time, dose.start_time + dose.duration, dose.start_time + dose.duration]).flat();
        let values = protocol.doses.map(dose => [0, dose.amount, dose.amount, 0]).flat();
        times.unshift(xLimits[0]);
        times.push(xLimits[1]);
        values.unshift(0);
        values.push(0);
        console.log("times", times)
        console.log("values", values)
        const color = getColor(index);
        if (values.length === 0) {
          return null;
        }
        const yAxisID = "yLhs";
        const label = `${protocol.name} [${display_unit ? display_unit.symbol : ''}]`;
        return {
          yAxisID: yAxisID,
          label: label,
          type: "line",
          fill: true,
          lineTension: 0,
          interpolate: true,
          borderColor: color,
          backgroundColor: color,
          myMetadata: {
            ylabel: label,
            xlabel: `${protocol.name}.time [${display_time_unit ? display_time_unit.symbol : ''}]`,
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
  
  const data_protocols = {
    datasets: [
      ...datasets.map((d) => getChartDataProtocol(d)).flat().flat(),
    ]
  }
  
  const showProtocols = datasets.length > 0;

  const y_unit_symbols = data.datasets.reduce((sum, dataset) => { 
    if (!dataset?.myMetadata) {
      return sum;
    }
    const unit = dataset.myMetadata.yunit;
    sum.add(unit ? unit.symbol : '');
    return sum;
  }, new Set());

  const y_amount_unit_symbols = data_protocols.datasets.reduce((sum, dataset) => { 
    if (!dataset?.myMetadata) {
      return sum;
    }
    const unit = dataset.myMetadata.yunit;
    sum.add(unit ? unit.symbol : '');
    return sum;
  }, new Set());

  const x_unit_symbols = data.datasets.reduce((sum, dataset) => { 
    if (!dataset?.myMetadata) {
      return sum;
    }
    const unit = dataset.myMetadata.xunit;
    sum.add(unit ? unit.symbol : '');
    return sum;
  }, new Set());
  
  const incompatible_y_unit = y_unit_symbols.size > 1;
  const incompatible_x_unit = x_unit_symbols.size > 1;

  const list_of_y_unit = new Array(...y_unit_symbols).join(', ');
  const list_of_y_amount_unit = new Array(...y_amount_unit_symbols).join(', ');
  const list_of_x_unit = new Array(...x_unit_symbols).join(', ');

  let crosshair = {
    line: {
      color: '#F66',  // crosshair line color
      width: 1        // crosshair line width
    },
    sync: {
      enabled: true,            // enable trace line syncing with other charts
      suppressTooltips: false   // suppress tooltips when showing a synced tracer
    },
    zoom: {
      enabled: true,                                      // enable zooming
      zoomboxBackgroundColor: 'rgba(66,133,244,0.2)',     // background color of zoom box 
      zoomboxBorderColor: '#48F',                         // border color of zoom box
      zoomButtonText: 'Reset Zoom',                       // reset zoom button text
      zoomButtonClass: 'reset-zoom',                      // reset zoom button class
    },
  }

  let plugins = {
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
    crosshair,
  };
  
  let options_protocols = {
    animation: {
      duration: 0,
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "linear",
        title: {
          text: `Time [${list_of_x_unit}]`,
          display: false,
        },
      },
      yLhs: {
        position: "left",
        title: {
          text: `Dose Amount [${list_of_y_amount_unit}]`,
          display: true,
        }
      }
    },
    plugins,
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
          text: `Time [${list_of_x_unit}]`,
          display: true,
        },
      },
      yLhs: {
        position: "left",
        title: {
          text: `Data Variable / Model Output [${list_of_y_unit}]`,
          display: true,
        },
      },
    },
    plugins,
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

  const chartVisualHeight = visualHeight * 3.0 / 4.0;
  const chartVisualHeightStr = `${chartVisualHeight}vh}`;
  const protocolVisualHeight = visualHeight * 1.0 / 4.0;
  const protocolVisualHeightStr = `${protocolVisualHeight}vh}`;

  console.log('data', data, options, renderChart)
  return (
    <React.Fragment>
    <Box height={chartVisualHeightStr} width="100%">
      {renderChart && <Scatter data={data} options={options} />}
    </Box>
    {showProtocols &&
      <Box height={protocolVisualHeightStr} width="100%">
        {renderChart && <Scatter data={data_protocols} options={options_protocols} />}
      </Box>
    }
    {incompatible_y_unit &&
        <Alert severity="warning">
          Different units on y-axis
        </Alert>
    } 
    {incompatible_x_unit &&
        <Alert severity="warning">
          Different units on x-axis
        </Alert>
    }
    </React.Fragment>
  );
}
