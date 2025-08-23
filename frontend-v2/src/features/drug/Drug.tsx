import {
  Box,
  Button,
  Grid,
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
  useProjectRetrieveQuery,
  useUnitListQuery,
} from "../../app/backendApi";
import { useForm, useFormState } from "react-hook-form";
import FloatField from "../../components/FloatField";
import { FC, useCallback, useEffect, useState } from "react";
import SelectField from "../../components/SelectField";
import { selectIsProjectShared } from "../login/loginSlice";
import { TableHeader } from "../../components/TableHeader";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import { getTableHeight } from "../../shared/calculateTableHeights";
import useDirty from "../../hooks/useDirty";
import { EfficacyExperimentForm } from "./EfficacyExperimentForm";

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
  const { refetch: refetchCompoundUnits } = useUnitListQuery({
    compoundId: compound.id,
  });

  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );
  const [isEditIndex, setIsEditIndex] = useState<number | null>(null);

  // create a form for the compound data using react-hook-form
  const { reset, handleSubmit, control, setValue } = useForm<Compound>({
    defaultValues: compound,
  });
  const { isDirty, defaultValues } = useFormState({ control });
  useDirty(isDirty);

  const submitForm = useCallback(
    async (data: Compound) => {
      if (compound?.id && isDirty) {
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
          try {
            const sortedEfficacyExperiments = [
              ...result.data.efficacy_experiments,
            ].sort((a, b) => a.id - b.id);
            reset({
              ...data,
              efficacy_experiments: sortedEfficacyExperiments,
            });
            refetchCompoundUnits();
          } catch (error) {
            console.error(error);
          }
        }
      }
    },
    [compound, updateCompound, isDirty, reset, refetchCompoundUnits],
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
                const efficacyExperiment =
                  efficacy_experiment as EfficacyExperimentRead;
                const experimentId = efficacyExperiment?.id;
                const isSelected = isEfficacySelected(experimentId);
                return (
                  <EfficacyExperimentForm
                    key={experimentId}
                    efficacyExperiment={efficacyExperiment}
                    project={project}
                    units={units}
                    isSelected={isSelected}
                    isEditing={isEditIndex === index}
                    disabled={isEditIndex !== null && isEditIndex !== index}
                    onSelect={handleSelectEfficacy}
                    onDelete={deleteEfficacyExperiment}
                    onEdit={() => setIsEditIndex(index)}
                    onCancel={() => setIsEditIndex(null)}
                  />
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
