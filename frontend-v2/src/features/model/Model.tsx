import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  CombinedModelRead,
  CompoundRead,
  PharmacodynamicRead,
  ProjectRead,
  ProtocolListApiResponse,
  UnitListApiResponse,
  useCombinedModelListQuery,
  useCompoundRetrieveQuery,
  usePharmacodynamicListQuery,
  useProjectRetrieveQuery,
  useProtocolListQuery,
  useSimulationListQuery,
  useUnitListQuery,
  useVariableListQuery,
  VariableListApiResponse,
} from "../../app/backendApi";
import { useFormState } from "react-hook-form";
import { FC, useEffect, useMemo } from "react";
import { DynamicTabs, TabPanel } from "../../components/DynamicTabs";
import MapVariablesTab from "./variables/MapVariablesTab";
import PKPDModelTab from "./model/PKPDModelTab";
import SecondaryParametersTab from "./secondary/SecondaryParameters";
import ParametersTab from "./parameters/ParametersTab";
import { SubPageName } from "../main/mainSlice";
import { TableHeader } from "../../components/TableHeader";
import { useModelFormState, useModelFormDataCallback } from "./modelFormState";
import {
  useProjectFormState,
  useProjectFormDataCallback,
} from "./projectFormState";

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
  const { data: pd_models } = usePharmacodynamicListQuery();
  const pd_model =
    pd_models?.find((pm) => pm.id === model?.pd_model) || undefined;
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
    pd_models,
    project,
    protocols,
    simulation,
    units,
    variables,
  };
}

interface TabbedModelFormProps {
  model: CombinedModelRead;
  project: ProjectRead;
  variables: VariableListApiResponse;
  protocols: ProtocolListApiResponse;
  compound: CompoundRead;
  units: UnitListApiResponse;
  pd_model?: PharmacodynamicRead;
  pd_models?: PharmacodynamicRead[];
}

export const TabbedModelForm: FC<TabbedModelFormProps> = ({
  model,
  pd_model,
  pd_models,
  project,
  variables,
  protocols,
  compound,
  units,
}) => {
  const {
    control: projectControl,
    reset: projectReset,
    handleSubmit: handleProjectSubmit,
  } = useProjectFormState({
    project,
  });
  const {
    control: modelControl,
    reset: resetModel,
    handleSubmit: handleModelSubmit,
  } = useModelFormState({
    model,
  });
  const handleModelFormData = useModelFormDataCallback({
    model,
    reset: resetModel,
    pd_models,
  });
  const handleProjectFormData = useProjectFormDataCallback({
    model,
    project,
    reset: projectReset,
    units,
  });

  /* 
  Submit whenever the form is dirty
  and previous updates have finished (or reset).
  */
  const { isDirty: isModelDirty, isSubmitting: isModelSubmitting } =
    useFormState({
      control: modelControl,
    });

  useEffect(() => {
    if (isModelDirty && !isModelSubmitting) {
      const submit = handleModelSubmit(handleModelFormData);
      submit();
    }
  }, [handleModelSubmit, handleModelFormData, isModelDirty, isModelSubmitting]);

  const { isDirty: isProjectDirty, isSubmitting: isProjectSubmitting } =
    useFormState({
      control: projectControl,
    });

  useEffect(() => {
    if (isProjectDirty && !isProjectSubmitting) {
      const submit = handleProjectSubmit(handleProjectFormData);
      submit();
    }
  }, [
    handleProjectSubmit,
    handleProjectFormData,
    isProjectDirty,
    isProjectSubmitting,
  ]);

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
    hasPdModel && pd_model?.is_library_model && pd_model?.model_type === "TG";
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
          <PKPDModelTab
            model={model}
            project={project}
            modelControl={modelControl}
            projectControl={projectControl}
            compound={compound}
            units={units}
          />
        </TabPanel>
        <TabPanel>
          <MapVariablesTab
            model={model}
            project={project}
            control={modelControl}
            variables={variables}
            units={units}
            compound={compound}
            onChange={handleModelSubmit(handleModelFormData)}
          />
        </TabPanel>
        <TabPanel>
          <ParametersTab
            model={model}
            project={project}
            variables={variables}
            control={modelControl}
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
    pd_models,
    project,
    protocols,
    units,
    variables,
  } = useApiQueries();

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
      pd_models={pd_models}
      project={project}
      variables={variables}
      protocols={protocols}
      compound={compound}
      units={units}
    />
  );
};

export default Model;
