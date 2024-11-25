import {
  SimulateResponse,
  TimeIntervalRead,
  VariableRead,
} from "../../app/backendApi";
import {
  formattedNumber,
  timeOverThreshold,
  timesPerInterval,
  valuesPerInterval,
} from "./utils";
import { useVariables } from "./useVariables";
import { useModelTimeIntervals } from "../../hooks/useModelTimeIntervals";
import { useUnits } from "./useUnits";

export type Parameter = {
  name: string | JSX.Element;
  value: (
    intervalIndex: number,
    simulation: SimulateResponse,
    variable: VariableRead,
    aucVariable?: VariableRead,
  ) => string;
};

function useNormalisedIntervals(intervals: TimeIntervalRead[]) {
  const units = useUnits();
  return intervals.map((interval) => {
    const intervalUnit = units?.find((unit) => unit.id === interval.unit);
    const hourUnit = intervalUnit?.compatible_units.find(
      (u) => u.symbol === "h",
    );
    const conversionFactor = parseFloat(hourUnit?.conversion_factor || "1");
    const start_time = interval.start_time * conversionFactor;
    const end_time = interval.end_time * conversionFactor;
    return {
      ...interval,
      start_time,
      end_time,
    };
  });
}

const variablePerInterval = (
  intervals: TimeIntervalRead[],
  variable: VariableRead,
  simulation: SimulateResponse,
  intervalIndex: number,
) => {
  const variableValuesPerInterval = valuesPerInterval(
    intervals,
    variable,
    simulation,
  );
  const intervalValues = variableValuesPerInterval[intervalIndex];
  const timePerInterval = timesPerInterval(simulation.time, intervals);
  const intervalTimes = timePerInterval[intervalIndex];
  return [intervalValues, intervalTimes];
};

const timeOverLowerThresholdPerInterval = (
  intervalValues: number[],
  intervalTimes: number[],
  variable: VariableRead,
) => {
  const threshold = variable?.lower_threshold || 0;
  return timeOverThreshold(intervalTimes, intervalValues, threshold);
};

const timeOverUpperThresholdPerInterval = (
  intervalValues: number[],
  intervalTimes: number[],
  variable: VariableRead,
) => {
  const threshold = variable?.upper_threshold || Infinity;
  return timeOverThreshold(intervalTimes, intervalValues, threshold);
};

export function useParameters() {
  const [baseIntervals] = useModelTimeIntervals();
  const variables = useVariables();
  const intervals = useNormalisedIntervals(baseIntervals);
  return [
    {
      name: "Min",
      value(
        intervalIndex: number,
        simulation: SimulateResponse,
        variable: VariableRead,
      ) {
        const [intervalValues] = variablePerInterval(
          intervals,
          variable,
          simulation,
          intervalIndex,
        );
        return intervalValues
          ? formattedNumber(Math.min(...intervalValues))
          : 0;
      },
    },
    {
      name: "Max",
      value(
        intervalIndex: number,
        simulation: SimulateResponse,
        variable: VariableRead,
      ) {
        const [intervalValues] = variablePerInterval(
          intervals,
          variable,
          simulation,
          intervalIndex,
        );
        return intervalValues
          ? formattedNumber(Math.max(...intervalValues))
          : 0;
      },
    },
    {
      name: "AUC",
      value(
        intervalIndex: number,
        simulation: SimulateResponse,
        variable: VariableRead,
      ) {
        const aucVariable = variables?.find(
          (v) => v.name === `calc_${variable.name}_AUC`,
        );
        const [auc] = aucVariable
          ? variablePerInterval(
              intervals,
              aucVariable,
              simulation,
              intervalIndex,
            )
          : [];
        return auc ? formattedNumber(auc[auc.length - 1] - auc[0]) : "";
      },
    },
    {
      name: (
        <>
          t<sub>lower</sub>(above)
        </>
      ),
      value(
        intervalIndex: number,
        simulation: SimulateResponse,
        variable: VariableRead,
      ) {
        const [intervalValues, intervalTimes] = variablePerInterval(
          intervals,
          variable,
          simulation,
          intervalIndex,
        );
        return intervalValues
          ? formattedNumber(
              timeOverLowerThresholdPerInterval(
                intervalValues,
                intervalTimes,
                variable,
              ),
            )
          : 0;
      },
    },
    {
      name: (
        <>
          t<sub>upper</sub>(above)
        </>
      ),
      value(
        intervalIndex: number,
        simulation: SimulateResponse,
        variable: VariableRead,
      ) {
        const [intervalValues, intervalTimes] = variablePerInterval(
          intervals,
          variable,
          simulation,
          intervalIndex,
        );
        return intervalValues
          ? formattedNumber(
              timeOverUpperThresholdPerInterval(
                intervalValues,
                intervalTimes,
                variable,
              ),
            )
          : 0;
      },
    },
    {
      name: (
        <>
          t<sub>lower</sub> - t<sub>upper</sub>
        </>
      ),
      value(
        intervalIndex: number,
        simulation: SimulateResponse,
        variable: VariableRead,
      ) {
        const [intervalValues, intervalTimes] = variablePerInterval(
          intervals,
          variable,
          simulation,
          intervalIndex,
        );
        return intervalValues
          ? formattedNumber(
              timeOverLowerThresholdPerInterval(
                intervalValues,
                intervalTimes,
                variable,
              ) -
                timeOverUpperThresholdPerInterval(
                  intervalValues,
                  intervalTimes,
                  variable,
                ),
            )
          : 0;
      },
    },
  ] as Parameter[];
}
