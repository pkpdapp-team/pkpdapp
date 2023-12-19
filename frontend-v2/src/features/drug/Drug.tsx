import {
  Button,
  FormLabel,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  Radio,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useSelector } from "react-redux";
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
import { useEffect, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import TextField from "../../components/TextField";
import useDirty from "../../hooks/useDirty";
import ConfirmationDialog from "../../components/ConfirmationDialog";

const Drug: React.FC = () => {
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

  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  // create a form for the compound data using react-hook-form
  const { reset, handleSubmit, control, setValue } = useForm<Compound>({
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

  const submit = handleSubmit((data) => {
    if (data && compound && JSON.stringify(data) !== JSON.stringify(compound)) {
      // strange bug in react-hook-form is creating efficancy_experiments with undefined compounds, remove these for now.
      data.efficacy_experiments = data.efficacy_experiments.filter(
        (efficacy_experiment) => efficacy_experiment.compound !== undefined,
      );
      updateCompound({ id: compound.id, compound: data }).then((result) => {
        // if the compound has no efficacy experiments, but the result has, then set the first one as the use_efficacy
        if ("data" in result) {
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
      });
    }
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        submit();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [submit, isDirty]);

  useEffect(
    () => () => {
      submit();
    },
    [],
  );

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
    remove(index);
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

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex" }}>
        <Grid container xl={12}>
          <Grid item xl={4} xs={10} sx={{ paddingRight: "2rem" }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Drug Properties
            </Typography>
            <Stack direction="row" spacing={1}>
              <FloatField
                label={"Molecular Mass"}
                name={"molecular_mass"}
                control={control}
                sx={{ flex: "1" }}
                rules={{ required: true }}
              />
              <UnitField
                label={"Unit"}
                name={"molecular_mass_unit"}
                control={control}
                baseUnit={units.find(
                  (u) => u.id === compound.molecular_mass_unit,
                )}
                compound={compound}
              />
            </Stack>
          </Grid>
          <Grid item xl={4} xs={10} sx={{ paddingRight: "2rem" }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Target Properties
            </Typography>
            <Stack direction="column" spacing={2}>
              <Stack direction="row" spacing={2}>
                <FloatField
                  label={"Molecular Mass"}
                  name={"target_molecular_mass"}
                  control={control}
                  sx={{ flex: "1" }}
                  rules={{ required: true }}
                />
                <UnitField
                  label={"Unit"}
                  name={"target_molecular_mass_unit"}
                  control={control}
                  baseUnit={units.find(
                    (u) => u.id === compound.molecular_mass_unit,
                  )}
                  compound={compound}
                />
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </div>
      <Grid container xl={12} sx={{ paddingTop: "3rem" }}>
        <Grid item xl={4} xs={10}>
          <Typography variant="h6" component="h2" gutterBottom>
            Efficacy-Safety Data
          </Typography>
          <Button variant="outlined" onClick={addNewEfficacyExperiment}>
            Add new
          </Button>
          <List>
            {efficacy_experiments.map((efficacy_experiment, index) => (
              <ListItem
                style={{ paddingLeft: 0 }}
                key={efficacy_experiment.theKey}
              >
                <Stack direction="column" spacing={2} sx={{ flex: "1" }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Tooltip
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
                        />
                        <Typography color="primary">Select</Typography>
                      </div>
                    </Tooltip>
                    <Tooltip title="Delete this efficacy-safety data">
                      <IconButton onClick={() => setShowConfirmDelete(true)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                    <ConfirmationDialog
                      open={showConfirmDelete}
                      title="Delete Efficacy-Safety Data"
                      message="Are you sure you want to permanently delete this efficacy-safety data?"
                      onConfirm={() => {
                        deleteEfficacyExperiment(index);
                        setShowConfirmDelete(false);
                      }}
                      onCancel={() => setShowConfirmDelete(false)}
                    />
                  </div>
                  <TextField
                    sx={{ flex: "1" }}
                    label="Name"
                    name={`efficacy_experiments.${index}.name`}
                    control={control}
                  />
                  <Stack direction="row" spacing={2}>
                    <FloatField
                      sx={{ flex: "1" }}
                      label="C50"
                      name={`efficacy_experiments.${index}.c50`}
                      control={control}
                    />
                    <UnitField
                      label={"Unit"}
                      name={`efficacy_experiments.${index}.c50_unit`}
                      control={control}
                      baseUnit={units.find(
                        (u) => u.id === efficacy_experiment.c50_unit,
                      )}
                      compound={compound}
                    />
                  </Stack>
                  <FloatField
                    label="Hill-coefficient"
                    name={`efficacy_experiments.${index}.hill_coefficient`}
                    control={control}
                  />
                </Stack>
              </ListItem>
            ))}
          </List>
        </Grid>
      </Grid>
    </div>
  );
};

export default Drug;
