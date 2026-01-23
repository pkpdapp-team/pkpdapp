import { Stack } from "@mui/material";
import { FC } from "react";
import { Control } from "react-hook-form";

import { ModelFormData } from "../model/modelForm";
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
  "direct_effects_emax",
  "direct_effects_imax",
  "indirect_effects_stimulation_elimination",
  "indirect_effects_inhibition_elimination",
  "indirect_effects_stimulation_production",
  "indirect_effects_inhibition_production",
  "indirect_effects_precursor_stimulation_production",
  "indirect_effects_precursor_inhibition_production",
  "tumour_growth_linear",
  "tumour_growth_exponential",
  "tumour_growth_gompertz",
  "tumour_growth_simeoni",
  "tumour_growth_simeoni_logistic",
  "tumour_growth_inhibition_delay_cell_distribution_conc_prop_kill",
  "tumour_growth_inhibition_delay_cell_distribution_emax_kill",
  "tumour_growth_inhibition_delay_cell_distribution_exp_conc_kill",
  "tumour_growth_inhibition_delay_signal_distribution_conc_prop_kill",
  "tumour_growth_inhibition_delay_signal_distribution_emax_kill",
  "tumour_growth_inhibition_delay_signal_distribution_exp_conc_kill",
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
      sx={{
        marginTop: 2,
        display: "flex",
        "& .MuiFormControlLabel-label": { fontSize: ".9rem" },
      }}
      direction="row"
      alignItems="center"
      spacing={1}
    >
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
