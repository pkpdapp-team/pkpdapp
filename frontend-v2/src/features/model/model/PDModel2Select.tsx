import { Stack } from "@mui/material";
import { Control } from "react-hook-form";
import { FC } from "react";

import { FormData } from "../Model";
import { PharmacodynamicListApiResponse } from "../../../app/backendApi";
import HelpButton from "../../../components/HelpButton";
import SelectField from "../../../components/SelectField";

type PDModel2SelectProps = {
  control: Control<FormData>;
  defaultProps: Record<string, unknown>;
  helpImagePd2: string;
  pdModels: PharmacodynamicListApiResponse;
};
export const PDModel2Select: FC<PDModel2SelectProps> = ({
  control,
  defaultProps,
  helpImagePd2,
  pdModels,
}) => {
  const pdModels2Filtered = pdModels.filter((m) => m.model_type === "TGI");
  const pd_model2_options: { value: number | string; label: string }[] =
    pdModels2Filtered.map((m) => {
      return { value: m.id, label: m.name };
    });
  pd_model2_options.unshift({ value: "", label: "None" });
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <SelectField
        size="small"
        label="Secondary PD Model"
        name="pd_model2"
        control={control}
        options={pd_model2_options}
        formControlProps={{ sx: { width: "calc(100% - 3rem)" } }}
        selectProps={defaultProps}
      />
      <HelpButton
        title="Secondary PD Model help"
        placement="right"
        maxWidth="850px"
      >
        <img
          src={`pd_model/${helpImagePd2}`}
          alt="Secondary PD model help"
          style={{ maxWidth: "800px" }}
        />
      </HelpButton>
    </Stack>
  );
};
