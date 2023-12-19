import * as React from "react";
import {
  CombinedModelRead,
  CombinedModelUpdateApiArg,
  Pharmacokinetic,
  PharmacokineticRead,
  PharmacodynamicRead,
  ProjectRead,
  usePharmacodynamicListQuery,
  usePharmacokineticListQuery,
} from "../../app/backendApi";
import { Control } from "react-hook-form";
import {
  FormControlLabel,
  Stack,
  Typography,
  Grid,
  Checkbox as MuiCheckbox,
  Tooltip,
  Box,
} from "@mui/material";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";
import SelectField from "../../components/SelectField";
import Checkbox from "../../components/Checkbox";
import HelpButton from "../../components/HelpButton";
import { FormData } from "./Model";
import { speciesOptions } from "../projects/Project";

interface Props {
  model: CombinedModelRead;
  project: ProjectRead;
  control: Control<FormData>;
  updateModel: (data: CombinedModelUpdateApiArg) => void;
}

const PKPDModelTab: React.FC<Props> = ({ model, project, control }: Props) => {
  // get list of pd models
  const { data: pdModels, isLoading: pdModelLoading } =
    usePharmacodynamicListQuery();
  const { data: pkModels, isLoading: pkModelLoading } =
    usePharmacokineticListQuery();
  const [showCode, setShowCode] = React.useState(false);

  const loading = [pdModelLoading, pkModelLoading];
  if (loading.some((l) => l)) {
    return <div>Loading...</div>;
  }
  if (!pdModels || !pkModels) {
    return <div>Error loading models.</div>;
  }

  const clinical = project.species === "H";
  const pkModelsFiltered = pkModels.filter(
    (m: Pharmacokinetic) =>
      !m.name.includes(!clinical ? "_clinical" : "_preclinical"),
  );
  const pdModelsFiltered = pdModels.filter(
    (m) =>
      m.name !== "tumour_growth_inhibition_model_koch" &&
      m.name !== "tumour_growth_inhibition_model_koch_reparametrised",
  );

  const pd_model_options: { value: number | string; label: string }[] =
    pdModelsFiltered.map((m) => {
      return { value: m.id, label: m.name };
    });
  pd_model_options.push({ value: "", label: "None" });
  const pk_model_options = pkModelsFiltered.map((m) => {
    return { value: m.id, label: m.name };
  });
  const pk_model_map = pkModels.reduce(
    (map, m) => {
      map[m.id] = m;
      return map;
    },
    {} as { [key: number]: PharmacokineticRead },
  );
  const pd_model_map = pdModels.reduce(
    (map, m) => {
      map[m.id] = m;
      return map;
    },
    {} as { [key: number]: PharmacodynamicRead },
  );

  const pdIsTumourGrowth =
    model.pd_model &&
    pd_model_map[model.pd_model].name.includes("tumour_growth") &&
    !pd_model_map[model.pd_model].name.includes("inhibition");
  const pd_model2_options: { value: number | string; label: string }[] =
    pdModelsFiltered
      .filter((m) => m.name.includes("tumour_growth_inhibition"))
      .map((m) => {
        return { value: m.id, label: m.name };
      });
  pd_model2_options.push({ value: "", label: "None" });
  const isTMDDmodel = model.pk_model
    ? pk_model_map[model.pk_model].name.includes("tmdd")
    : false;

  return (
    <Grid xs={12} container spacing={2}>
      <Grid item xl={5} md={8} xs={10}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <SelectField
            label="Species"
            name="project.species"
            control={control}
            options={speciesOptions}
            formControlProps={{ sx: { width: "calc(100% - 3rem)" } }}
          />
          <>
            {model.pk_model && (
              <HelpButton title={pk_model_map[model.pk_model].name}>
                <Typography>
                  {pk_model_map[model.pk_model].description}
                </Typography>
              </HelpButton>
            )}
          </>
        </Stack>
      </Grid>
      <Grid container item spacing={2}>
        <Grid item xl={5} md={8} xs={10}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <SelectField
              label="PK Model"
              name="model.pk_model"
              control={control}
              options={pk_model_options}
              formControlProps={{ sx: { width: "calc(100% - 3rem)" } }}
            />
            <>
              {model.pk_model && (
                <HelpButton title={pk_model_map[model.pk_model].name}>
                  <Typography>
                    {pk_model_map[model.pk_model].description}
                  </Typography>
                </HelpButton>
              )}
            </>
          </Stack>
          {model.pk_model && (
            <Stack
              sx={{
                display: "flex",
                "& .MuiFormControlLabel-label": { fontSize: ".9rem" },
              }}
              direction="row"
              alignItems="center"
              flexWrap="wrap"
              justifyContent="space-between"
            >
              <Tooltip title="Includes Michaellis-Menten parameters (CLmax and Km)">
                <div>
                  <Checkbox
                    label="Saturation"
                    name="model.has_saturation"
                    control={control}
                    checkboxFieldProps={{
                      disabled: isTMDDmodel || !model.pk_model,
                    }}
                  />
                </div>
              </Tooltip>
              <Tooltip title="Includes an effect compartment">
                <div style={{ fontSize: "12px !important" }}>
                  <Checkbox
                    label="Effect Compartment"
                    name="model.has_effect"
                    control={control}
                    checkboxFieldProps={{ disabled: !model.pk_model }}
                  />
                </div>
              </Tooltip>
              <Tooltip title="Includes a time delay following PO of SC administration">
                <div>
                  <Checkbox
                    label="Lag Time"
                    name="model.has_lag"
                    control={control}
                    checkboxFieldProps={{ disabled: !model.pk_model }}
                  />
                </div>
              </Tooltip>
              <Tooltip title="Includes bioavailability (F), if not selected F=1">
                <div>
                  <Checkbox
                    label="Bioavailability"
                    name="model.has_bioavailability"
                    control={control}
                    checkboxFieldProps={{ disabled: !model.pk_model }}
                  />
                </div>
              </Tooltip>
            </Stack>
          )}
        </Grid>
      </Grid>
      <Grid container item spacing={2}>
        <Grid item xl={5} md={8} xs={10}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <SelectField
              label="PD Model"
              name="model.pd_model"
              control={control}
              options={pd_model_options}
              formControlProps={{ sx: { width: "calc(100% - 3rem)" } }}
            />
            <>
              {model.pd_model && (
                <HelpButton title={pd_model_map[model.pd_model].name}>
                  <Typography>
                    {pd_model_map[model.pd_model].description}
                  </Typography>
                </HelpButton>
              )}
            </>
          </Stack>
        </Grid>
        <Box width="100%" height="0" />
        <Grid container item spacing={2} sx={{ paddingTop: "0" }}>
          <Grid item xs={12} md={8} xl={5} sx={{ paddingTop: "0 !important" }}>
            <Stack
              sx={{
                display: "flex",
                paddingTop: "0",
                "& .MuiFormControlLabel-label": { fontSize: ".9rem" },
              }}
              direction="row"
              alignItems="center"
              flexWrap="wrap"
              justifyContent="space-between"
            >
              {model.pd_model && (
                <Tooltip title="Includes the Hill coefficient to the PD response">
                  <div>
                    <Checkbox
                      label="Hill Coefficient"
                      name="model.has_hill_coefficient"
                      control={control}
                      checkboxFieldProps={{ disabled: !model.pd_model }}
                    />
                  </div>
                </Tooltip>
              )}
            </Stack>
          </Grid>
        </Grid>
        <Box width="100%" />
        {pdIsTumourGrowth && (
          <>
            <Grid item xl={5} md={8} xs={10}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <SelectField
                  label="Secondary PD Model"
                  name="model.pd_model2"
                  control={control}
                  options={pd_model2_options}
                  formControlProps={{ sx: { width: "calc(100% - 3rem)" } }}
                />
                <>
                  {model.pd_model2 && (
                    <HelpButton title={pd_model_map[model.pd_model2].name}>
                      <Typography>
                        {pd_model_map[model.pd_model2].description}
                      </Typography>
                    </HelpButton>
                  )}
                </>
              </Stack>
            </Grid>
          </>
        )}
        <Box width="100%" height="0" />
        <Grid item xs={5} sx={{ paddingTop: "1rem" }}>
          <Stack
            direction="row"
            sx={{ cursor: "pointer" }}
            onClick={() => setShowCode(!showCode)}
          >
            {showCode ? (
              <KeyboardDoubleArrowDownIcon sx={{ color: "blue" }} />
            ) : (
              <KeyboardDoubleArrowRightIcon sx={{ color: "blue" }} />
            )}
            <Typography paddingLeft=".5rem">Show code</Typography>
          </Stack>
        </Grid>
        {showCode && (
          <Grid item xs={12}>
            <Typography sx={{ whiteSpace: "pre-wrap" }}>{model.mmt}</Typography>
          </Grid>
        )}
      </Grid>
    </Grid>
  );
};

export default PKPDModelTab;
