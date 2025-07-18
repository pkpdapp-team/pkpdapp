import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  CombinedModel,
  CombinedModelRead,
  CompoundRead,
  PharmacodynamicRead,
  ProjectRead,
  ProjectSpeciesEnum,
  ProtocolListApiResponse,
  SimulationRead,
  UnitListApiResponse,
  useCombinedModelListQuery,
  useCombinedModelSetParamsToDefaultsUpdateMutation,
  useCombinedModelUpdateMutation,
  useCompoundRetrieveQuery,
  usePharmacodynamicRetrieveQuery,
  useProjectRetrieveQuery,
  useProjectUpdateMutation,
  useProtocolListQuery,
  useSimulationListQuery,
  useSimulationUpdateMutation,
  useUnitListQuery,
  useVariableListQuery,
  VariableListApiResponse,
} from "../../app/backendApi";
import { useForm, useFormState } from "react-hook-form";
import { FC, useCallback, useEffect, useMemo } from "react";
import { DynamicTabs, TabPanel } from "../../components/DynamicTabs";
import MapVariablesTab from "./variables/MapVariablesTab";
import PKPDModelTab from "./PKPDModelTab";
import SecondaryParametersTab from "./secondary/SecondaryParameters";
import ParametersTab from "./parameters/ParametersTab";
import useDirty from "../../hooks/useDirty";
import { SubPageName } from "../main/mainSlice";
import { TableHeader } from "../../components/TableHeader";

export type FormData = Omit<CombinedModel, "species"> & {
  species: ProjectSpeciesEnum | undefined;
};

function useApiQueries() {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project, isLoading: isProjectLoading } =
    useProjectRetrieveQuery({ id: projectIdOrZero }, { skip: !projectId });
  const { data: compound, isLoading: isLoadingCompound } =
    useCompoundRetrieveQuery(
      { id: project?.compound || 0 },
      { skip: !project || !project.compound },
    );
  const { data: models, isLoading: isModelsLoading } =
    useCombinedModelListQuery(
      { projectId: projectIdOrZero },
      { skip: !projectId },
    );
  const { data: protocols, isLoading: isProtocolsLoading } =
    useProtocolListQuery({ projectId: projectIdOrZero }, { skip: !projectId });
  const model = models?.[0] || null;
  const { data: pd_model } = usePharmacodynamicRetrieveQuery(
    { id: model?.pd_model || 0 },
    { skip: !model?.pd_model },
  );
  const { data: variables, isLoading: isVariablesLoading } =
    useVariableListQuery(
      { dosedPkModelId: model?.id || 0 },
      { skip: !model?.id },
    );
  const { data: simulations, isLoading: isSimulationsLoading } =
    useSimulationListQuery(
      { projectId: projectIdOrZero },
      { skip: !projectId },
    );
  const { data: units, isLoading: isLoadingUnits } = useUnitListQuery(
    { compoundId: project?.compound },
    { skip: !project || !project.compound },
  );

  const simulation = useMemo(() => {
    return simulations?.[0] || undefined;
  }, [simulations]);

  const loading = [
    isProjectLoading,
    isModelsLoading,
    isVariablesLoading,
    isProtocolsLoading,
    isSimulationsLoading,
    isLoadingCompound,
    isLoadingUnits,
  ];

  return {
    isLoading: loading.some((x) => x),
    compound,
    model,
    pd_model,
    project,
    protocols,
    simulation,
    units,
    variables,
  };
}

function useModelFormDataCallback({
  model,
  project,
  simulation,
  reset,
  updateModel,
  updateProject,
}: {
  model: CombinedModelRead;
  project: ProjectRead;
  simulation?: SimulationRead;
  reset: (values?: Partial<FormData>) => void;
  updateModel: CombinedModelUpdate;
  updateProject: ProjectUpdate;
}) {
  const [updateSimulation] = useSimulationUpdateMutation();

  const [setParamsToDefault] =
    useCombinedModelSetParamsToDefaultsUpdateMutation();

  const handleFormData = useCallback(
    (data: FormData) => {
      if (!model || !project) {
        return;
      }
      const { species, ...modelData } = data;
      // if tlag checkbox is unchecked, then remove tlag derived variables
      if (modelData.has_lag !== model.has_lag && !modelData.has_lag) {
        modelData.derived_variables = modelData.derived_variables.filter(
          (dv) => dv.type !== "TLG",
        );
      }
      // if only pd_model has changed, need to clear pd_model2
      if (modelData.pd_model !== model?.pd_model) {
        modelData.pd_model2 = null;
      }
      // if species changed then update project
      if (species !== project.species) {
        updateProject({
          id: project.id,
          project: { ...project, species },
        });
        // if species has changed, then clear the models
        modelData.pk_model = null;
        modelData.pd_model = null;
        modelData.pd_model2 = null;
      }

      // Reset form isDirty and isSubmitting state from previous submissions.
      reset({
        ...modelData,
        project: project.id,
        species,
      });
      return updateModel({ id: model.id, combinedModel: modelData }).then(
        (response) => {
          if (response?.data) {
            // if the pk_model has changed, need to reset the simulation time_max_unit and set default parameters again
            if (modelData.pk_model !== model?.pk_model && simulation) {
              const time_max_unit = response.data.time_unit;
              updateSimulation({
                id: simulation.id,
                simulation: { ...simulation, time_max_unit },
              });
            }
            // if the pk model has changed, need to reset the parameters
            if (modelData.pk_model !== model?.pk_model) {
              setParamsToDefault({ id: model.id, combinedModel: modelData });
            }
          }
        },
      );
    },
    [
      model,
      project,
      simulation,
      updateModel,
      updateProject,
      updateSimulation,
      setParamsToDefault,
      reset,
    ],
  );
  return handleFormData;
}

