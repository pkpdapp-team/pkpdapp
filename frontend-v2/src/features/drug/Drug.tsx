import {
  Box,
  Button,
  Grid,
  IconButton,
  Radio,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  Compound,
  CompoundRead,
  EfficacyExperimentRead,
  ProjectRead,
  UnitListApiResponse,
  useCompoundRetrieveQuery,
  useCompoundUpdateMutation,
  useEfficacyExperimentCreateMutation,
  useEfficacyExperimentDestroyMutation,
  useEfficacyExperimentUpdateMutation,
  useProjectRetrieveQuery,
  useUnitListQuery,
} from "../../app/backendApi";
import { useForm, useFormState } from "react-hook-form";
import FloatField from "../../components/FloatField";
import { FC, useCallback, useEffect, useState } from "react";
import TextField from "../../components/TextField";
import SelectField from "../../components/SelectField";
import { selectIsProjectShared } from "../login/loginSlice";
import { TableHeader } from "../../components/TableHeader";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import Delete from "@mui/icons-material/Delete";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import { getTableHeight } from "../../shared/calculateTableHeights";
import useDirty from "../../hooks/useDirty";

export const DOUBLE_TABLE_SECOND_BREAKPOINTS = [
  {
    minHeight: 1100,
    tableHeight: "50vh",
  },
  {
    minHeight: 1000,
    tableHeight: "47vh",
  },
  {
    minHeight: 900,
    tableHeight: "45vh",
  },
  {
    minHeight: 800,
    tableHeight: "40vh",
  },
  {
    minHeight: 700,
    tableHeight: "37vh",
  },
  {
    minHeight: 600,
    tableHeight: "30vh",
  },
  {
    minHeight: 500,
    tableHeight: "28vh",
  },
];

