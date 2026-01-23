import { FC } from "react";
import { Stack } from "@mui/material";
import { Control } from "react-hook-form";
import { FormData } from "../Model";

import HelpButton from "../../../components/HelpButton";
import SelectField from "../../../components/SelectField";
import {
  ProjectRead,
  PharmacokineticListApiResponse,
} from "../../../app/backendApi";

type PKModelSelectProps = {
  control: Control<FormData>;
  defaultProps: Record<string, unknown>;
  helpImagePk: string;
  pkModels: PharmacokineticListApiResponse;
  project: ProjectRead;
};

/**TMDD order:
  first all full TMDD models with one binding site,
  TMDD models 2 binding sites,
  TMDD bispecific,
  QSS models one binding site and
  finally extended MM
*/
const pk_model_order = [
  "1-compartmental model",
  "2-compartmental model",
  "3-compartmental model",
  "3-compartment catenary model",

  "1-compartmental full TMDD model (1 binding site)",
  "1-compartmental full TMDD model (1 binding site) - constant target",
  "1-compartmental full TMDD model (1 binding site) - constant target concentration",
  "1-compartmental full TMDD model (1 binding site) - soluble target",
  "1-compartmental full TMDD model (1 binding site) - soluble target (catch and release)",
  "2-compartmental full TMDD model (1 binding site)",
  "2-compartmental full TMDD model (1 binding site) - constant target",
  "2-compartmental full TMDD model (1 binding site) - soluble target",
  "2-compartmental full TMDD model (1 binding site) - soluble target (catch and release)",

  "1-compartmental full TMDD model (2 binding sites)",
  "1-compartmental full TMDD model (2 binding sites) - constant target",
  "1-compartmental full TMDD model (2 binding sites) - soluble target",
  "2-compartmental full TMDD model (2 binding sites)",
  "2-compartmental full TMDD model (2 binding sites) - constant target",
  "2-compartmental full TMDD model (2 binding sites) - soluble target",

  "1-compartmental bispecific TMDD model",
  "1-compartmental bispecific TMDD model - soluble targets",
  "2-compartmental bispecific TMDD model",
  "2-compartmental bispecific TMDD model - soluble targets",

  "1-compartmental QSS TMDD model (1 binding site)",
  "1-compartmental QSS TMDD model (1 binding site) - constant target",
  "1-compartmental QSS TMDD model (1 binding site) - soluble target",
  "1-compartmental QSS TMDD model (1 binding site) - soluble target (catch and release)",
  "2-compartmental QSS TMDD model (1 binding site)",
  "2-compartmental QSS TMDD model (1 binding site) - constant target",
  "2-compartmental QSS TMDD model (1 binding site) - soluble target",
  "2-compartmental QSS TMDD model (1 binding site) - soluble target (catch and release)",

  "1-compartmental extended Michaelis-Menten TMDD model",
  "1-compartmental extended Michaelis-Menten TMDD model - constant target",
  "2-compartmental extended Michaelis-Menten TMDD model",
  "2-compartmental extended Michaelis-Menten TMDD model - constant target",
];

export const PKModelSelect: FC<PKModelSelectProps> = ({
  control,
  defaultProps,
  helpImagePk,
  pkModels,
  project,
}) => {
  const pkTags = project?.pk_tags || [];
  const pkModelsFiltered = pkModels.filter((m) => {
    const is_pk_model = m.model_type ? m.model_type === "PK" : false;
    if (!is_pk_model) {
      return false;
    }
    if (m.tags) {
      for (const tag of pkTags) {
        if (!m.tags.includes(tag)) {
          return false;
        }
      }
    }
    return is_pk_model;
  });
  const pk_model_options = pkModelsFiltered.map((m) => {
    return { value: m.id.toString(), label: m.name };
  });
  // Sort pk_model_options according to pk_model_order
  pk_model_options.sort(
    (a, b) => pk_model_order.indexOf(a.label) - pk_model_order.indexOf(b.label),
  );
  pk_model_options.unshift({ value: "", label: "None" });
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
        label="PK Model"
        name="pk_model"
        control={control}
        options={pk_model_options}
        formControlProps={{ sx: { width: "calc(100% - 3rem)" } }}
        selectProps={defaultProps}
      />
      <HelpButton title="PK Model help" placement="right" maxWidth="850px">
        <img
          src={`pk_model/${helpImagePk}`}
          alt="PK model help"
          style={{ maxWidth: "800px" }}
        />
      </HelpButton>
    </Stack>
  );
};
