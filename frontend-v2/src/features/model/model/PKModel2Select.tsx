import { FC } from "react";
import { Stack } from "@mui/material";
import { Control } from "react-hook-form";
import { ModelFormData } from "../Model";

import HelpButton from "../../../components/HelpButton";
import SelectField from "../../../components/SelectField";
import { PharmacokineticListApiResponse } from "../../../app/backendApi";

type PKModel2SelectProps = {
  control: Control<ModelFormData>;
  defaultProps: Record<string, unknown>;
  helpImagePk2: string;
  pkModels: PharmacokineticListApiResponse;
};

const pk_model2_order = [
  "First order absorption model",
  "First order absorption model (two absorption sites)",
  "Transit compartments absorption model",
  "Ocular PK model",
  "Ocular PKPD VEGF (dimeric target) model",
  "Ocular PKPD bispecific (two different targets) model",
];

export const PKModel2Select: FC<PKModel2SelectProps> = ({
  control,
  defaultProps,
  helpImagePk2,
  pkModels,
}) => {
  const pkModelsFiltered = pkModels.filter((m) =>
    m.model_type ? m.model_type === "PKEX" : false,
  );
  const pk_model2_options = pkModelsFiltered.map((m) => {
    return { value: m.id.toString(), label: m.name };
  });
  // Sort pk_model2_options according to pk_model2_order
  pk_model2_options.sort(
    (a, b) =>
      pk_model2_order.indexOf(a.label) - pk_model2_order.indexOf(b.label),
  );
  pk_model2_options.unshift({ value: "", label: "None" });
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
        label="Extravascular PK Model"
        name="pk_model2"
        control={control}
        options={pk_model2_options}
        formControlProps={{ sx: { width: "calc(100% - 3rem)" } }}
        selectProps={defaultProps}
      />
      <HelpButton
        title="Extravascular PK Model help"
        placement="right"
        maxWidth="850px"
      >
        <img
          src={`pk_extravascular/${helpImagePk2}`}
          alt="Extravascular PK model help"
          style={{ maxWidth: "800px" }}
        />
      </HelpButton>
    </Stack>
  );
};