interface DrugFormProps {
  project: ProjectRead;
  compound: CompoundRead;
  units: UnitListApiResponse;
}
const DrugForm: FC<DrugFormProps> = ({ project, compound, units }) => {
  const [updateCompound] = useCompoundUpdateMutation();
  const [createEfficacyExperiment] = useEfficacyExperimentCreateMutation();
  const [destroyEfficacyExperiment] = useEfficacyExperimentDestroyMutation();
  const [updateEfficacyExperiment] = useEfficacyExperimentUpdateMutation();

  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );
  const [isEditIndex, setIsEditIndex] = useState<number | null>(null);

  // create a form for the compound data using react-hook-form
  const { reset, handleSubmit, control, setValue, getValues } =
    useForm<Compound>({
      defaultValues: compound,
    });
  const { isDirty, defaultValues } = useFormState({ control });
  useDirty(isDirty);

  const submitForm = useCallback(
    async (data: Compound) => {
      if (isDirty) {
        // strange bug in react-hook-form is creating efficancy_experiments with undefined compounds, remove these for now.
        data.efficacy_experiments = data.efficacy_experiments
          .filter(
            (efficacy_experiment) => efficacy_experiment.compound !== undefined,
          )
          // make sure experiments are sorted by ID
          .sort(
            (a, b) =>
              (a as EfficacyExperimentRead).id -
              (b as EfficacyExperimentRead).id,
          );
        reset(data);
        const result = await updateCompound({
          id: compound.id,
          compound: data,
        });
        if (result?.data) {
          const sortedEfficacyExperiments = [
            ...result.data.efficacy_experiments,
          ].sort((a, b) => a.id - b.id);
          reset({
            ...data,
            efficacy_experiments: sortedEfficacyExperiments,
          });
        }
      }
    },
    [compound, updateCompound, isDirty, reset],
  );

  useEffect(() => {
    if (isDirty) {
      const submit = handleSubmit(submitForm);
      submit();
    }
  }, [isDirty, handleSubmit, submitForm]);

  const addNewEfficacyExperiment = async () => {
    const newExperiment = await createEfficacyExperiment({
      efficacyExperiment: {
        name: "",
        c50: compound.target_concentration || 0,
        c50_unit: compound.target_concentration_unit || 0,
        hill_coefficient: 1,
        compound: compound.id,
      },
    }).unwrap();
    const newCompound = {
      ...defaultValues,
      id: compound.id,
      efficacy_experiments: [
        ...(defaultValues?.efficacy_experiments || []),
        newExperiment,
      ] as EfficacyExperimentRead[],
    };
    reset(newCompound);
    // If this is the first experiment created, select it by default.
    if (defaultValues?.efficacy_experiments?.length === 0) {
      reset({
        ...newCompound,
        use_efficacy: newExperiment.id,
      });
      updateCompound({
        id: compound.id,
        compound: {
          ...newCompound,
          use_efficacy: newExperiment.id,
        } as CompoundRead,
      });
    }
  };

  const deleteEfficacyExperiment = (id: number) => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete this efficacy-safety data?",
      )
    ) {
      if (isEfficacySelected(id)) {
        setValue("use_efficacy", null);
      }
      destroyEfficacyExperiment({ id });
      reset({
        ...defaultValues,
        efficacy_experiments: defaultValues?.efficacy_experiments?.filter(
          (efficacy_experiment) =>
            (efficacy_experiment as EfficacyExperimentRead)?.id !== id,
        ),
      });
    }
  };

  const saveEfficacyExperiment = async (index: number) => {
    const efficacyExperimentValues = getValues(`efficacy_experiments.${index}`);
    const efficacyExperiment = defaultValues?.efficacy_experiments?.[
      index
    ] as EfficacyExperimentRead;
    if (efficacyExperiment) {
      const result = await updateEfficacyExperiment({
        id: efficacyExperiment.id,
        efficacyExperiment: {
          ...efficacyExperimentValues,
          compound: compound.id,
        },
      });
      if (result?.data) {
        const newEfficacyExperiments = [
          ...(defaultValues?.efficacy_experiments || []),
        ];
        newEfficacyExperiments[index] = result.data;
        reset({
          ...defaultValues,
          efficacy_experiments:
            newEfficacyExperiments as EfficacyExperimentRead[],
        });
      }
    }
  };

  const isEfficacySelected = (id: number) => {
    const efficacy_experiment = defaultValues?.efficacy_experiments?.find(
      (e) => (e as EfficacyExperimentRead).id === id,
    ) as EfficacyExperimentRead;
    if (compound.use_efficacy === null) {
      return false;
    }
    return efficacy_experiment?.id === defaultValues?.use_efficacy;
  };

  const handleSelectEfficacy = (id: number) => {
    const efficacy_experiment = defaultValues?.efficacy_experiments?.find(
      (e) => (e as EfficacyExperimentRead).id === id,
    ) as EfficacyExperimentRead;
    if (efficacy_experiment.id === defaultValues?.use_efficacy) {
      const newCompound = {
        ...defaultValues,
        id: compound.id,
        efficacy_experiments:
          (defaultValues?.efficacy_experiments as EfficacyExperimentRead[]) ||
          [],
        use_efficacy: null,
      };
      reset(newCompound);
      updateCompound({
        id: compound.id,
        compound: newCompound as CompoundRead,
      });
    } else {
      const newCompound = {
        ...defaultValues,
        id: compound.id,
        use_efficacy: efficacy_experiment.id,
      };
      reset(newCompound);
      updateCompound({
        id: compound.id,
        compound: newCompound as CompoundRead,
      });
    }
  };

  const c50Unit = units.find((u) => u.symbol === "pmol/L");
  const c50Units = c50Unit?.compatible_units.filter((unit) =>
    [
      "pmol/L",
      "nmol/L",
      "µmol/L",
      "pg/mL",
      "ng/mL",
      "µg/mL",
      "ng/L",
      "µg/L",
      "mg/L",
    ].includes(unit.symbol),
  );
  const c50UnitOpt = c50Units
    ? c50Units.map((unit: { [key: string]: string }) => {
        return { value: unit.id, label: unit.symbol };
      })
    : [];

  const molMassUnit = units.find((u) => u.id === compound.molecular_mass_unit);
  const molMassUnits = molMassUnit?.compatible_units.filter((unit) =>
    unit.symbol.endsWith("/mol"),
  );
  const molMassUnitOpt = molMassUnits
    ? molMassUnits.map((unit: { [key: string]: string }) => {
        // add (Da) and (kDa) for clarity
        if (unit.symbol === "g/mol") {
          return { value: unit.id, label: `${unit.symbol} (Da)` };
        }
        if (unit.symbol === "kg/mol") {
          return { value: unit.id, label: `${unit.symbol} (kDa)` };
        }
        return { value: unit.id, label: unit.symbol };
      })
    : [];

  const defaultProps = { disabled: isSharedWithMe };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <TableHeader variant="h4" label="Drug & Target" />
      <div
        style={{ display: "flex", paddingTop: "1rem", flexDirection: "column" }}
      >
        <Grid
          container
          size={{
            xl: 12,
          }}
        >
          <Grid
            sx={{ paddingRight: "2rem" }}
            size={{
              xl: 3,
              xs: 7,
            }}
          >
            <Typography variant="h6" component="h2" gutterBottom>
              Drug Properties
            </Typography>
            <Stack direction="row" spacing={1}>
              <FloatField
                size="small"
                label={"Molecular Mass"}
                name={"molecular_mass"}
                control={control}
                sx={{ flex: "1" }}
                rules={{ required: true }}
                textFieldProps={defaultProps}
              />
              <SelectField
                size="small"
                label={"Unit"}
                name={"molecular_mass_unit"}
                options={molMassUnitOpt}
                control={control}
                selectProps={defaultProps}
              />
            </Stack>
          </Grid>
        </Grid>
        <Grid
          sx={{ paddingTop: ".5rem" }}
          container
          size={{
            xl: 12,
          }}
        >
          <Grid
            sx={{ paddingRight: "2rem" }}
            size={{
              xl: 3,
              xs: 7,
            }}
          >
            <Typography variant="h6" component="h2" gutterBottom>
              Target Properties
            </Typography>
            <Stack direction="column" spacing={2}>
              <Stack direction="row" spacing={2}>
                <FloatField
                  size="small"
                  label={"Molecular Mass"}
                  name={"target_molecular_mass"}
                  control={control}
                  sx={{ flex: "1" }}
                  rules={{ required: true }}
                  textFieldProps={defaultProps}
                />
                <SelectField
                  size="small"
                  label={"Unit"}
                  name={"target_molecular_mass_unit"}
                  options={molMassUnitOpt}
                  control={control}
                  selectProps={defaultProps}
                />
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </div>
      <Grid
        container
        sx={{ paddingTop: "3rem" }}
        size={{
          xl: 12,
        }}
      >
        <Grid
          size={{
            xl: 4,
            xs: 7,
          }}
        >
          <Box sx={{ display: "flex" }}>
            <Typography
              id="efficacy-heading"
              variant="h6"
              component="h2"
              gutterBottom
            >
              Efficacy-Safety Data
            </Typography>
            <Tooltip
              arrow
              title={
                isEditIndex !== null
                  ? "Finish editing efficacy-safety data"
                  : ""
              }
            >
              <span>
                <Button
                  size="small"
                  startIcon={<AddCircleOutlineOutlinedIcon />}
                  variant="contained"
                  onClick={addNewEfficacyExperiment}
                  disabled={isSharedWithMe || isEditIndex !== null}
                  sx={{ marginBottom: "0.35em", marginLeft: ".5rem" }}
                >
                  Add new
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Grid>
      </Grid>
      <TableContainer
        sx={{
          width: window.innerWidth > 1300 ? "70%" : "100%",
          maxHeight: getTableHeight({ steps: DOUBLE_TABLE_SECOND_BREAKPOINTS }),
        }}
      >
        <Table stickyHeader aria-labelledby="efficacy-heading">
          <TableHead>
            <TableRow>
              <TableCell>Select</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>C50</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Hill-coefficient</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {defaultValues?.efficacy_experiments?.map(
              (efficacy_experiment, index) => {
                const experimentId = (
                  efficacy_experiment as EfficacyExperimentRead
                )?.id;
                return (
                  <TableRow key={`efficacy-experiment-${experimentId}`}>
                    <TableCell width="5rem" size="small">
                      <Tooltip
                        arrow
                        placement={"top-end"}
                        title="Use this efficacy-safety data"
                      >
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <Radio
                            checked={isEfficacySelected(experimentId)}
                            onClick={() => handleSelectEfficacy(experimentId)}
                            disabled={isSharedWithMe}
                            id={`efficacy_experiment-${experimentId}`}
                          />
                        </div>
                      </Tooltip>
                    </TableCell>
                    <TableCell size="small">
                      {isEditIndex === index ? (
                        <TextField
                          size="small"
                          sx={{ flex: "1", minWidth: "10rem" }}
                          label="Name"
                          name={`efficacy_experiments.${index}.name`}
                          control={control}
                          textFieldProps={defaultProps}
                        />
                      ) : (
                        <label htmlFor={`efficacy_experiment-${experimentId}`}>
                          <Typography>
                            {getValues(`efficacy_experiments.${index}.name`) ||
                              "-"}
                          </Typography>
                        </label>
                      )}
                    </TableCell>
                    <TableCell size="small">
                      {isEditIndex === index ? (
                        <FloatField
                          size="small"
                          sx={{ flex: "1", minWidth: "5rem" }}
                          label="C50"
                          name={`efficacy_experiments.${index}.c50`}
                          control={control}
                          textFieldProps={defaultProps}
                        />
                      ) : (
                        <Typography>
                          {getValues(`efficacy_experiments.${index}.c50`) ||
                            "-"}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell size="small">
                      {isEditIndex === index ? (
                        <SelectField
                          size="small"
                          label={"Unit"}
                          name={`efficacy_experiments.${index}.c50_unit`}
                          options={c50UnitOpt}
                          control={control}
                          selectProps={defaultProps}
                        />
                      ) : (
                        <Typography>
                          {units.find(
                            (u) =>
                              u.id ===
                              getValues(
                                `efficacy_experiments.${index}.c50_unit`,
                              ),
                          )?.symbol || "-"}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell size="small">
                      {isEditIndex === index ? (
                        <FloatField
                          size="small"
                          sx={{ minWidth: "5rem" }}
                          label="Hill-coefficient"
                          name={`efficacy_experiments.${index}.hill_coefficient`}
                          control={control}
                          textFieldProps={defaultProps}
                        />
                      ) : (
                        <Typography>
                          {getValues(
                            `efficacy_experiments.${index}.hill_coefficient`,
                          ) || "-"}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell width="5rem" size="small">
                      {isEditIndex === index ? (
                        <Stack
                          sx={{ justifyContent: "center" }}
                          component="span"
                          direction="row"
                          spacing={0.0}
                        >
                          <Tooltip arrow title="Save changes">
                            <IconButton
                              onClick={() => {
                                setIsEditIndex(null);
                                saveEfficacyExperiment(index);
                              }}
                            >
                              <CheckIcon titleAccess="Save" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip arrow title="Discard changes">
                            <IconButton
                              onClick={() => {
                                setIsEditIndex(null);
                                reset();
                              }}
                            >
                              <CloseIcon titleAccess="Discard changes" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      ) : (
                        <Stack component="span" direction="row" spacing={0.0}>
                          <Tooltip
                            arrow
                            title={
                              isEditIndex !== null && isEditIndex !== index
                                ? "Finish editing efficacy-safety data"
                                : "Edit efficacy-safety data"
                            }
                          >
                            <span>
                              <IconButton
                                disabled={
                                  isEditIndex !== null && isEditIndex !== index
                                }
                                onClick={() => {
                                  setIsEditIndex(index);
                                }}
                              >
                                <EditIcon titleAccess="Edit" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip
                            arrow
                            title={
                              isEditIndex !== null && isEditIndex !== index
                                ? "Finish editing efficacy-safety data"
                                : "Delete efficacy-safety data"
                            }
                          >
                            <span>
                              <IconButton
                                disabled={
                                  isEditIndex !== null && isEditIndex !== index
                                }
                                onClick={() =>
                                  deleteEfficacyExperiment(experimentId)
                                }
                              >
                                <Delete titleAccess="Delete" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                );
              },
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

const Drug: FC = () => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const { data: project, isLoading: isProjectLoading } =
    useProjectRetrieveQuery({ id: projectId || 0 }, { skip: !projectId });
  const { data: compound, isLoading: isCompoundLoading } =
    useCompoundRetrieveQuery(
      { id: project?.compound || 0 },
      { skip: !project?.compound },
    );
  const { data: units, isLoading: isLoadingUnits } = useUnitListQuery(
    { compoundId: project?.compound },
    { skip: !project?.compound },
  );

  if (isProjectLoading || isCompoundLoading || isLoadingUnits) {
    return <div>Loading...</div>;
  }

  if (!compound || !project || !units) {
    return <div>Not found</div>;
  }

  return (
    <Box sx={{ paddingTop: "1rem" }}>
      <DrugForm project={project} compound={compound} units={units} />
    </Box>
  );
};

export default Drug;
