import { CombinedModelRead, VariableRead } from "../app/backendApi";

type numberEffectCompartmentParameterNameProps = {
  variable: VariableRead;
  model: CombinedModelRead;
};

export const effectCompartmentParameterName = ({
  variable, model
}: numberEffectCompartmentParameterNameProps) => {

  let variable_name = variable.name;

  if (
    model.number_of_effect_compartments &&
    model.number_of_effect_compartments > 1 &&
    variable.qname.startsWith("Effect")
  ) {
    const compartment_name = variable.qname.split(".")[0];
    const compartment_number = compartment_name.slice(
      17,
      compartment_name.length,
    );
    if (variable_name.startsWith("Ce")) {
      variable_name = `Ce${compartment_number}`;
    } else {
      variable_name = `${variable.name}_Ce${compartment_number}`;
    }
  }
  return variable_name;
}