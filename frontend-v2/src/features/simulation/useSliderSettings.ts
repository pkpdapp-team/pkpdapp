import { useCallback, useState } from "react";
import { SimulationRead, VariableRead } from "../../app/backendApi";

type SliderValues = Map<number, number>;
type SliderRanges = Map<number, number>;

const EMPTY_SLIDER_VALUES: SliderValues = new Map();
const EMPTY_SLIDER_RANGES: SliderRanges = new Map();
const DEFAULT_SLIDER_RANGE = 10.0;

const getSliderDefaultValue = (variable?: VariableRead): number => {
  return variable?.default_value !== undefined ? variable.default_value : 1.0;
};

const calculateSliderBounds = (
  variable?: VariableRead,
  range: number = DEFAULT_SLIDER_RANGE,
): [number, number] => {
  const defaultValue = getSliderDefaultValue(variable);

  let minValue = variable?.lower_bound;
  if (minValue === undefined || minValue === null) {
    minValue = defaultValue / range;
  }

  let maxValue = variable?.upper_bound;
  if (maxValue === undefined || maxValue === null) {
    maxValue = defaultValue === 0 ? range : defaultValue * range;
  }

  return [minValue, maxValue];
};

const getSliderInitialValues = (
  simulation?: SimulationRead,
  existingSliderValues?: SliderValues,
  variables?: VariableRead[],
): SliderValues => {
  const initialValues: SliderValues = new Map();
  for (const slider of simulation?.sliders || []) {
    if (existingSliderValues?.has(slider.variable)) {
      initialValues.set(
        slider.variable,
        existingSliderValues.get(slider.variable)!,
      );
      continue;
    }

    const variable = variables?.find((v) => v.id === slider.variable);
    initialValues.set(slider.variable, getSliderDefaultValue(variable));
  }
  return initialValues;
};

const getSliderInitialRanges = (
  simulation?: SimulationRead,
  existingSliderRanges?: SliderRanges,
): SliderRanges => {
  const initialRanges: SliderRanges = new Map();
  for (const slider of simulation?.sliders || []) {
    const range =
      existingSliderRanges?.get(slider.variable) ?? DEFAULT_SLIDER_RANGE;
    initialRanges.set(slider.variable, range);
  }
  return initialRanges;
};

const useSliderSettings = () => {
  const [sliderValues, setSliderValues] =
    useState<SliderValues>(EMPTY_SLIDER_VALUES);
  const [sliderRanges, setSliderRanges] =
    useState<SliderRanges>(EMPTY_SLIDER_RANGES);

  const handleChangeSlider = useCallback((variable: number, value: number) => {
    setSliderValues((prevSliderValues) => {
      const nextSliderValues = new Map(prevSliderValues);
      nextSliderValues.set(variable, value);
      return nextSliderValues;
    });
  }, []);

  const removeSliderSettings = useCallback((variable: number) => {
    setSliderValues((prevSliderValues) => {
      const nextSliderValues = new Map(prevSliderValues);
      nextSliderValues.delete(variable);
      return nextSliderValues;
    });
    setSliderRanges((prevSliderRanges) => {
      const nextSliderRanges = new Map(prevSliderRanges);
      nextSliderRanges.delete(variable);
      return nextSliderRanges;
    });
  }, []);

  const addSlider = useCallback(
    (variableId: number, variable?: VariableRead) => {
      const initialValue = getSliderDefaultValue(variable);
      const initialRange = DEFAULT_SLIDER_RANGE;

      setSliderValues((prevSliderValues) => {
        if (prevSliderValues.has(variableId)) {
          return prevSliderValues;
        }
        const nextSliderValues = new Map(prevSliderValues);
        nextSliderValues.set(variableId, initialValue);
        return nextSliderValues;
      });

      setSliderRanges((prevSliderRanges) => {
        if (prevSliderRanges.has(variableId)) {
          return prevSliderRanges;
        }
        const nextSliderRanges = new Map(prevSliderRanges);
        nextSliderRanges.set(variableId, initialRange);
        return nextSliderRanges;
      });
    },
    [setSliderRanges, setSliderValues],
  );

  const initialiseSliderSettings = useCallback(
    (simulation?: SimulationRead, variables?: VariableRead[]) => {
      setSliderValues((currentSliderValues) =>
        getSliderInitialValues(simulation, currentSliderValues, variables),
      );
      setSliderRanges((currentSliderRanges) =>
        getSliderInitialRanges(simulation, currentSliderRanges),
      );
    },
    [],
  );

  const getSliderValue = useCallback(
    (variableId: number, variable?: VariableRead): number => {
      const value = sliderValues.get(variableId);
      return value !== undefined ? value : getSliderDefaultValue(variable);
    },
    [sliderValues],
  );

  const getSliderBounds = useCallback(
    (variableId: number, variable?: VariableRead): [number, number] => {
      const range = sliderRanges.get(variableId) ?? DEFAULT_SLIDER_RANGE;
      return calculateSliderBounds(variable, range);
    },
    [sliderRanges],
  );

  const widenSliderRange = useCallback((variableId: number) => {
    setSliderRanges((prevSliderRanges) => {
      const currentRange =
        prevSliderRanges.get(variableId) ?? DEFAULT_SLIDER_RANGE;
      const nextSliderRanges = new Map(prevSliderRanges);
      nextSliderRanges.set(variableId, currentRange + DEFAULT_SLIDER_RANGE);
      return nextSliderRanges;
    });
  }, []);

  const narrowSliderRange = useCallback((variableId: number) => {
    setSliderRanges((prevSliderRanges) => {
      const currentRange =
        prevSliderRanges.get(variableId) ?? DEFAULT_SLIDER_RANGE;
      const nextSliderRanges = new Map(prevSliderRanges);
      nextSliderRanges.set(
        variableId,
        Math.max(currentRange - DEFAULT_SLIDER_RANGE, DEFAULT_SLIDER_RANGE),
      );
      return nextSliderRanges;
    });
  }, []);

  return {
    setSliderValues,
    handleChangeSlider,
    addSlider,
    removeSliderSettings,
    initialiseSliderSettings,
    getSliderValue,
    getSliderBounds,
    widenSliderRange,
    narrowSliderRange,
  };
};

export default useSliderSettings;
