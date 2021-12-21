import React from "react";

import { makeStyles } from "@material-ui/core/styles";

import { Scatter } from "react-chartjs-2";

import { getColor, getColorBackground } from "../modelling/ShapesAndColors";

const useStyles = makeStyles((theme) => ({
  root: {
    height: "70vh",
    width: "100%",
  },
}));

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
        text: "Time ",
        display: true,
      },
    },
    y: {
      type: "linear",
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
        filter: function (item, chart) {
          return !item.text.includes("noLabel");
        },
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

export function AuceChartDataVsTime({ auces, biomarker_type }) {
  const classes = useStyles();
  const renderChart = true;

  const datasets = auces.map((auce, i) => {
    const subjectsDisplay = biomarker_type.data.subjects.map((id) =>
      auce.subject_ids.includes(id)
    );
    const subjectsDisplayFilter = (_, i) => subjectsDisplay[i];
    const times = biomarker_type.data.times.filter(subjectsDisplayFilter);
    const values = biomarker_type.data.values.filter(subjectsDisplayFilter);
    return {
      borderColor: getColor(i),
      backgroundColor: getColorBackground(i),
      label: auce.name,
      data: values.map((y, i) => ({ x: times[i], y: y })),
    };
  });

  const data = { datasets };

  const optionsVsTime = {
    ...options,
    scales: {
      x: {
        type: "linear",
        title: {
          text: "Time ",
          display: true,
        },
      },
      y: {
        type: "linear",
        position: "left",
        title: {
          text: "Data Variable",
          display: true,
        },
      },
    },
  };

  return (
    <div className={classes.root}>
      {renderChart && <Scatter data={data} options={optionsVsTime} />}
    </div>
  );
}

export function AuceChartFitsVsConcentration({ auces, biomarker_type }) {
  const classes = useStyles();
  const renderChart = true;

  let datasets = [];
  var i = 0;
  for (const auce of auces) {
    const data = auce.x ? auce.x.map((x, i) => ({ x: x, y: auce.y[i] })) : null;
    const dataLower = auce.x
      ? auce.x.map((x, i) => ({ x: x, y: auce.y_lower[i] }))
      : null;
    const dataUpper = auce.x
      ? auce.x.map((x, i) => ({ x: x, y: auce.y_upper[i] }))
      : null;
    const dataPoints = auce.auce
      ? auce.concentrations.map((x, i) => ({ x: x, y: auce.auce[i] }))
      : null;
    if (data) {
      datasets.push({
        borderColor: getColor(i),
        backgroundColor: getColorBackground(i),
        label: "noLabel" + auce.name + "Fit",
        pointRadius: 0,
        fill: false,
        type: "line",
        data: data,
      });
    }
    if (dataLower) {
      datasets.push({
        borderColor: getColorBackground(i),
        backgroundColor: getColorBackground(i),
        type: "line",
        pointRadius: 0,
        fill: false,
        label: "noLabel" + auce.name + "Lower",
        data: dataLower,
      });
    }
    if (dataUpper) {
      datasets.push({
        borderColor: getColorBackground(i),
        backgroundColor: getColorBackground(i),
        type: "line",
        pointRadius: 0,
        fill: "-1", // fill to previous dataset
        //fill: false,
        label: "noLabel" + auce.name + "Upper",
        data: dataUpper,
      });
    }
    if (dataPoints) {
      datasets.push({
        borderColor: getColor(i),
        backgroundColor: getColor(i),
        label: auce.name,
        data: dataPoints,
      });
    }
    i += 1;
  }

  const data = { datasets };

  const optionsVsConcentration = {
    ...options,
    scales: {
      x: {
        type: "logarithmic",
        title: {
          text: "Concentration",
          display: true,
        },
      },
      y: {
        type: "logarithmic",
        position: "left",
        title: {
          text: "AUCE",
          display: true,
        },
      },
    },
  };

  return (
    <div className={classes.root}>
      {renderChart && <Scatter data={data} options={optionsVsConcentration} />}
    </div>
  );
}
