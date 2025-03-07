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
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  Compound,
  EfficacyRead,
  useCompoundRetrieveQuery,
  useCompoundUpdateMutation,
  useProjectRetrieveQuery,
  useUnitListQuery,
} from "../../app/backendApi";
import { useFieldArray, useForm, useFormState } from "react-hook-form";
import FloatField from "../../components/FloatField";
import UnitField from "../../components/UnitField";
import { FC, useEffect, useMemo, useState } from "react";
import TextField from "../../components/TextField";
import SelectField from "../../components/SelectField";
import { selectIsProjectShared } from "../login/loginSlice";
import { TableHeader } from "../../components/TableHeader";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import Delete from "@mui/icons-material/Delete";
import { decrementDirtyCount, incrementDirtyCount } from "../main/mainSlice";
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

const Drug: FC = () => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const { data: project, isLoading: isProjectLoading } =
    useProjectRetrieveQuery({ id: projectId || 0 }, { skip: !projectId });
  const { data: compound, isLoading: isCompoundLoading } =
    useCompoundRetrieveQuery(
      { id: project?.compound || 0 },
      { skip: !project },
    );
  const [updateCompound] = useCompoundUpdateMutation();
  const { data: units, isLoading: isLoadingUnits } = useUnitListQuery(
    { compoundId: project?.compound },
    { skip: !project?.compound },
  );

  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );
  const [isEditIndex, setIsEditIndex] = useState<number | null>(null);

  // create a form for the compound data using react-hook-form
  const { reset, handleSubmit, control, setValue, getValues } =
    useForm<Compound>({
      defaultValues: compound || {
        name: "",
        description: "",
        compound_type: "SM",
        efficacy_experiments: [],
      },
    });
  const { isDirty } = useFormState({ control });
  useDirty(isDirty);

  const {
    fields: efficacy_experiments,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "efficacy_experiments",
    keyName: "theKey",
  });

  useEffect(() => {
    reset(compound);
  }, [compound, reset]);

  const dispatch = useDispatch();

  const submit = useMemo(
    () =>
      handleSubmit((data) => {
        if (
          data &&
          compound &&
          JSON.stringify(data) !== JSON.stringify(compound)
        ) {
          // strange bug in react-hook-form is creating efficancy_experiments with undefined compounds, remove these for now.
          data.efficacy_experiments = data.efficacy_experiments.filter(
            (efficacy_experiment) => efficacy_experiment.compound !== undefined,
          );
          dispatch(incrementDirtyCount());
          updateCompound({ id: compound.id, compound: data })
            .then((result) => {
              // if the compound has no efficacy experiments, but the result has, then set the first one as the use_efficacy
              if (result?.data) {
                if (
                  compound.efficacy_experiments.length === 0 &&
                  result.data.efficacy_experiments.length > 0
                ) {
                  updateCompound({
                    id: compound.id,
                    compound: {
                      ...data,
                      use_efficacy: result.data.efficacy_experiments[0].id,
                    },
                  });
                }
              }
            })
            .then(() => dispatch(decrementDirtyCount()));
        }
      }),
    [compound, handleSubmit, updateCompound],
  );

  useEffect(() => {
    if (isDirty) {
      submit();
    }
  }, [isDirty, submit]);

  useEffect(() => {
    submit();
  }, [efficacy_experiments?.length, submit]);

  const addNewEfficacyExperiment = () => {
    append([
      {
        name: "",
        c50: compound?.target_concentration || 0,
        c50_unit: compound?.target_concentration_unit || 0,
        hill_coefficient: 1,
        compound: compound?.id || 0,
      },
    ]);
  };

  const deleteEfficacyExperiment = (index: number) => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete this efficacy-safety data?",
      )
    ) {
      remove(index);
    }
  };

  if (isProjectLoading || isCompoundLoading || isLoadingUnits) {
    return <div>Loading...</div>;
  }

  if (!compound || !project || !units) {
    return <div>Not found</div>;
  }

  const isEfficacySelected = (efficacy_experiment: EfficacyRead) => {
    if (compound.use_efficacy === undefined) {
      return false;
    }
    return efficacy_experiment.id === compound.use_efficacy;
  };

  const handleSelectEfficacy = (efficacy_experiment: EfficacyRead) => {
    if (efficacy_experiment.id === compound.use_efficacy) {
      setValue("use_efficacy", null);
      submit();
    } else {
      setValue("use_efficacy", efficacy_experiment.id);
      submit();
    }
  };

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

  const handleOnEdit = (index: number, isEdit: boolean) => {
    setIsEditIndex(isEdit ? index : null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <TableHeader variant="h4" label="Drug & Target" />
      <div
        style={{ display: "flex", paddingTop: "1rem", flexDirection: "column" }}
      >
        <Grid container xl={12}>
          <Grid item xl={3} xs={7} sx={{ paddingRight: "2rem" }}>
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
        <Grid sx={{ paddingTop: ".5rem" }} container xl={12}>
          <Grid item xl={3} xs={7} sx={{ paddingRight: "2rem" }}>
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
      <Grid container xl={12} sx={{ paddingTop: "3rem" }}>
        <Grid item xl={4} xs={7}>
          <Box sx={{ display: "flex" }}>
            <Typography variant="h6" component="h2" gutterBottom>
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
        <Table stickyHeader>
          <TableHead>
            <TableCell>Select</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>C50</TableCell>
            <TableCell>Unit</TableCell>
            <TableCell>Hill-coefficient</TableCell>
            <TableCell>Actions</TableCell>
          </TableHead>
          <TableBody>
            {efficacy_experiments.map((efficacy_experiment, index) => (
              <TableRow key={index}>
                <TableCell width="5rem" size="small">
                  <Tooltip
                    arrow
                    placement={"top-end"}
                    title="Use this efficacy-safety data"
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <Radio
                        checked={isEfficacySelected(
                          efficacy_experiment as unknown as EfficacyRead,
                        )}
                        onClick={() =>
                          handleSelectEfficacy(
                            efficacy_experiment as unknown as EfficacyRead,
                          )
                        }
                        disabled={isSharedWithMe}
                        id={`efficacy_experiment-${efficacy_experiment?.theKey}`}
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
                    <label
                      htmlFor={`efficacy_experiment-${efficacy_experiment?.theKey}`}
                    >
                      <Typography>
                        {getValues(`efficacy_experiments.${index}.name`) || "-"}
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
                      {getValues(`efficacy_experiments.${index}.c50`) || "-"}
                    </Typography>
                  )}
                </TableCell>
                <TableCell size="small">
                  {isEditIndex === index ? (
                    <UnitField
                      size="small"
                      label={"Unit"}
                      name={`efficacy_experiments.${index}.c50_unit`}
                      control={control}
                      baseUnit={units.find(
                        (u) => u.id === efficacy_experiment.c50_unit,
                      )}
                      compound={compound}
                      selectProps={defaultProps}
                    />
                  ) : (
                    <Typography>
                      {units.find(
                        (u) =>
                          u.id ===
                          getValues(`efficacy_experiments.${index}.c50_unit`),
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
                            submit();
                            handleOnEdit(index, false);
                          }}
                        >
                          <CheckIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip arrow title="Discard changes">
                        <IconButton
                          onClick={() => {
                            reset();
                            handleOnEdit(index, false);
                          }}
                        >
                          <CloseIcon />
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
                            onClick={() => handleOnEdit(index, true)}
                          >
                            <EditIcon />
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
                            onClick={() => deleteEfficacyExperiment(index)}
                          >
                            <Delete />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default Drug;
