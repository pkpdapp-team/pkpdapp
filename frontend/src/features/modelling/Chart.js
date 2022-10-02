import React from "react";
import { useSelector } from "react-redux";

import { makeStyles } from "@material-ui/core/styles";

import { Scatter } from "react-chartjs-2";
import Header from "../modelling/Header";

import { Chart, registerables, Interaction } from "chart.js";
import { CrosshairPlugin, Interpolate } from "chartjs-plugin-crosshair";
import { getColor, getShape } from "./ShapesAndColors";

Chart.register(...registerables, CrosshairPlugin);
Interaction.modes.interpolate = Interpolate;

export default function ModellingChart({ datasets, pkModels, pdModels, className }) {
  let renderChart = true;

  let showRhsAxis = false;

  const biomarkers = useSelector((state) => state.biomarkerTypes.entities);
  const subjects = useSelector((state) => state.subjects.entities);
  const variables = useSelector((state) => state.variables.entities);

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
      (id) => variables[id].name === "time"
    )[0];

    return Object.entries(model_simulate)
      .map(([variable_id, data]) => {
        const variable = variables[variable_id];
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
        let label = variable.qname
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
        return {
          yAxisID: yAxisID,
          label: dataset.name + "." + biomarker.name,
          pointStyle: pointStyle,
          borderColor: color,
          backgroundColor: color,
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
          text: "Time (units defined in detail panels)",
          display: true,
        },
      },
      yLhs: {
        position: "left",
        title: {
          text: "Data Variable / Model Output (units defined in detail panels)",
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
        text: "Data Variable / Model Output (units defined in detail panels)",
        display: true,
      },
    };
  }

  console.log('data', data, options, renderChart)
  return (
    <div className={className}>
      {renderChart && <Scatter data={data} options={options} />}
    </div>
  );
}
