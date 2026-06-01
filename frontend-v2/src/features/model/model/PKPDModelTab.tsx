import { FC, Fragment, useState } from "react";
import {
  CombinedModelRead,
  PharmacodynamicRead,
  ProjectRead,
  usePharmacodynamicListQuery,
  usePharmacokineticListQuery,
  CompoundRead,
  UnitRead,
} from "../../../app/backendApi";
import { Control } from "react-hook-form";
import { Stack, Grid, Tooltip, Box, Button } from "@mui/material";
import FloatField from "../../../components/FloatField";
import UnitField from "../../../components/UnitField";
import SelectField from "../../../components/SelectField";
import Checkbox from "../../../components/Checkbox";
import { ModelFormData } from "../modelFormState";
import { ProjectFormData } from "../projectFormState";
import { speciesOptions } from "../../projects/Project";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { selectIsProjectShared } from "../../login/loginSlice";
import { CodeModal } from "../CodeModal";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";
import { PKModelSelect } from "./PKModelSelect";
import { PDModelSelect } from "./PDModelSelect";
import { PKModel2Select } from "./PKModel2Select";
import { PDModel2Select } from "./PDModel2Select";
import { PKEffectModelSelect } from "./PKEffectModelSelect";
import { PKTagSelect } from "./PKTagSelect";
import { PDTagSelect } from "./PDTagSelect";

interface Props {
  model: CombinedModelRead;
  project: ProjectRead;
  modelControl: Control<ModelFormData>;
  projectControl: Control<ProjectFormData>;
  compound: CompoundRead;
  units: UnitRead[];
}

// Maps of model name to documentation image filename (to be filled later)
const helpImages: {
  pk: Record<string, string>;
  pk2: Record<string, string>;
  effect: Record<string, string>;
  pd: Record<string, string>;
  pd2: Record<string, string>;
} = {
  pk: {
    "1-compartmental model": "One compartmenal PK model.jpg",
    "3-compartmental model": "Three compartmenal PK model (mammillary).jpg",
    "3-compartment catenary model":
      "Three compartmenal PK model (catenary).jpg",
  },
  pk2: {
    "First order absorption model": "First order absorption model.jpg",
    "Ocular PK model": "Ocular PK model.jpg",
    "Transit compartments absorption model":
      "Transit compartments absorption model.jpg",
  },
  effect: {
    "Effect compartment model (ke0 & Kp)":
      "Effect compartment model (version 1).jpg",
    "Effect compartment model (kin & kout)":
      "Effect compartment model (version 2).jpg",
  },
  pd: {},
  pd2: {},
};

