import {
  SimulateResponse,
  TimeIntervalRead,
  VariableListApiResponse,
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

function useNormalisedVariables(variables: VariableListApiResponse) {
  const units = useUnits();
  return variables.map((variable) => {
    const variableUnit = units?.find(
      (unit) => unit.id === variable.threshold_unit,
    );
    const defaultUnit = variableUnit?.compatible_units.find(
      (u) => u.symbol === "pmol/L",
    );
    const conversionFactor = parseFloat(defaultUnit?.conversion_factor || "1");
    const lower_threshold = variable.lower_threshold
      ? variable.lower_threshold * conversionFactor
      : null;
    const upper_threshold = variable.upper_threshold
      ? variable.upper_threshold * conversionFactor
      : null;
    return {
      ...variable,
      lower_threshold,
      upper_threshold,
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
  const units = useUnits();
  const [baseIntervals] = useModelTimeIntervals();
  const baseVariables = useVariables();
  const intervals = useNormalisedIntervals(baseIntervals);
  const variables = useNormalisedVariables(baseVariables);

  function variableConversionFactor(variable: VariableRead) {
    const displayUnit = units?.find(
      (unit) => unit.id === variable.threshold_unit,
    );
    const variableUnit = displayUnit?.compatible_units.find(
      (u) => +u.id === variable.unit,
    );
    const conversionFactor = parseFloat(variableUnit?.conversion_factor || "1");
    return conversionFactor;
  }

  function timeConversionFactor(intervalIndex: number) {
    const interval = intervals[intervalIndex];
    const displayUnit = units?.find((unit) => unit.id === interval.unit);
    const timeUnit = displayUnit?.compatible_units.find(
      (u) => u.symbol === "h",
    );
    const conversionFactor = parseFloat(timeUnit?.conversion_factor || "1");
    return conversionFactor;
  }

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

        const min = intervalValues ? Math.min(...intervalValues) : 0;
        return formattedNumber(min / variableConversionFactor(variable));
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
        const max = intervalValues ? Math.max(...intervalValues) : 0;
        return formattedNumber(max / variableConversionFactor(variable));
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
        const difference = auc ? auc[auc.length - 1] - auc[0] : 0;
        return formattedNumber(
          difference /
            (variableConversionFactor(variable) *
              timeConversionFactor(intervalIndex)),
        );
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
        baseVariable: VariableRead,
      ) {
        const variable = variables.find((v) => v.id === baseVariable.id);
        if (variable) {
          const [intervalValues, intervalTimes] = variablePerInterval(
            intervals,
            variable,
            simulation,
            intervalIndex,
          );
          const tLower = intervalValues
            ? timeOverLowerThresholdPerInterval(
                intervalValues,
                intervalTimes,
                variable,
              )
            : 0;
          return formattedNumber(tLower / timeConversionFactor(intervalIndex));
        }
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
        baseVariable: VariableRead,
      ) {
        const variable = variables.find((v) => v.id === baseVariable.id);
        if (variable) {
          const [intervalValues, intervalTimes] = variablePerInterval(
            intervals,
            variable,
            simulation,
            intervalIndex,
          );
          const tUpper = intervalValues
            ? timeOverUpperThresholdPerInterval(
                intervalValues,
                intervalTimes,
                variable,
              )
            : 0;
          return formattedNumber(tUpper / timeConversionFactor(intervalIndex));
        }
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
        baseVariable: VariableRead,
      ) {
        const variable = variables.find((v) => v.id === baseVariable.id);
        if (variable) {
          const [intervalValues, intervalTimes] = variablePerInterval(
            intervals,
            variable,
            simulation,
            intervalIndex,
          );
          const tLower = intervalValues
            ? timeOverLowerThresholdPerInterval(
                intervalValues,
                intervalTimes,
                variable,
              )
            : 0;
          const tUpper = intervalValues
            ? timeOverUpperThresholdPerInterval(
                intervalValues,
                intervalTimes,
                variable,
              )
            : 0;
          return formattedNumber(
            (tLower - tUpper) / timeConversionFactor(intervalIndex),
          );
        }
      },
    },
  ] as Parameter[];
}
