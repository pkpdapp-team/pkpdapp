import { FC, useState } from "react";
import {
  CombinedModelRead,
  Pharmacokinetic,
  PharmacodynamicRead,
  ProjectRead,
  usePharmacodynamicListQuery,
  usePharmacokineticListQuery,
} from "../../app/backendApi";
import { Control } from "react-hook-form";
import { Stack, Grid, Tooltip, Button } from "@mui/material";
import SelectField from "../../components/SelectField";
import Checkbox from "../../components/Checkbox";
import { FormData } from "./Model";
import { speciesOptions } from "../projects/Project";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectIsProjectShared } from "../login/loginSlice";
import { CodeModal } from "./CodeModal";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";

interface Props {
  model: CombinedModelRead;
  project: ProjectRead;
  control: Control<FormData>;
}

const pk_model_order = [
  "one_compartment",
  "two_compartment",
  "three_compartment",
  "one_compartment_tmdd_full",
  "one_compartment_tmdd_QSS",
  "one_compartment_tmdd_full_constant_target",
  "one_compartment_tmdd_qss_constant_target",
  "two_compartment_tmdd_full",
  "two_compartment_tmdd_QSS",
  "two_compartment_tmdd_full_constant_target",
  "two_compartment_tmdd_qss_constant_target",
];

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

