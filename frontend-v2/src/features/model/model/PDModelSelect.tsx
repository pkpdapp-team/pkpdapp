import { Stack } from "@mui/material";
import { FC } from "react";
import { Control } from "react-hook-form";

import { ModelFormData } from "../modelFormState";
import HelpButton from "../../../components/HelpButton";
import SelectField from "../../../components/SelectField";
import {
  PharmacodynamicListApiResponse,
  ProjectRead,
} from "../../../app/backendApi";

type PDModelSelectProps = {
  control: Control<ModelFormData>;
  defaultProps: Record<string, unknown>;
  helpImagePd: string;
  pdModels: PharmacodynamicListApiResponse;
  project: ProjectRead;
};

const pd_model_order = [
  "Direct effect model (inhibitory)",
  "Direct effect model (stimulatory)",
  "Competitive inhibition (DDI)",
  "Time-dependent inhibition (DDI)",
  "Time-dependent induction (DDI)",
  "Time-dependent and competitive inhibition (DDI)",
  "Time-dependent, competitive inhibition, and induction (Model 1) (DDI)",
  "Time-dependent, competitive inhibition, and induction (Model 2) (DDI)",
  "Indirect effect model (inhibition of elimination)",
  "Indirect effect model (inhibition of production)",
  "Indirect effect model with precursor (inhibition of precursor elimination)",
  "Indirect effect model with precursor (stimulation of precursor elimination)",
  "Indirect effect model (stimulation of elimination)",
  "Indirect effect model (stimulation of production)",
  "Protein degradation model",
  "Tumor growth model (exponential)",
  "Tumor growth model (Gompertz)",
  "Tumor growth model (linear)",
  "Tumor growth model (Simeoni-logistic)",
  "Tumor growth model (Simeoni)",
];

export const PDModelSelect: FC<PDModelSelectProps> = ({
  control,
  defaultProps,
  helpImagePd,
  pdModels,
  project,
}) => {
  const pdTags = project?.pd_tags || [];
  const pdModelsFiltered = pdModels.filter((m) => {
    const is_pd_model = m.model_type === "PD" || m.model_type === "TG";
    if (m.tags) {
      for (const tag of pdTags) {
        if (!m.tags.includes(tag)) {
          return false;
        }
      }
    }
    return is_pd_model;
  });
  const pd_model_options: { value: number | string; label: string }[] =
    pdModelsFiltered.map((m) => {
      return { value: m.id, label: m.name };
    });
  pd_model_options.sort((a, b) => {
    const aName = a.label;
    const bName = b.label;
    const aIndex = pd_model_order.indexOf(aName);
    const bIndex = pd_model_order.indexOf(bName);
    return aIndex - bIndex;
  });
  pd_model_options.unshift({ value: "", label: "None" });
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        marginTop: 2,
        display: "flex",
        "& .MuiFormControlLabel-label": { fontSize: ".9rem" }
      }}>
      <SelectField
        size="small"
        label="PD Model"
        name="pd_model"
        control={control}
        options={pd_model_options}
        formControlProps={{ sx: { width: "calc(100% - 3rem)" } }}
        selectProps={defaultProps}
      />
      <HelpButton title="PD Model help" placement="right" maxWidth="850px">
        <img
          src={`pd_model/${helpImagePd}`}
          alt="PD model help"
          style={{ maxWidth: "800px" }}
        />
      </HelpButton>
    </Stack>
  );
};
