import { FC, Fragment, useState } from "react";
import {
  CombinedModelRead,
  PharmacodynamicRead,
  ProjectRead,
  usePharmacodynamicListQuery,
  usePharmacokineticListQuery,
  CompoundRead,
  UnitRead,
  TagRead,
} from "../../app/backendApi";
import { Control, Controller } from "react-hook-form";
import {
  Stack,
  Grid,
  Tooltip,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
  Chip,
} from "@mui/material";
import FloatField from "../../components/FloatField";
import UnitField from "../../components/UnitField";
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
  compound: CompoundRead;
  units: UnitRead[];
  tagsData: TagRead[];
}
//TMDD order: 
//  first all full TMDD models with one binding site, 
//  TMDD models 2 binding sites, 
//  TMDD bispecific, 
//  QSS models one binding site and 
//  finally extended MM
const pk_model_order = [
  "1-compartmental model",
  "2-compartmental model",
  "3-compartmental model",
  "3-compartment catenary model",

  "1-compartmental full TMDD model (1 binding site)",
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


const pk_model2_order = [
  "First order absorption model",
  "Transit compartments absorption model",
  "Ocular PK model",
  "Ocular PKPD VEGF (dimeric target) model",
  "Ocular PKPD bispecific (two different targets) model",
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

const PKPDModelTab: FC<Props> = ({
  model,
  project,
  control,
  compound,
  units,
  tagsData,
}: Props) => {
  // get list of pd models
  const { data: pdModels, isLoading: pdModelLoading } =
    usePharmacodynamicListQuery();
  const { data: pkModels, isLoading: pkModelLoading } =
    usePharmacokineticListQuery();
  const pkTags = project?.pk_tags || [];
  const pdTags = project?.pd_tags || [];

  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isSbmlModalOpen, setIsSbmlModalOpen] = useState(false);

  const loading = [pdModelLoading, pkModelLoading];
  if (loading.some((l) => l)) {
    return <div>Loading...</div>;
  }
  if (!pdModels || !pkModels || !tagsData) {
    return <div>Error loading models.</div>;
  }

  const version_greater_than_2 = project.version ? project.version >= 3 : false;

  const clinical = project.species === "H";
  const pkModelsFiltered = pkModels.filter((m) => {
    let is_pk_model = false;
    if (version_greater_than_2) {
      is_pk_model = m.model_type ? m.model_type === "PK" : false;
    } else {
      is_pk_model = m.name.includes(clinical ? "_clinical" : "_preclinical");
    }
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
  const pkModel2Filtered = pkModels.filter((m) => {
    return version_greater_than_2 && m.model_type === "PKEX";
  });
  pkModel2Filtered.sort((a, b) => {
    const aName = a.name;
    const bName = b.name;
    const aIndex = pk_model2_order.indexOf(aName);
    const bIndex = pk_model2_order.indexOf(bName);
    return aIndex - bIndex;
  });
  const pkEffectModelFiltered = pkModels.filter((m) => {
    return version_greater_than_2 && m.model_type === "PKEF";
  });
  const pdModelsFiltered = pdModels.filter((m) => {
    let is_pd_model = false;
    if (version_greater_than_2) {
      is_pd_model = m.model_type === "PD" || m.model_type === "TG";
    } else {
      is_pd_model = !m.name.includes("tumour_growth_inhibition");
    }
    if (m.tags) {
      for (const tag of pdTags) {
        if (!m.tags.includes(tag)) {
          return false;
        }
      }
    }
    return is_pd_model;
  });
  const pdModels2Filtered = pdModels.filter((m) => {
    if (version_greater_than_2) {
      return m.model_type === "TGI";
    } else {
      return m.name.includes("tumour_growth_inhibition");
    }
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
  pd_model_options.push({ value: "", label: "None" });
  const pk_model_options = pkModelsFiltered.map((m) => {
    return { value: m.id.toString(), label: m.name };
  });
  pk_model_options.push({ value: "", label: "None" });
  const pk_model2_options = model.pk_model
    ? pkModel2Filtered.map((m) => {
      return { value: m.id.toString(), label: m.name };
    })
    : [];
  pk_model2_options.push({ value: "", label: "None" });
  const pk_effect_model_options = pkEffectModelFiltered.map((m) => {
    const label = m.name.replace("Effect compartment model ", "").replace("(", "").replace(")", "");
    return { value: m.id.toString(), label: label };
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
    (version_greater_than_2
      ? pd_model?.model_type === "TG"
      : pd_model?.name.includes("tumour_growth") &&
      !pd_model?.name.includes("inhibition"));
  const pd_model2_options: { value: number | string; label: string }[] =
    pdModels2Filtered.map((m) => {
      return { value: m.id, label: m.name };
    });
  pd_model2_options.push({ value: "", label: "None" });

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

  const pkTagList = [
    "1-compartment",
    "2-compartment",
    "3-compartment",
    "PK",
    "TMDD",
    "QSS",
    "MM",
    "bispecific",
    "constant",
  ];
  const pdTagList = ["direct", "indirect", "TGI", "DDI"];
  const tagOptions = tagsData
    .filter((tag) => {
      return pkTagList.includes(tag.name);
    })
    .map((tag) => {
      return { value: tag.id, label: tag.name };
    });
  const pdTagOptions = tagsData
    .filter((tag) => {
      return pdTagList.includes(tag.name);
    })
    .map((tag) => {
      return { value: tag.id, label: tag.name };
    });

  const effectCompartmentTooltip =
    "Effect compartments will be driven by the concentration in the central compartment (C1), unless unbound concentration for C1 is selected, in which case the effect compartment is driven by the unbound concentration (calc_C1_f)";
  const modelTypesLabel = "Filter by Model Type";

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
              control={control}
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
                  control={control}
                  textFieldProps={{
                    sx: { width: "calc(50% - 7rem)" },
                    ...defaultProps,
                  }}
                />
                <UnitField
                  size="small"
                  label={"Unit"}
                  name={`species_weight_unit`}
                  control={control}
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
          {version_greater_than_2 && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Controller
                name="pk_tags"
                control={control}
                render={({ field: { onChange } }) => (
                  <FormControl sx={{ width: "calc(100% - 3rem)" }} size="small">
                    <InputLabel id="tags-label">{modelTypesLabel}</InputLabel>
                    <Select
                      size="small"
                      labelId="tags-label"
                      id="tags"
                      multiple
                      value={pkTags}
                      onChange={onChange}
                      input={
                        <OutlinedInput
                          id="select-multiple-tags"
                          label={modelTypesLabel}
                        />
                      }
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {selected.map((value) => {
                            const label = tagOptions.find(
                              (tag) => tag.value === value,
                            )?.label;
                            return <Chip key={value} label={label} />;
                          })}
                        </Box>
                      )}
                    >
                      {tagOptions.map((tag) => (
                        <MenuItem key={tag.value} value={tag.value}>
                          {tag.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Stack>
          )}
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
          </Stack>

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
                      control={control}
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
                      control={control}
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
                        control={control}
                        options={Array.from(Array(6).keys()).map((i) => {
                          return { value: i, label: i.toString() };
                        })}
                        formControlProps={{ sx: { width: "4rem" } }}
                        selectProps={defaultProps}
                      />
                    </div>
                  </Tooltip>
                  <SelectField
                    size="small"
                    label="Effect Model"
                    name="pk_effect_model"
                    control={control}
                    options={pk_effect_model_options}
                    formControlProps={{ sx: { width: "10rem" } }}
                    selectProps={defaultProps}
                  />
                  <Tooltip title="Includes Anti-Drug Antibodies">
                    <div>
                      <Checkbox
                        label="ADA"
                        name="has_anti_drug_antibodies"
                        control={control}
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
            <Stack
              sx={{
                marginTop: 2,
                display: "flex",
                "& .MuiFormControlLabel-label": { fontSize: ".9rem" },
              }}
              direction="row" alignItems="center" spacing={1}>
              <SelectField
                size="small"
                label="Extravascular PK Model"
                name="pk_model2"
                control={control}
                options={pk_model2_options}
                formControlProps={{ sx: { width: "calc(100% - 3rem)" } }}
                selectProps={defaultProps}
              />
            </Stack>
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
            <Controller
              name="pd_tags"
              control={control}
              render={({ field: { onChange } }) => (
                <FormControl sx={{ width: "calc(100% - 3rem)" }} size="small">
                  <InputLabel id="tags-label">{modelTypesLabel}</InputLabel>
                  <Select
                    size="small"
                    labelId="tags-label"
                    id="tags"
                    multiple
                    value={pdTags}
                    onChange={onChange}
                    input={
                      <OutlinedInput
                        id="select-multiple-tags"
                        label={modelTypesLabel}
                      />
                    }
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => {
                          const label = pdTagOptions.find(
                            (tag) => tag.value === value,
                          )?.label;
                          return <Chip key={value} label={label} />;
                        })}
                      </Box>
                    )}
                  >
                    {pdTagOptions.map((tag) => (
                      <MenuItem key={tag.value} value={tag.value}>
                        {tag.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          )}
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
          </Stack>
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
            </Stack>
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
