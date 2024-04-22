import { useMemo } from 'react';
import { VariableRead } from '../../app/backendApi';

type SliderValues = { [key: number]: number };

const DEFAULT_VARS: { qname: string, value: number | undefined }[] = [];

const getVariablesSimulated = (
  variables?: VariableRead[],
  sliderValues?: SliderValues,
) => {
  const constantVariables = variables?.filter((v) => v.constant) || [];
  const merged = constantVariables.map((v: VariableRead) => {
    const result = { qname: v.qname, value: v.default_value };
    if (sliderValues && sliderValues[v.id]) {
      result.value = sliderValues[v.id];
    }
    return result;
  });
  return merged;
};

export default function useSimulatedVariables(
  variables: VariableRead[] | undefined,
  sliderValues: SliderValues | undefined
) {
  return useMemo(() => variables && sliderValues ?
    getVariablesSimulated(variables, sliderValues) :
    DEFAULT_VARS,
  [variables, sliderValues]);
}