const PKPDModelTab: FC<Props> = ({ model, project, control }: Props) => {
  // get list of pd models
  const { data: pdModels, isLoading: pdModelLoading } =
    usePharmacodynamicListQuery();
  const { data: pkModels, isLoading: pkModelLoading } =
    usePharmacokineticListQuery();
  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isSbmlModalOpen, setIsSbmlModalOpen] = useState(false);

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
    pdModelsFiltered
      .filter((m) => !m.name.includes("tumour_growth_inhibition"))
      .map((m) => {
        return { value: m.id, label: m.name };
      });
  pd_model_options.sort((a, b) => {
    const aName = a.label;
    const bName = b.label;
    const aIndex = pd_model_order.indexOf(aName);
    const bIndex = pd_model_order.indexOf(bName);
    return aIndex - bIndex;
  });
  pd_model_options.push({ value: "", label: "None" });
  const pk_model_options = pkModelsFiltered.map((m) => {
    return { value: m.id, label: m.name };
  });
  pk_model_options.sort((a, b) => {
    const aName = a.label.replace("_preclinical", "").replace("_clinical", "");
    const bName = b.label.replace("_preclinical", "").replace("_clinical", "");
    const aIndex = pk_model_order.indexOf(aName);
    const bIndex = pk_model_order.indexOf(bName);
    return aIndex - bIndex;
  });
  const pd_model_map = new Map<number, PharmacodynamicRead>(
    pdModels.map((m) => [m.id, m]),
  );
  const pd_model = pd_model_map.get(model.pd_model as number);
  const pd_model2 = pd_model_map.get(model.pd_model2 as number);

  const pdIsTumourGrowth =
    model.pd_model &&
    pd_model?.name.includes("tumour_growth") &&
    !pd_model?.name.includes("inhibition");
  const pd_model2_options: { value: number | string; label: string }[] =
    pdModelsFiltered
      .filter((m) => m.name.includes("tumour_growth_inhibition"))
      .map((m) => {
        return { value: m.id, label: m.name };
      });
  pd_model2_options.push({ value: "", label: "None" });

  const pdModelHasHillCoefficient =
    pd_model?.name.includes("indirect") ||
    pd_model?.name.includes("direct") ||
    pd_model2?.name.includes("emax_kill");

  const defaultProps = {
    disabled: isSharedWithMe,
  };

  return (
    <Stack direction="column" spacing={2} marginTop={5}>
      <Grid container spacing={2}>
        <Grid
          size={{
            xl: 4,
            md: 8,
            xs: 10,
          }}
        >
          <SelectField
            size="small"
            label="Species"
            name="species"
            control={control}
            options={speciesOptions}
            formControlProps={{ sx: { width: "calc(100% - 3rem)" } }}
            selectProps={defaultProps}
          />
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid
          size={{
            xl: 4,
            md: 8,
            xs: 10,
          }}
        >
          <Stack direction="column">
            <SelectField
              size="small"
              label="PK Model"
              name="pk_model"
              control={control}
              options={pk_model_options}
              formControlProps={{ sx: { width: "calc(100% - 3rem)" } }}
              selectProps={defaultProps}
            />
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
                <Tooltip title="Includes Michaelis-Menten parameters (CLmax and Km)">
                  <div>
                    <Checkbox
                      label="Saturation"
                      name="has_saturation"
                      control={control}
                      checkboxFieldProps={{
                        disabled: !model.pk_model || isSharedWithMe,
                      }}
                    />
                  </div>
                </Tooltip>
                <Tooltip title="Includes an effect compartment">
                  <div style={{ fontSize: "12px !important" }}>
                    <Checkbox
                      label="Effect Compartment"
                      name="has_effect"
                      control={control}
                      checkboxFieldProps={{
                        disabled: !model.pk_model || isSharedWithMe,
                      }}
                    />
                  </div>
                </Tooltip>
                <Tooltip title="Includes a time delay following PO or SC administration">
                  <div>
                    <Checkbox
                      label="Lag Time"
                      name="has_lag"
                      control={control}
                      checkboxFieldProps={{
                        disabled: !model.pk_model || isSharedWithMe,
                      }}
                    />
                  </div>
                </Tooltip>
                <Tooltip title="Includes bioavailability (F), if not selected F=1">
                  <div>
                    <Checkbox
                      label="Bioavailability"
                      name="has_bioavailability"
                      control={control}
                      checkboxFieldProps={{
                        disabled: !model.pk_model || isSharedWithMe,
                      }}
                    />
                  </div>
                </Tooltip>
              </Stack>
            )}
          </Stack>
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid
          size={{
            xl: 4,
            md: 8,
            xs: 10,
          }}
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
        </Grid>

        {pdIsTumourGrowth && (
          <Grid
            size={{
              xl: 4,
              md: 8,
              xs: 10,
            }}
          >
            <SelectField
              size="small"
              label="Secondary PD Model"
              name="pd_model2"
              control={control}
              options={pd_model2_options}
              formControlProps={{ sx: { width: "calc(100% - 3rem)" } }}
              selectProps={defaultProps}
            />
          </Grid>
        )}
      </Grid>
      <Grid container spacing={2} sx={{ paddingTop: "0" }}>
        <Grid
          size={{
            xs: 12,
            md: 8,
            xl: 5,
          }}
        >
          <Stack
            direction="column"
            sx={{
              paddingTop: "0",
              "& .MuiFormControlLabel-label": { fontSize: ".9rem" },
            }}
          >
            {pdModelHasHillCoefficient && (
              <Tooltip title="Includes the Hill coefficient to the PD response">
                <div>
                  <Checkbox
                    label="Hill Coefficient"
                    name="has_hill_coefficient"
                    control={control}
                    checkboxFieldProps={{
                      disabled: !model.pd_model || isSharedWithMe,
                    }}
                  />
                </div>
              </Tooltip>
            )}
            <Stack direction="row" spacing={1} sx={{ marginTop: "1rem" }}>
              <Button
                variant="outlined"
                onClick={() => setIsCodeModalOpen(true)}
                endIcon={<CodeOutlinedIcon />}
              >
                Show MMT code
              </Button>
              <Button
                variant="outlined"
                onClick={() => setIsSbmlModalOpen(true)}
                endIcon={<CodeOutlinedIcon />}
              >
                Show SBML code
              </Button>
            </Stack>
          </Stack>
        </Grid>
      </Grid>
      <CodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        code={model.mmt}
        language="mmt"
      />
      <CodeModal
        isOpen={isSbmlModalOpen}
        onClose={() => setIsSbmlModalOpen(false)}
        code={model.sbml}
        language="xml"
      />
    </Stack>
  );
};

export default PKPDModelTab;
