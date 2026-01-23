import { FC } from "react";
import { Control } from "react-hook-form";

import { ModelFormData } from "../model/modelForm";
import HelpButton from "../../../components/HelpButton";
import SelectField from "../../../components/SelectField";
import { PharmacokineticListApiResponse } from "../../../app/backendApi";

type PKEffectModelSelectProps = {
  control: Control<ModelFormData>;
  defaultProps: Record<string, unknown>;
  helpImageEffect: string;
  pkModels: PharmacokineticListApiResponse;
};
export const PKEffectModelSelect: FC<PKEffectModelSelectProps> = ({
  control,
  defaultProps,
  helpImageEffect,
  pkModels,
}) => {
  const pkEffectModelFiltered = pkModels.filter((m) => m.model_type === "PKEF");

  const pk_effect_model_options = pkEffectModelFiltered.map((m) => {
    const label = m.name
      .replace("Effect compartment model ", "")
      .replace("(", "")
      .replace(")", "");
    return { value: m.id.toString(), label: label };
  });
  return (
    <>
      <SelectField
        size="small"
        label="Effect Model"
        name="pk_effect_model"
        control={control}
        options={pk_effect_model_options}
        formControlProps={{ sx: { width: "10rem" } }}
        selectProps={defaultProps}
      />
      <HelpButton
        title="Effect PK Model help"
        placement="right"
        maxWidth="850px"
      >
        <img
          src={`pk_effect/${helpImageEffect}`}
          alt="Effect PK model help"
          style={{ maxWidth: "800px" }}
        />
      </HelpButton>
    </>
  );
};
