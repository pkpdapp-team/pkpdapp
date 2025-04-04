import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  CombinedModel,
  CombinedModelRead,
  ProjectRead,
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
} from "../../app/backendApi";
import { useForm } from "react-hook-form";
import { FC, useEffect, useMemo } from "react";
import { DynamicTabs, TabPanel } from "../../components/DynamicTabs";
import MapVariablesTab from "./MapVariablesTab";
import PKPDModelTab from "./PKPDModelTab";
import SecondaryParametersTab from "./secondary/SecondaryParameters";
import ParametersTab from "./ParametersTab";
import useDirty from "../../hooks/useDirty";
import { SubPageName } from "../main/mainSlice";
import { TableHeader } from "../../components/TableHeader";

export type FormData = {
  project: ProjectRead;
  model: CombinedModel;
};

const Model: FC = () => {
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

  const [updateModel] = useCombinedModelUpdateMutation();
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
  const [updateSimulation] = useSimulationUpdateMutation();
  const simulation = useMemo(() => {
    return simulations?.[0] || undefined;
  }, [simulations]);
  const [updateProject] = useProjectUpdateMutation();
  const [setParamsToDefault] =
    useCombinedModelSetParamsToDefaultsUpdateMutation();

  const defaultModel: CombinedModelRead = {
    id: 0,
    name: "",
    project: projectIdOrZero,
    mappings: [],
    derived_variables: [],
    time_intervals: [],
    components: "",
    variables: [],
    mmt: "",
    sbml: "",
    time_unit: 0,
    is_library_model: false,
  };
  const defaultProject: ProjectRead = {
    id: 0,
    user_access: [],
    name: "",
    created: "",
    compound: 0,
    users: [],
    protocols: [],
    datasets: [],
  };

  const defaultValues: FormData = {
    project: defaultProject,
    model: defaultModel,
  };

  const {
    reset,
    handleSubmit,
    control,
    formState: { isDirty },
  } = useForm<FormData>({
    defaultValues,
  });

  useDirty(isDirty);

  useEffect(() => {
    if (model && project) {
      reset({ model, project });
    }
  }, [model, project, reset]);

  const submit = handleSubmit((data: FormData) => {
    if (!model || !project) {
      return;
    }

    // if tlag checkbox is unchecked, then remove tlag derived variables
    if (data.model.has_lag !== model.has_lag && !data.model.has_lag) {
      data.model.derived_variables = data.model.derived_variables.filter(
        (dv) => dv.type !== "TLG",
      );
    }

    // if only pd_model has changed, need to clear pd_model2
    if (data.model.pd_model !== model?.pd_model) {
      data.model.pd_model2 = null;
    }

    // if species changed then update project
    if (data.project.species !== project.species) {
      updateProject({
        id: project.id,
        project: { ...project, species: data.project.species },
      });

      // if species has changed, then clear the models
      data.model.pk_model = null;
      data.model.pd_model = null;
      data.model.pd_model2 = null;
    }
    return updateModel({ id: model.id, combinedModel: data.model }).then(
      (response) => {
        if (response?.data) {
          // if the pk_model has changed, need to reset the simulation time_max_unit and set default parameters again
          if (data.model.pk_model !== model?.pk_model && simulation) {
            const time_max_unit = response.data.time_unit;
            updateSimulation({
              id: simulation.id,
              simulation: { ...simulation, time_max_unit },
            });
          }
          // if the pk model has changed, need to reset the parameters
          if (data.model.pk_model !== model?.pk_model) {
            setParamsToDefault({ id: model.id, combinedModel: data.model });
          }
        }
      },
    );
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        submit();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [submit, isDirty]);

  const loading = [
    isProjectLoading,
    isModelsLoading,
    isVariablesLoading,
    isProtocolsLoading,
    isSimulationsLoading,
    isLoadingCompound,
    isLoadingUnits,
  ];
  if (loading.some((x) => x)) {
    return <div>Loading...</div>;
  }

  if (!model || !project || !variables || !protocols || !compound || !units) {
    return <div>Not found</div>;
  }

  const tabErrors: { [key: string]: string } = {};
  const tabKeys = [
    SubPageName.PKPDMODEL,
    SubPageName.MAPVARIABLES,
    SubPageName.PARAMETERS,
    SubPageName.SECONDARYPARAMETERS,
  ];
  if (model.pk_model === null) {
    tabErrors[tabKeys[0]] = "Please select a PK model to simulate";
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
        "Please select a PK variable to link PK and PD models (Link to PD column)";
    }
  }
  if (
    model.has_lag &&
    !model.derived_variables.find((dv) => dv.type === "TLG")
  ) {
    tabErrors[tabKeys[1]] = "Please select a lag time variable";
  }
  if (protocols && protocols.length === 0) {
    tabErrors[tabKeys[1]] = "Please select a dosing compartment";
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
            control={control}
            updateModel={updateModel}
          />
        </TabPanel>
        <TabPanel>
          <MapVariablesTab
            model={model}
            project={project}
            control={control}
            variables={variables}
            units={units}
            compound={compound}
          />
        </TabPanel>
        <TabPanel>
          <ParametersTab
            model={model}
            project={project}
            control={control}
            variables={variables}
            units={units}
            compound={compound}
          />
        </TabPanel>
        <TabPanel>
          <SecondaryParametersTab />
        </TabPanel>
      </DynamicTabs>
    </>
  );
};

export default Model;