const PKPDModelTab: FC<Props> = ({
  model,
  project,
  modelControl,
  projectControl,
  compound,
  units,
}: Props) => {
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

  const version_greater_than_2 = project.version ? project.version >= 3 : false;

  const pd_model_map = new Map<number, PharmacodynamicRead>(
    pdModels.map((m) => [m.id, m]),
  );
  const pd_model = pd_model_map.get(model.pd_model as number);
  const pd_model2 = pd_model_map.get(model.pd_model2 as number);

  const pdIsTumourGrowth =
    model.pd_model &&
    (version_greater_than_2
      ? pd_model?.model_type === "TG"
      : pd_model?.name.includes("tumour_growth") &&
        !pd_model?.name.includes("inhibition"));

  const pdModelHasHillCoefficient = version_greater_than_2
    ? pd_model?.mmt?.includes("desc: Hill coefficient") ||
      pd_model2?.mmt?.includes("desc: Hill coefficient")
    : pd_model?.name.includes("indirect") ||
      pd_model?.name.includes("direct") ||
      pd_model2?.name.includes("emax_kill");

  const defaultProps = {
    disabled: isSharedWithMe,
    displayEmpty: true,
  };

  const effectCompartmentTooltip =
    "Effect compartments will be driven by the concentration in the central compartment (C1), unless unbound concentration for C1 is selected, in which case the effect compartment is driven by the unbound concentration (calc_C1_f)";

  const pkSelected = pkModels.find((m) => m.id === model.pk_model);
  const pk2Selected = pkModels.find((m) => m.id === model.pk_model2);
  const effectSelected = pkModels.find((m) => m.id === model.pk_effect_model);
  const pdSelected = pdModels.find((m) => m.id === model.pd_model);
  const pd2Selected = pdModels.find((m) => m.id === model.pd_model2);
  const helpImagePk =
    (pkSelected?.name && helpImages.pk[pkSelected.name]) || "placeholder.jpg";
  const helpImagePk2 =
    (pk2Selected?.name && helpImages.pk2[pk2Selected.name]) ||
    "placeholder.jpg";
  const helpImageEffect =
    (effectSelected?.name && helpImages.effect[effectSelected.name]) ||
    "placeholder.jpg";
  const helpImagePd =
    (pdSelected?.name && helpImages.pd[pdSelected.name]) || "placeholder.jpg";
  const helpImagePd2 =
    (pd2Selected?.name && helpImages.pd2[pd2Selected.name]) ||
    "placeholder.jpg";

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
          <Stack direction="row" spacing={1}>
            <SelectField
              size="small"
              label="Species"
              name="species"
              control={projectControl}
              options={speciesOptions}
              formControlProps={{ sx: { width: "calc(50% - 3rem)" } }}
              selectProps={defaultProps}
            />
            {version_greater_than_2 && (
              <Fragment>
                <FloatField
                  size="small"
                  sx={{ flex: "1" }}
                  label="Weight"
                  name={`species_weight`}
                  control={projectControl}
                  textFieldProps={{
                    sx: { width: "calc(50% - 7rem)" },
                    ...defaultProps,
                  }}
                />
                <UnitField
                  size="small"
                  label={"Unit"}
                  name={`species_weight_unit`}
                  control={projectControl}
                  baseUnit={units.find(
                    (u) => u.id === project.species_weight_unit,
                  )}
                  selectProps={{
                    sx: { width: "6rem" },
                    ...defaultProps,
                    disabled: true,
                  }}
                />
              </Fragment>
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
          <Stack direction="row" alignItems="center" spacing={1}>
            <PKTagSelect control={projectControl} project={project} />
          </Stack>
          <PKModelSelect
            control={modelControl}
            defaultProps={defaultProps}
            helpImagePk={helpImagePk}
            pkModels={pkModels}
            project={project}
          />

          {model.pk_model && (
            <Stack
              sx={{
                marginTop: 2,
                display: "flex",
                "& .MuiFormControlLabel-label": { fontSize: ".9rem" },
              }}
              direction="row"
              spacing={3}
            >
              {!version_greater_than_2 && (
                <Tooltip title="Includes Michaelis-Menten parameters (CLmax and Km)">
                  <div>
                    <Checkbox
                      label="Saturation"
                      name="has_saturation"
                      control={modelControl}
                      checkboxFieldProps={{
                        disabled: !model.pk_model || isSharedWithMe,
                      }}
                    />
                  </div>
                </Tooltip>
              )}
              {!version_greater_than_2 && (
                <Tooltip title="Includes an effect compartment">
                  <div style={{ fontSize: "12px !important" }}>
                    <Checkbox
                      label="Effect Compartment"
                      name="has_effect"
                      control={modelControl}
                      checkboxFieldProps={{
                        disabled: !model.pk_model || isSharedWithMe,
                      }}
                    />
                  </div>
                </Tooltip>
              )}
              {version_greater_than_2 && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Tooltip title={effectCompartmentTooltip} placement="top">
                    <div style={{ fontSize: "12px !important" }}>
                      <SelectField
                        size="small"
                        label="Effect Compartments"
                        name="number_of_effect_compartments"
                        control={modelControl}
                        options={Array.from(Array(6).keys()).map((i) => {
                          return { value: i, label: i.toString() };
                        })}
                        formControlProps={{ sx: { width: "4rem" } }}
                        selectProps={defaultProps}
                      />
                    </div>
                  </Tooltip>
                  <PKEffectModelSelect
                    control={modelControl}
                    defaultProps={defaultProps}
                    helpImageEffect={helpImageEffect}
                    pkModels={pkModels}
                  />
                  <Tooltip title="Includes Anti-Drug Antibodies">
                    <div>
                      <Checkbox
                        label="ADA"
                        name="has_anti_drug_antibodies"
                        control={modelControl}
                        checkboxFieldProps={{
                          disabled:
                            !model.pk_model ||
                            isSharedWithMe ||
                            compound.compound_type !== "LM",
                        }}
                      />
                    </div>
                  </Tooltip>
                </Stack>
              )}
            </Stack>
          )}
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
          {version_greater_than_2 && (
            <PKModel2Select
              control={modelControl}
              defaultProps={defaultProps}
              helpImagePk2={helpImagePk2}
              pkModels={pkModels}
            />
          )}
          {(model.pk_model2 || !version_greater_than_2) && (
            <Stack
              sx={{
                display: "flex",
                "& .MuiFormControlLabel-label": { fontSize: ".9rem" },
              }}
              direction="row"
              spacing={3}
            >
              <Tooltip title="Includes a time delay following PO or SC administration">
                <div>
                  <Checkbox
                    label="Lag Time"
                    name="has_lag"
                    control={modelControl}
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
                    control={modelControl}
                    checkboxFieldProps={{
                      disabled: !model.pk_model || isSharedWithMe,
                    }}
                  />
                </div>
              </Tooltip>
            </Stack>
          )}
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
          <PDTagSelect control={projectControl} project={project} />
          <PDModelSelect
            control={modelControl}
            defaultProps={defaultProps}
            helpImagePd={helpImagePd}
            pdModels={pdModels}
            project={project}
          />
        </Grid>
        <Box width="100%" />
        {pdIsTumourGrowth && (
          <Grid
            size={{
              xl: 4,
              md: 8,
              xs: 10,
            }}
          >
            <PDModel2Select
              control={modelControl}
              defaultProps={defaultProps}
              helpImagePd2={helpImagePd2}
              pdModels={pdModels}
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
          sx={{ paddingTop: "0 !important" }}
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
                    control={modelControl}
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