function useModelFormState({
  model,
  project,
}: {
  model: CombinedModel;
  project: ProjectRead;
}) {
  const species = project.species;
  const defaultValues: FormData = {
    ...model,
    project: project.id,
    species,
  };
  const { reset, handleSubmit, control } = useForm<FormData>({
    defaultValues,
  });
  const { isDirty } = useFormState({
    control,
  });

  useDirty(isDirty);

  return { control, reset, handleSubmit };
}

export type CombinedModelUpdate = (arg: {
  id: number;
  combinedModel: CombinedModel;
}) => Promise<{ data?: CombinedModelRead }>;
export type ProjectUpdate = (arg: {
  id: number;
  project: ProjectRead;
}) => Promise<{ data?: ProjectRead }>;

interface TabbedModelFormProps {
  model: CombinedModelRead;
  project: ProjectRead;
  variables: VariableListApiResponse;
  protocols: ProtocolListApiResponse;
  compound: CompoundRead;
  units: UnitListApiResponse;
  pd_model?: PharmacodynamicRead;
  simulation?: SimulationRead;
  updateModel: CombinedModelUpdate;
  updateProject: ProjectUpdate;
}

export const TabbedModelForm: FC<TabbedModelFormProps> = ({
  model,
  pd_model,
  project,
  simulation,
  variables,
  protocols,
  compound,
  units,
  updateModel,
  updateProject,
}) => {
  const { control, reset, handleSubmit } = useModelFormState({
    model,
    project,
  });
  const handleFormData = useModelFormDataCallback({
    model,
    project,
    simulation,
    reset,
    updateModel,
    updateProject,
  });

  /* 
  Submit whenever the form is dirty
  and previous updates have finished (or reset).
  */
  const { isDirty, isSubmitting } = useFormState({
    control,
  });

  useEffect(() => {
    if (isDirty && !isSubmitting) {
      const submit = handleSubmit(handleFormData);
      submit();
    }
  }, [handleSubmit, handleFormData, isDirty, isSubmitting]);

  const tabErrors: { [key: string]: string } = {};
  const tabKeys = [
    SubPageName.PKPDMODEL,
    SubPageName.MAPVARIABLES,
    SubPageName.PARAMETERS,
    SubPageName.SECONDARYPARAMETERS,
  ];
  if (model.pk_model === null) {
    tabErrors[tabKeys[0]] = "Please select a PK model to simulate.";
  }
  const hasPdModel = model.pd_model !== null;
  const isTumourModel =
    hasPdModel &&
    pd_model?.is_library_model &&
    pd_model?.name.startsWith("tumour_growth");
  const noKillModel = !model.pd_model2;
  if (model.pd_model && model.mappings.length === 0) {
    // put exception for tumour growth models with no kill
    if (!(isTumourModel && noKillModel)) {
      tabErrors[tabKeys[1]] =
        "Please select a PK variable to link PK and PD models (Link to PD column.)";
    }
  }
  if (
    model.has_lag &&
    !model.derived_variables.find((dv) => dv.type === "TLG")
  ) {
    tabErrors[tabKeys[1]] = "Please select a lag time variable.";
  }
  if (protocols && protocols.length === 0) {
    tabErrors[tabKeys[1]] = "Please select a dosing compartment.";
  }

  const isOtherSpeciesSelected = project.species === "O";

  return (
    <>
      <TableHeader variant="h4" label="Model" />
      <DynamicTabs
        tabNames={tabKeys}
        tabErrors={tabErrors}
        isOtherSpeciesSelected={isOtherSpeciesSelected}
        tumourModelWithNoKillModel={isTumourModel && noKillModel}
        marginBottom={0}
      >
        <TabPanel>
          <PKPDModelTab model={model} project={project} control={control} />
        </TabPanel>
        <TabPanel>
          <MapVariablesTab
            model={model}
            project={project}
            control={control}
            variables={variables}
            units={units}
            compound={compound}
            onChange={handleSubmit(handleFormData)}
          />
        </TabPanel>
        <TabPanel>
          <ParametersTab
            model={model}
            project={project}
            variables={variables}
            units={units}
          />
        </TabPanel>
        <TabPanel>
          <SecondaryParametersTab />
        </TabPanel>
      </DynamicTabs>
    </>
  );
};

const Model: FC = () => {
  const {
    isLoading,
    compound,
    model,
    pd_model,
    project,
    protocols,
    simulation,
    units,
    variables,
  } = useApiQueries();
  const [updateModel] = useCombinedModelUpdateMutation();
  const [updateProject] = useProjectUpdateMutation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const loaded =
    model && project && variables && protocols && compound && units;
  if (!loaded) {
    return <div>Not found</div>;
  }
  return (
    <TabbedModelForm
      model={model}
      pd_model={pd_model}
      project={project}
      simulation={simulation}
      variables={variables}
      protocols={protocols}
      compound={compound}
      units={units}
      updateModel={updateModel}
      updateProject={updateProject}
    />
  );
};

export default Model;
