import { emptySplitApi as api } from "./emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    algorithmList: build.query<AlgorithmListApiResponse, AlgorithmListApiArg>({
      query: () => ({ url: `/api/algorithm/` }),
    }),
    algorithmCreate: build.mutation<
      AlgorithmCreateApiResponse,
      AlgorithmCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/algorithm/`,
        method: "POST",
        body: queryArg.algorithm,
      }),
    }),
    algorithmRetrieve: build.query<
      AlgorithmRetrieveApiResponse,
      AlgorithmRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/algorithm/${queryArg.id}/` }),
    }),
    algorithmUpdate: build.mutation<
      AlgorithmUpdateApiResponse,
      AlgorithmUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/algorithm/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.algorithm,
      }),
    }),
    algorithmPartialUpdate: build.mutation<
      AlgorithmPartialUpdateApiResponse,
      AlgorithmPartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/algorithm/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedAlgorithm,
      }),
    }),
    algorithmDestroy: build.mutation<
      AlgorithmDestroyApiResponse,
      AlgorithmDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/algorithm/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    auceCreate: build.mutation<AuceCreateApiResponse, AuceCreateApiArg>({
      query: () => ({ url: `/api/auce/`, method: "POST" }),
    }),
    biomarkerTypeList: build.query<
      BiomarkerTypeListApiResponse,
      BiomarkerTypeListApiArg
    >({
      query: (queryArg) => ({
        url: `/api/biomarker_type/`,
        params: { dataset_id: queryArg.datasetId },
      }),
    }),
    biomarkerTypeCreate: build.mutation<
      BiomarkerTypeCreateApiResponse,
      BiomarkerTypeCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/biomarker_type/`,
        method: "POST",
        body: queryArg.biomarkerType,
      }),
    }),
    biomarkerTypeRetrieve: build.query<
      BiomarkerTypeRetrieveApiResponse,
      BiomarkerTypeRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/biomarker_type/${queryArg.id}/` }),
    }),
    biomarkerTypeUpdate: build.mutation<
      BiomarkerTypeUpdateApiResponse,
      BiomarkerTypeUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/biomarker_type/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.biomarkerType,
      }),
    }),
    biomarkerTypePartialUpdate: build.mutation<
      BiomarkerTypePartialUpdateApiResponse,
      BiomarkerTypePartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/biomarker_type/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedBiomarkerType,
      }),
    }),
    biomarkerTypeDestroy: build.mutation<
      BiomarkerTypeDestroyApiResponse,
      BiomarkerTypeDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/biomarker_type/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    combinedModelList: build.query<
      CombinedModelListApiResponse,
      CombinedModelListApiArg
    >({
      query: (queryArg) => ({
        url: `/api/combined_model/`,
        params: { project_id: queryArg.projectId },
      }),
    }),
    combinedModelCreate: build.mutation<
      CombinedModelCreateApiResponse,
      CombinedModelCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/combined_model/`,
        method: "POST",
        body: queryArg.combinedModel,
      }),
    }),
    combinedModelRetrieve: build.query<
      CombinedModelRetrieveApiResponse,
      CombinedModelRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/combined_model/${queryArg.id}/` }),
    }),
    combinedModelUpdate: build.mutation<
      CombinedModelUpdateApiResponse,
      CombinedModelUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/combined_model/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.combinedModel,
      }),
    }),
    combinedModelPartialUpdate: build.mutation<
      CombinedModelPartialUpdateApiResponse,
      CombinedModelPartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/combined_model/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedCombinedModel,
      }),
    }),
    combinedModelDestroy: build.mutation<
      CombinedModelDestroyApiResponse,
      CombinedModelDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/combined_model/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    combinedModelSetParamsToDefaultsUpdate: build.mutation<
      CombinedModelSetParamsToDefaultsUpdateApiResponse,
      CombinedModelSetParamsToDefaultsUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/combined_model/${queryArg.id}/set_params_to_defaults/`,
        method: "PUT",
        body: queryArg.combinedModel,
      }),
    }),
    combinedModelSetVariablesFromInferenceUpdate: build.mutation<
      CombinedModelSetVariablesFromInferenceUpdateApiResponse,
      CombinedModelSetVariablesFromInferenceUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/combined_model/${queryArg.id}/set_variables_from_inference/`,
        method: "PUT",
        body: queryArg.combinedModel,
      }),
    }),
    combinedModelSimulateCreate: build.mutation<
      CombinedModelSimulateCreateApiResponse,
      CombinedModelSimulateCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/combined_model/${queryArg.id}/simulate`,
        method: "POST",
        body: queryArg.simulate,
      }),
    }),
    compoundList: build.query<CompoundListApiResponse, CompoundListApiArg>({
      query: () => ({ url: `/api/compound/` }),
    }),
    compoundCreate: build.mutation<
      CompoundCreateApiResponse,
      CompoundCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/compound/`,
        method: "POST",
        body: queryArg.compound,
      }),
    }),
    compoundRetrieve: build.query<
      CompoundRetrieveApiResponse,
      CompoundRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/compound/${queryArg.id}/` }),
    }),
    compoundUpdate: build.mutation<
      CompoundUpdateApiResponse,
      CompoundUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/compound/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.compound,
      }),
    }),
    compoundPartialUpdate: build.mutation<
      CompoundPartialUpdateApiResponse,
      CompoundPartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/compound/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedCompound,
      }),
    }),
    compoundDestroy: build.mutation<
      CompoundDestroyApiResponse,
      CompoundDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/compound/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    datasetList: build.query<DatasetListApiResponse, DatasetListApiArg>({
      query: (queryArg) => ({
        url: `/api/dataset/`,
        params: { project_id: queryArg.projectId },
      }),
    }),
    datasetCreate: build.mutation<
      DatasetCreateApiResponse,
      DatasetCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dataset/`,
        method: "POST",
        body: queryArg.dataset,
      }),
    }),
    datasetRetrieve: build.query<
      DatasetRetrieveApiResponse,
      DatasetRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/dataset/${queryArg.id}/` }),
    }),
    datasetUpdate: build.mutation<
      DatasetUpdateApiResponse,
      DatasetUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dataset/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.dataset,
      }),
    }),
    datasetPartialUpdate: build.mutation<
      DatasetPartialUpdateApiResponse,
      DatasetPartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dataset/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedDataset,
      }),
    }),
    datasetDestroy: build.mutation<
      DatasetDestroyApiResponse,
      DatasetDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dataset/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    datasetCsvUpdate: build.mutation<
      DatasetCsvUpdateApiResponse,
      DatasetCsvUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dataset/${queryArg.id}/csv/`,
        method: "PUT",
        body: queryArg.datasetCsv,
      }),
    }),
    doseList: build.query<DoseListApiResponse, DoseListApiArg>({
      query: () => ({ url: `/api/dose/` }),
    }),
    doseCreate: build.mutation<DoseCreateApiResponse, DoseCreateApiArg>({
      query: (queryArg) => ({
        url: `/api/dose/`,
        method: "POST",
        body: queryArg.dose,
      }),
    }),
    doseRetrieve: build.query<DoseRetrieveApiResponse, DoseRetrieveApiArg>({
      query: (queryArg) => ({ url: `/api/dose/${queryArg.id}/` }),
    }),
    doseUpdate: build.mutation<DoseUpdateApiResponse, DoseUpdateApiArg>({
      query: (queryArg) => ({
        url: `/api/dose/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.dose,
      }),
    }),
    dosePartialUpdate: build.mutation<
      DosePartialUpdateApiResponse,
      DosePartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dose/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedDose,
      }),
    }),
    doseDestroy: build.mutation<DoseDestroyApiResponse, DoseDestroyApiArg>({
      query: (queryArg) => ({
        url: `/api/dose/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    inferenceList: build.query<InferenceListApiResponse, InferenceListApiArg>({
      query: () => ({ url: `/api/inference/` }),
    }),
    inferenceCreate: build.mutation<
      InferenceCreateApiResponse,
      InferenceCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference/`,
        method: "POST",
        body: queryArg.inference,
      }),
    }),
    inferenceRetrieve: build.query<
      InferenceRetrieveApiResponse,
      InferenceRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/inference/${queryArg.id}/` }),
    }),
    inferenceUpdate: build.mutation<
      InferenceUpdateApiResponse,
      InferenceUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.inference,
      }),
    }),
    inferencePartialUpdate: build.mutation<
      InferencePartialUpdateApiResponse,
      InferencePartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedInference,
      }),
    }),
    inferenceDestroy: build.mutation<
      InferenceDestroyApiResponse,
      InferenceDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    inferenceStopCreate: build.mutation<
      InferenceStopCreateApiResponse,
      InferenceStopCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference/${queryArg.id}/stop`,
        method: "POST",
      }),
    }),
    inferenceWizardCreate: build.mutation<
      InferenceWizardCreateApiResponse,
      InferenceWizardCreateApiArg
    >({
      query: () => ({ url: `/api/inference/wizard`, method: "POST" }),
    }),
    inferenceChainList: build.query<
      InferenceChainListApiResponse,
      InferenceChainListApiArg
    >({
      query: () => ({ url: `/api/inference_chain/` }),
    }),
    inferenceChainCreate: build.mutation<
      InferenceChainCreateApiResponse,
      InferenceChainCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference_chain/`,
        method: "POST",
        body: queryArg.inferenceChain,
      }),
    }),
    inferenceChainRetrieve: build.query<
      InferenceChainRetrieveApiResponse,
      InferenceChainRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/inference_chain/${queryArg.id}/` }),
    }),
    inferenceChainUpdate: build.mutation<
      InferenceChainUpdateApiResponse,
      InferenceChainUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference_chain/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.inferenceChain,
      }),
    }),
    inferenceChainPartialUpdate: build.mutation<
      InferenceChainPartialUpdateApiResponse,
      InferenceChainPartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference_chain/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedInferenceChain,
      }),
    }),
    inferenceChainDestroy: build.mutation<
      InferenceChainDestroyApiResponse,
      InferenceChainDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference_chain/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    ncaCreate: build.mutation<NcaCreateApiResponse, NcaCreateApiArg>({
      query: () => ({ url: `/api/nca/`, method: "POST" }),
    }),
    pharmacodynamicList: build.query<
      PharmacodynamicListApiResponse,
      PharmacodynamicListApiArg
    >({
      query: () => ({ url: `/api/pharmacodynamic/` }),
    }),
    pharmacodynamicCreate: build.mutation<
      PharmacodynamicCreateApiResponse,
      PharmacodynamicCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/`,
        method: "POST",
        body: queryArg.pharmacodynamic,
      }),
    }),
    pharmacodynamicRetrieve: build.query<
      PharmacodynamicRetrieveApiResponse,
      PharmacodynamicRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/pharmacodynamic/${queryArg.id}/` }),
    }),
    pharmacodynamicUpdate: build.mutation<
      PharmacodynamicUpdateApiResponse,
      PharmacodynamicUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.pharmacodynamic,
      }),
    }),
    pharmacodynamicPartialUpdate: build.mutation<
      PharmacodynamicPartialUpdateApiResponse,
      PharmacodynamicPartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedPharmacodynamic,
      }),
    }),
    pharmacodynamicDestroy: build.mutation<
      PharmacodynamicDestroyApiResponse,
      PharmacodynamicDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    pharmacodynamicMmtUpdate: build.mutation<
      PharmacodynamicMmtUpdateApiResponse,
      PharmacodynamicMmtUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/${queryArg.id}/mmt/`,
        method: "PUT",
        body: queryArg.pharmacodynamic,
      }),
    }),
    pharmacodynamicSbmlUpdate: build.mutation<
      PharmacodynamicSbmlUpdateApiResponse,
      PharmacodynamicSbmlUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/${queryArg.id}/sbml/`,
        method: "PUT",
        body: queryArg.pharmacodynamicSbml,
      }),
    }),
    pharmacodynamicSetVariablesFromInferenceUpdate: build.mutation<
      PharmacodynamicSetVariablesFromInferenceUpdateApiResponse,
      PharmacodynamicSetVariablesFromInferenceUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/${queryArg.id}/set_variables_from_inference/`,
        method: "PUT",
        body: queryArg.pharmacodynamic,
      }),
    }),
    pharmacodynamicSimulateCreate: build.mutation<
      PharmacodynamicSimulateCreateApiResponse,
      PharmacodynamicSimulateCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/${queryArg.id}/simulate`,
        method: "POST",
        body: queryArg.simulate,
      }),
    }),
    pharmacokineticList: build.query<
      PharmacokineticListApiResponse,
      PharmacokineticListApiArg
    >({
      query: () => ({ url: `/api/pharmacokinetic/` }),
    }),
    pharmacokineticCreate: build.mutation<
      PharmacokineticCreateApiResponse,
      PharmacokineticCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacokinetic/`,
        method: "POST",
        body: queryArg.pharmacokinetic,
      }),
    }),
    pharmacokineticRetrieve: build.query<
      PharmacokineticRetrieveApiResponse,
      PharmacokineticRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/pharmacokinetic/${queryArg.id}/` }),
    }),
    pharmacokineticUpdate: build.mutation<
      PharmacokineticUpdateApiResponse,
      PharmacokineticUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacokinetic/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.pharmacokinetic,
      }),
    }),
    pharmacokineticPartialUpdate: build.mutation<
      PharmacokineticPartialUpdateApiResponse,
      PharmacokineticPartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacokinetic/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedPharmacokinetic,
      }),
    }),
    pharmacokineticDestroy: build.mutation<
      PharmacokineticDestroyApiResponse,
      PharmacokineticDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacokinetic/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    projectList: build.query<ProjectListApiResponse, ProjectListApiArg>({
      query: () => ({ url: `/api/project/` }),
    }),
    projectCreate: build.mutation<
      ProjectCreateApiResponse,
      ProjectCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project/`,
        method: "POST",
        body: queryArg.project,
      }),
    }),
    projectRetrieve: build.query<
      ProjectRetrieveApiResponse,
      ProjectRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/project/${queryArg.id}/` }),
    }),
    projectUpdate: build.mutation<
      ProjectUpdateApiResponse,
      ProjectUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.project,
      }),
    }),
    projectPartialUpdate: build.mutation<
      ProjectPartialUpdateApiResponse,
      ProjectPartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedProject,
      }),
    }),
    projectDestroy: build.mutation<
      ProjectDestroyApiResponse,
      ProjectDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    projectCopyUpdate: build.mutation<
      ProjectCopyUpdateApiResponse,
      ProjectCopyUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project/${queryArg.id}/copy/`,
        method: "PUT",
        body: queryArg.project,
      }),
    }),
    projectMonolixUpdate: build.mutation<
      ProjectMonolixUpdateApiResponse,
      ProjectMonolixUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project/${queryArg.id}/monolix/`,
        method: "PUT",
        body: queryArg.monolix,
      }),
    }),
    projectAccessList: build.query<
      ProjectAccessListApiResponse,
      ProjectAccessListApiArg
    >({
      query: () => ({ url: `/api/project_access/` }),
    }),
    projectAccessCreate: build.mutation<
      ProjectAccessCreateApiResponse,
      ProjectAccessCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project_access/`,
        method: "POST",
        body: queryArg.projectAccess,
      }),
    }),
    projectAccessRetrieve: build.query<
      ProjectAccessRetrieveApiResponse,
      ProjectAccessRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/project_access/${queryArg.id}/` }),
    }),
    projectAccessUpdate: build.mutation<
      ProjectAccessUpdateApiResponse,
      ProjectAccessUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project_access/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.projectAccess,
      }),
    }),
    projectAccessPartialUpdate: build.mutation<
      ProjectAccessPartialUpdateApiResponse,
      ProjectAccessPartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project_access/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedProjectAccess,
      }),
    }),
    projectAccessDestroy: build.mutation<
      ProjectAccessDestroyApiResponse,
      ProjectAccessDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project_access/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    protocolList: build.query<ProtocolListApiResponse, ProtocolListApiArg>({
      query: (queryArg) => ({
        url: `/api/protocol/`,
        params: {
          dataset_id: queryArg.datasetId,
          project_id: queryArg.projectId,
        },
      }),
    }),
    protocolCreate: build.mutation<
      ProtocolCreateApiResponse,
      ProtocolCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/protocol/`,
        method: "POST",
        body: queryArg.protocol,
      }),
    }),
    protocolRetrieve: build.query<
      ProtocolRetrieveApiResponse,
      ProtocolRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/protocol/${queryArg.id}/` }),
    }),
    protocolUpdate: build.mutation<
      ProtocolUpdateApiResponse,
      ProtocolUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/protocol/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.protocol,
      }),
    }),
    protocolPartialUpdate: build.mutation<
      ProtocolPartialUpdateApiResponse,
      ProtocolPartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/protocol/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedProtocol,
      }),
    }),
    protocolDestroy: build.mutation<
      ProtocolDestroyApiResponse,
      ProtocolDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/protocol/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    sessionRetrieve: build.query<
      SessionRetrieveApiResponse,
      SessionRetrieveApiArg
    >({
      query: () => ({ url: `/api/session/` }),
    }),
    simulationList: build.query<
      SimulationListApiResponse,
      SimulationListApiArg
    >({
      query: (queryArg) => ({
        url: `/api/simulation/`,
        params: { project_id: queryArg.projectId },
      }),
    }),
    simulationCreate: build.mutation<
      SimulationCreateApiResponse,
      SimulationCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/simulation/`,
        method: "POST",
        body: queryArg.simulation,
      }),
    }),
    simulationRetrieve: build.query<
      SimulationRetrieveApiResponse,
      SimulationRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/simulation/${queryArg.id}/` }),
    }),
    simulationUpdate: build.mutation<
      SimulationUpdateApiResponse,
      SimulationUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/simulation/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.simulation,
      }),
    }),
    simulationPartialUpdate: build.mutation<
      SimulationPartialUpdateApiResponse,
      SimulationPartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/simulation/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedSimulation,
      }),
    }),
    simulationDestroy: build.mutation<
      SimulationDestroyApiResponse,
      SimulationDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/simulation/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    subjectList: build.query<SubjectListApiResponse, SubjectListApiArg>({
      query: (queryArg) => ({
        url: `/api/subject/`,
        params: {
          dataset_id: queryArg.datasetId,
          project_id: queryArg.projectId,
        },
      }),
    }),
    subjectCreate: build.mutation<
      SubjectCreateApiResponse,
      SubjectCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/subject/`,
        method: "POST",
        body: queryArg.subject,
      }),
    }),
    subjectRetrieve: build.query<
      SubjectRetrieveApiResponse,
      SubjectRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/subject/${queryArg.id}/` }),
    }),
    subjectUpdate: build.mutation<
      SubjectUpdateApiResponse,
      SubjectUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/subject/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.subject,
      }),
    }),
    subjectPartialUpdate: build.mutation<
      SubjectPartialUpdateApiResponse,
      SubjectPartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/subject/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedSubject,
      }),
    }),
    subjectDestroy: build.mutation<
      SubjectDestroyApiResponse,
      SubjectDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/subject/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    subjectGroupList: build.query<
      SubjectGroupListApiResponse,
      SubjectGroupListApiArg
    >({
      query: (queryArg) => ({
        url: `/api/subject_group/`,
        params: {
          dataset_id: queryArg.datasetId,
          project_id: queryArg.projectId,
        },
      }),
    }),
    subjectGroupCreate: build.mutation<
      SubjectGroupCreateApiResponse,
      SubjectGroupCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/subject_group/`,
        method: "POST",
        body: queryArg.subjectGroup,
      }),
    }),
    subjectGroupRetrieve: build.query<
      SubjectGroupRetrieveApiResponse,
      SubjectGroupRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/subject_group/${queryArg.id}/` }),
    }),
    subjectGroupUpdate: build.mutation<
      SubjectGroupUpdateApiResponse,
      SubjectGroupUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/subject_group/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.subjectGroup,
      }),
    }),
    subjectGroupPartialUpdate: build.mutation<
      SubjectGroupPartialUpdateApiResponse,
      SubjectGroupPartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/subject_group/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedSubjectGroup,
      }),
    }),
    subjectGroupDestroy: build.mutation<
      SubjectGroupDestroyApiResponse,
      SubjectGroupDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/subject_group/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    unitList: build.query<UnitListApiResponse, UnitListApiArg>({
      query: (queryArg) => ({
        url: `/api/unit/`,
        params: {
          compound_id: queryArg.compoundId,
          ordering: queryArg.ordering,
        },
      }),
    }),
    unitCreate: build.mutation<UnitCreateApiResponse, UnitCreateApiArg>({
      query: (queryArg) => ({
        url: `/api/unit/`,
        method: "POST",
        body: queryArg.unit,
      }),
    }),
    unitRetrieve: build.query<UnitRetrieveApiResponse, UnitRetrieveApiArg>({
      query: (queryArg) => ({
        url: `/api/unit/${queryArg.id}/`,
        params: { compound_id: queryArg.compoundId },
      }),
    }),
    unitUpdate: build.mutation<UnitUpdateApiResponse, UnitUpdateApiArg>({
      query: (queryArg) => ({
        url: `/api/unit/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.unit,
      }),
    }),
    unitPartialUpdate: build.mutation<
      UnitPartialUpdateApiResponse,
      UnitPartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/unit/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedUnit,
      }),
    }),
    unitDestroy: build.mutation<UnitDestroyApiResponse, UnitDestroyApiArg>({
      query: (queryArg) => ({
        url: `/api/unit/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    userList: build.query<UserListApiResponse, UserListApiArg>({
      query: () => ({ url: `/api/user/` }),
    }),
    userCreate: build.mutation<UserCreateApiResponse, UserCreateApiArg>({
      query: (queryArg) => ({
        url: `/api/user/`,
        method: "POST",
        body: queryArg.user,
      }),
    }),
    userRetrieve: build.query<UserRetrieveApiResponse, UserRetrieveApiArg>({
      query: (queryArg) => ({ url: `/api/user/${queryArg.id}/` }),
    }),
    userUpdate: build.mutation<UserUpdateApiResponse, UserUpdateApiArg>({
      query: (queryArg) => ({
        url: `/api/user/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.user,
      }),
    }),
    userPartialUpdate: build.mutation<
      UserPartialUpdateApiResponse,
      UserPartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/user/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedUser,
      }),
    }),
    userDestroy: build.mutation<UserDestroyApiResponse, UserDestroyApiArg>({
      query: (queryArg) => ({
        url: `/api/user/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    variableList: build.query<VariableListApiResponse, VariableListApiArg>({
      query: (queryArg) => ({
        url: `/api/variable/`,
        params: {
          dosed_pk_model_id: queryArg.dosedPkModelId,
          pd_model_id: queryArg.pdModelId,
          project_id: queryArg.projectId,
        },
      }),
    }),
    variableCreate: build.mutation<
      VariableCreateApiResponse,
      VariableCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/variable/`,
        method: "POST",
        body: queryArg.variable,
      }),
    }),
    variableRetrieve: build.query<
      VariableRetrieveApiResponse,
      VariableRetrieveApiArg
    >({
      query: (queryArg) => ({ url: `/api/variable/${queryArg.id}/` }),
    }),
    variableUpdate: build.mutation<
      VariableUpdateApiResponse,
      VariableUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/variable/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.variable,
      }),
    }),
    variablePartialUpdate: build.mutation<
      VariablePartialUpdateApiResponse,
      VariablePartialUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/api/variable/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.patchedVariable,
      }),
    }),
    variableDestroy: build.mutation<
      VariableDestroyApiResponse,
      VariableDestroyApiArg
    >({
      query: (queryArg) => ({
        url: `/api/variable/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    whoamiRetrieve: build.query<
      WhoamiRetrieveApiResponse,
      WhoamiRetrieveApiArg
    >({
      query: () => ({ url: `/api/whoami/` }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as backendApi };
export type AlgorithmListApiResponse = /** status 200  */ AlgorithmRead[];
export type AlgorithmListApiArg = void;
export type AlgorithmCreateApiResponse = /** status 201  */ AlgorithmRead;
export type AlgorithmCreateApiArg = {
  algorithm: Algorithm;
};
export type AlgorithmRetrieveApiResponse = /** status 200  */ AlgorithmRead;
export type AlgorithmRetrieveApiArg = {
  /** A unique integer value identifying this algorithm. */
  id: number;
};
export type AlgorithmUpdateApiResponse = /** status 200  */ AlgorithmRead;
export type AlgorithmUpdateApiArg = {
  /** A unique integer value identifying this algorithm. */
  id: number;
  algorithm: Algorithm;
};
export type AlgorithmPartialUpdateApiResponse =
  /** status 200  */ AlgorithmRead;
export type AlgorithmPartialUpdateApiArg = {
  /** A unique integer value identifying this algorithm. */
  id: number;
  patchedAlgorithm: PatchedAlgorithm;
};
export type AlgorithmDestroyApiResponse = unknown;
export type AlgorithmDestroyApiArg = {
  /** A unique integer value identifying this algorithm. */
  id: number;
};
export type AuceCreateApiResponse = unknown;
export type AuceCreateApiArg = void;
export type BiomarkerTypeListApiResponse =
  /** status 200  */ BiomarkerTypeRead[];
export type BiomarkerTypeListApiArg = {
  /** Filter results by dataset ID */
  datasetId?: number;
};
export type BiomarkerTypeCreateApiResponse =
  /** status 201  */ BiomarkerTypeRead;
export type BiomarkerTypeCreateApiArg = {
  biomarkerType: BiomarkerType;
};
export type BiomarkerTypeRetrieveApiResponse =
  /** status 200  */ BiomarkerTypeRead;
export type BiomarkerTypeRetrieveApiArg = {
  /** A unique integer value identifying this biomarker type. */
  id: number;
};
export type BiomarkerTypeUpdateApiResponse =
  /** status 200  */ BiomarkerTypeRead;
export type BiomarkerTypeUpdateApiArg = {
  /** A unique integer value identifying this biomarker type. */
  id: number;
  biomarkerType: BiomarkerType;
};
export type BiomarkerTypePartialUpdateApiResponse =
  /** status 200  */ BiomarkerTypeRead;
export type BiomarkerTypePartialUpdateApiArg = {
  /** A unique integer value identifying this biomarker type. */
  id: number;
  patchedBiomarkerType: PatchedBiomarkerType;
};
export type BiomarkerTypeDestroyApiResponse = unknown;
export type BiomarkerTypeDestroyApiArg = {
  /** A unique integer value identifying this biomarker type. */
  id: number;
};
export type CombinedModelListApiResponse =
  /** status 200  */ CombinedModelRead[];
export type CombinedModelListApiArg = {
  /** Filter results by project ID */
  projectId?: number;
};
export type CombinedModelCreateApiResponse =
  /** status 201  */ CombinedModelRead;
export type CombinedModelCreateApiArg = {
  combinedModel: CombinedModel;
};
export type CombinedModelRetrieveApiResponse =
  /** status 200  */ CombinedModelRead;
export type CombinedModelRetrieveApiArg = {
  /** A unique integer value identifying this combined model. */
  id: number;
};
export type CombinedModelUpdateApiResponse =
  /** status 200  */ CombinedModelRead;
export type CombinedModelUpdateApiArg = {
  /** A unique integer value identifying this combined model. */
  id: number;
  combinedModel: CombinedModel;
};
export type CombinedModelPartialUpdateApiResponse =
  /** status 200  */ CombinedModelRead;
export type CombinedModelPartialUpdateApiArg = {
  /** A unique integer value identifying this combined model. */
  id: number;
  patchedCombinedModel: PatchedCombinedModel;
};
export type CombinedModelDestroyApiResponse = unknown;
export type CombinedModelDestroyApiArg = {
  /** A unique integer value identifying this combined model. */
  id: number;
};
export type CombinedModelSetParamsToDefaultsUpdateApiResponse =
  /** status 200  */ CombinedModelRead;
export type CombinedModelSetParamsToDefaultsUpdateApiArg = {
  /** A unique integer value identifying this combined model. */
  id: number;
  combinedModel: CombinedModel;
};
export type CombinedModelSetVariablesFromInferenceUpdateApiResponse =
  /** status 200  */ CombinedModelRead;
export type CombinedModelSetVariablesFromInferenceUpdateApiArg = {
  /** A unique integer value identifying this combined model. */
  id: number;
  combinedModel: CombinedModel;
};
export type CombinedModelSimulateCreateApiResponse =
  /** status 200  */ SimulateResponse[];
export type CombinedModelSimulateCreateApiArg = {
  id: number;
  simulate: Simulate;
};
export type CompoundListApiResponse = /** status 200  */ CompoundRead[];
export type CompoundListApiArg = void;
export type CompoundCreateApiResponse = /** status 201  */ CompoundRead;
export type CompoundCreateApiArg = {
  compound: Compound;
};
export type CompoundRetrieveApiResponse = /** status 200  */ CompoundRead;
export type CompoundRetrieveApiArg = {
  /** A unique integer value identifying this compound. */
  id: number;
};
export type CompoundUpdateApiResponse = /** status 200  */ CompoundRead;
export type CompoundUpdateApiArg = {
  /** A unique integer value identifying this compound. */
  id: number;
  compound: Compound;
};
export type CompoundPartialUpdateApiResponse = /** status 200  */ CompoundRead;
export type CompoundPartialUpdateApiArg = {
  /** A unique integer value identifying this compound. */
  id: number;
  patchedCompound: PatchedCompound;
};
export type CompoundDestroyApiResponse = unknown;
export type CompoundDestroyApiArg = {
  /** A unique integer value identifying this compound. */
  id: number;
};
export type DatasetListApiResponse = /** status 200  */ DatasetRead[];
export type DatasetListApiArg = {
  /** Filter results by project ID */
  projectId?: number;
};
export type DatasetCreateApiResponse = /** status 201  */ DatasetRead;
export type DatasetCreateApiArg = {
  dataset: Dataset;
};
export type DatasetRetrieveApiResponse = /** status 200  */ DatasetRead;
export type DatasetRetrieveApiArg = {
  /** A unique integer value identifying this dataset. */
  id: number;
};
export type DatasetUpdateApiResponse = /** status 200  */ DatasetRead;
export type DatasetUpdateApiArg = {
  /** A unique integer value identifying this dataset. */
  id: number;
  dataset: Dataset;
};
export type DatasetPartialUpdateApiResponse = /** status 200  */ DatasetRead;
export type DatasetPartialUpdateApiArg = {
  /** A unique integer value identifying this dataset. */
  id: number;
  patchedDataset: PatchedDataset;
};
export type DatasetDestroyApiResponse = unknown;
export type DatasetDestroyApiArg = {
  /** A unique integer value identifying this dataset. */
  id: number;
};
export type DatasetCsvUpdateApiResponse = /** status 200  */ DatasetCsv;
export type DatasetCsvUpdateApiArg = {
  /** A unique integer value identifying this dataset. */
  id: number;
  datasetCsv: DatasetCsv;
};
export type DoseListApiResponse = /** status 200  */ DoseRead[];
export type DoseListApiArg = void;
export type DoseCreateApiResponse = /** status 201  */ DoseRead;
export type DoseCreateApiArg = {
  dose: Dose;
};
export type DoseRetrieveApiResponse = /** status 200  */ DoseRead;
export type DoseRetrieveApiArg = {
  /** A unique integer value identifying this dose. */
  id: number;
};
export type DoseUpdateApiResponse = /** status 200  */ DoseRead;
export type DoseUpdateApiArg = {
  /** A unique integer value identifying this dose. */
  id: number;
  dose: Dose;
};
export type DosePartialUpdateApiResponse = /** status 200  */ DoseRead;
export type DosePartialUpdateApiArg = {
  /** A unique integer value identifying this dose. */
  id: number;
  patchedDose: PatchedDose;
};
export type DoseDestroyApiResponse = unknown;
export type DoseDestroyApiArg = {
  /** A unique integer value identifying this dose. */
  id: number;
};
export type InferenceListApiResponse = /** status 200  */ InferenceRead[];
export type InferenceListApiArg = void;
export type InferenceCreateApiResponse = /** status 201  */ InferenceRead;
export type InferenceCreateApiArg = {
  inference: Inference;
};
export type InferenceRetrieveApiResponse = /** status 200  */ InferenceRead;
export type InferenceRetrieveApiArg = {
  /** A unique integer value identifying this inference. */
  id: number;
};
export type InferenceUpdateApiResponse = /** status 200  */ InferenceRead;
export type InferenceUpdateApiArg = {
  /** A unique integer value identifying this inference. */
  id: number;
  inference: Inference;
};
export type InferencePartialUpdateApiResponse =
  /** status 200  */ InferenceRead;
export type InferencePartialUpdateApiArg = {
  /** A unique integer value identifying this inference. */
  id: number;
  patchedInference: PatchedInference;
};
export type InferenceDestroyApiResponse = unknown;
export type InferenceDestroyApiArg = {
  /** A unique integer value identifying this inference. */
  id: number;
};
export type InferenceStopCreateApiResponse = unknown;
export type InferenceStopCreateApiArg = {
  id: number;
};
export type InferenceWizardCreateApiResponse = unknown;
export type InferenceWizardCreateApiArg = void;
export type InferenceChainListApiResponse =
  /** status 200  */ InferenceChainRead[];
export type InferenceChainListApiArg = void;
export type InferenceChainCreateApiResponse =
  /** status 201  */ InferenceChainRead;
export type InferenceChainCreateApiArg = {
  inferenceChain: InferenceChain;
};
export type InferenceChainRetrieveApiResponse =
  /** status 200  */ InferenceChainRead;
export type InferenceChainRetrieveApiArg = {
  /** A unique integer value identifying this inference chain. */
  id: number;
};
export type InferenceChainUpdateApiResponse =
  /** status 200  */ InferenceChainRead;
export type InferenceChainUpdateApiArg = {
  /** A unique integer value identifying this inference chain. */
  id: number;
  inferenceChain: InferenceChain;
};
export type InferenceChainPartialUpdateApiResponse =
  /** status 200  */ InferenceChainRead;
export type InferenceChainPartialUpdateApiArg = {
  /** A unique integer value identifying this inference chain. */
  id: number;
  patchedInferenceChain: PatchedInferenceChain;
};
export type InferenceChainDestroyApiResponse = unknown;
export type InferenceChainDestroyApiArg = {
  /** A unique integer value identifying this inference chain. */
  id: number;
};
export type NcaCreateApiResponse = unknown;
export type NcaCreateApiArg = void;
export type PharmacodynamicListApiResponse =
  /** status 200  */ PharmacodynamicRead[];
export type PharmacodynamicListApiArg = void;
export type PharmacodynamicCreateApiResponse =
  /** status 201  */ PharmacodynamicRead;
export type PharmacodynamicCreateApiArg = {
  pharmacodynamic: Pharmacodynamic;
};
export type PharmacodynamicRetrieveApiResponse =
  /** status 200  */ PharmacodynamicRead;
export type PharmacodynamicRetrieveApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: number;
};
export type PharmacodynamicUpdateApiResponse =
  /** status 200  */ PharmacodynamicRead;
export type PharmacodynamicUpdateApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: number;
  pharmacodynamic: Pharmacodynamic;
};
export type PharmacodynamicPartialUpdateApiResponse =
  /** status 200  */ PharmacodynamicRead;
export type PharmacodynamicPartialUpdateApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: number;
  patchedPharmacodynamic: PatchedPharmacodynamic;
};
export type PharmacodynamicDestroyApiResponse = unknown;
export type PharmacodynamicDestroyApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: number;
};
export type PharmacodynamicMmtUpdateApiResponse =
  /** status 200  */ PharmacodynamicRead;
export type PharmacodynamicMmtUpdateApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: number;
  pharmacodynamic: Pharmacodynamic;
};
export type PharmacodynamicSbmlUpdateApiResponse =
  /** status 200  */ PharmacodynamicSbml;
export type PharmacodynamicSbmlUpdateApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: number;
  pharmacodynamicSbml: PharmacodynamicSbmlWrite;
};
export type PharmacodynamicSetVariablesFromInferenceUpdateApiResponse =
  /** status 200  */ PharmacodynamicRead;
export type PharmacodynamicSetVariablesFromInferenceUpdateApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: number;
  pharmacodynamic: Pharmacodynamic;
};
export type PharmacodynamicSimulateCreateApiResponse =
  /** status 200  */ SimulateResponse[];
export type PharmacodynamicSimulateCreateApiArg = {
  id: number;
  simulate: Simulate;
};
export type PharmacokineticListApiResponse =
  /** status 200  */ PharmacokineticRead[];
export type PharmacokineticListApiArg = void;
export type PharmacokineticCreateApiResponse =
  /** status 201  */ PharmacokineticRead;
export type PharmacokineticCreateApiArg = {
  pharmacokinetic: Pharmacokinetic;
};
export type PharmacokineticRetrieveApiResponse =
  /** status 200  */ PharmacokineticRead;
export type PharmacokineticRetrieveApiArg = {
  /** A unique integer value identifying this pharmacokinetic model. */
  id: number;
};
export type PharmacokineticUpdateApiResponse =
  /** status 200  */ PharmacokineticRead;
export type PharmacokineticUpdateApiArg = {
  /** A unique integer value identifying this pharmacokinetic model. */
  id: number;
  pharmacokinetic: Pharmacokinetic;
};
export type PharmacokineticPartialUpdateApiResponse =
  /** status 200  */ PharmacokineticRead;
export type PharmacokineticPartialUpdateApiArg = {
  /** A unique integer value identifying this pharmacokinetic model. */
  id: number;
  patchedPharmacokinetic: PatchedPharmacokinetic;
};
export type PharmacokineticDestroyApiResponse = unknown;
export type PharmacokineticDestroyApiArg = {
  /** A unique integer value identifying this pharmacokinetic model. */
  id: number;
};
export type ProjectListApiResponse = /** status 200  */ ProjectRead[];
export type ProjectListApiArg = void;
export type ProjectCreateApiResponse = /** status 201  */ ProjectRead;
export type ProjectCreateApiArg = {
  project: Project;
};
export type ProjectRetrieveApiResponse = /** status 200  */ ProjectRead;
export type ProjectRetrieveApiArg = {
  /** A unique integer value identifying this project. */
  id: number;
};
export type ProjectUpdateApiResponse = /** status 200  */ ProjectRead;
export type ProjectUpdateApiArg = {
  /** A unique integer value identifying this project. */
  id: number;
  project: Project;
};
export type ProjectPartialUpdateApiResponse = /** status 200  */ ProjectRead;
export type ProjectPartialUpdateApiArg = {
  /** A unique integer value identifying this project. */
  id: number;
  patchedProject: PatchedProject;
};
export type ProjectDestroyApiResponse = unknown;
export type ProjectDestroyApiArg = {
  /** A unique integer value identifying this project. */
  id: number;
};
export type ProjectCopyUpdateApiResponse = /** status 200  */ ProjectRead;
export type ProjectCopyUpdateApiArg = {
  /** A unique integer value identifying this project. */
  id: number;
  project: Project;
};
export type ProjectMonolixUpdateApiResponse = /** status 200  */ MonolixRead;
export type ProjectMonolixUpdateApiArg = {
  /** A unique integer value identifying this project. */
  id: number;
  monolix: MonolixWrite;
};
export type ProjectAccessListApiResponse =
  /** status 200  */ ProjectAccessRead[];
export type ProjectAccessListApiArg = void;
export type ProjectAccessCreateApiResponse =
  /** status 201  */ ProjectAccessRead;
export type ProjectAccessCreateApiArg = {
  projectAccess: ProjectAccess;
};
export type ProjectAccessRetrieveApiResponse =
  /** status 200  */ ProjectAccessRead;
export type ProjectAccessRetrieveApiArg = {
  /** A unique integer value identifying this project access. */
  id: number;
};
export type ProjectAccessUpdateApiResponse =
  /** status 200  */ ProjectAccessRead;
export type ProjectAccessUpdateApiArg = {
  /** A unique integer value identifying this project access. */
  id: number;
  projectAccess: ProjectAccess;
};
export type ProjectAccessPartialUpdateApiResponse =
  /** status 200  */ ProjectAccessRead;
export type ProjectAccessPartialUpdateApiArg = {
  /** A unique integer value identifying this project access. */
  id: number;
  patchedProjectAccess: PatchedProjectAccess;
};
export type ProjectAccessDestroyApiResponse = unknown;
export type ProjectAccessDestroyApiArg = {
  /** A unique integer value identifying this project access. */
  id: number;
};
export type ProtocolListApiResponse = /** status 200  */ ProtocolRead[];
export type ProtocolListApiArg = {
  /** Filter results by dataset ID */
  datasetId?: number;
  /** Filter results by project ID */
  projectId?: number;
};
export type ProtocolCreateApiResponse = /** status 201  */ ProtocolRead;
export type ProtocolCreateApiArg = {
  protocol: Protocol;
};
export type ProtocolRetrieveApiResponse = /** status 200  */ ProtocolRead;
export type ProtocolRetrieveApiArg = {
  /** A unique integer value identifying this protocol. */
  id: number;
};
export type ProtocolUpdateApiResponse = /** status 200  */ ProtocolRead;
export type ProtocolUpdateApiArg = {
  /** A unique integer value identifying this protocol. */
  id: number;
  protocol: Protocol;
};
export type ProtocolPartialUpdateApiResponse = /** status 200  */ ProtocolRead;
export type ProtocolPartialUpdateApiArg = {
  /** A unique integer value identifying this protocol. */
  id: number;
  patchedProtocol: PatchedProtocol;
};
export type ProtocolDestroyApiResponse = unknown;
export type ProtocolDestroyApiArg = {
  /** A unique integer value identifying this protocol. */
  id: number;
};
export type SessionRetrieveApiResponse = unknown;
export type SessionRetrieveApiArg = void;
export type SimulationListApiResponse = /** status 200  */ SimulationRead[];
export type SimulationListApiArg = {
  /** Filter results by project ID */
  projectId?: number;
};
export type SimulationCreateApiResponse = /** status 201  */ SimulationRead;
export type SimulationCreateApiArg = {
  simulation: Simulation;
};
export type SimulationRetrieveApiResponse = /** status 200  */ SimulationRead;
export type SimulationRetrieveApiArg = {
  /** A unique integer value identifying this simulation. */
  id: number;
};
export type SimulationUpdateApiResponse = /** status 200  */ SimulationRead;
export type SimulationUpdateApiArg = {
  /** A unique integer value identifying this simulation. */
  id: number;
  simulation: Simulation;
};
export type SimulationPartialUpdateApiResponse =
  /** status 200  */ SimulationRead;
export type SimulationPartialUpdateApiArg = {
  /** A unique integer value identifying this simulation. */
  id: number;
  patchedSimulation: PatchedSimulation;
};
export type SimulationDestroyApiResponse = unknown;
export type SimulationDestroyApiArg = {
  /** A unique integer value identifying this simulation. */
  id: number;
};
export type SubjectListApiResponse = /** status 200  */ SubjectRead[];
export type SubjectListApiArg = {
  /** Filter results by dataset ID */
  datasetId?: number;
  /** Filter results by project ID */
  projectId?: number;
};
export type SubjectCreateApiResponse = /** status 201  */ SubjectRead;
export type SubjectCreateApiArg = {
  subject: Subject;
};
export type SubjectRetrieveApiResponse = /** status 200  */ SubjectRead;
export type SubjectRetrieveApiArg = {
  /** A unique integer value identifying this subject. */
  id: number;
};
export type SubjectUpdateApiResponse = /** status 200  */ SubjectRead;
export type SubjectUpdateApiArg = {
  /** A unique integer value identifying this subject. */
  id: number;
  subject: Subject;
};
export type SubjectPartialUpdateApiResponse = /** status 200  */ SubjectRead;
export type SubjectPartialUpdateApiArg = {
  /** A unique integer value identifying this subject. */
  id: number;
  patchedSubject: PatchedSubject;
};
export type SubjectDestroyApiResponse = unknown;
export type SubjectDestroyApiArg = {
  /** A unique integer value identifying this subject. */
  id: number;
};
export type SubjectGroupListApiResponse = /** status 200  */ SubjectGroupRead[];
export type SubjectGroupListApiArg = {
  /** Filter results by dataset ID */
  datasetId?: number;
  /** Filter results by project ID */
  projectId?: number;
};
export type SubjectGroupCreateApiResponse = /** status 201  */ SubjectGroupRead;
export type SubjectGroupCreateApiArg = {
  subjectGroup: SubjectGroup;
};
export type SubjectGroupRetrieveApiResponse =
  /** status 200  */ SubjectGroupRead;
export type SubjectGroupRetrieveApiArg = {
  /** A unique integer value identifying this subject group. */
  id: number;
};
export type SubjectGroupUpdateApiResponse = /** status 200  */ SubjectGroupRead;
export type SubjectGroupUpdateApiArg = {
  /** A unique integer value identifying this subject group. */
  id: number;
  subjectGroup: SubjectGroup;
};
export type SubjectGroupPartialUpdateApiResponse =
  /** status 200  */ SubjectGroupRead;
export type SubjectGroupPartialUpdateApiArg = {
  /** A unique integer value identifying this subject group. */
  id: number;
  patchedSubjectGroup: PatchedSubjectGroup;
};
export type SubjectGroupDestroyApiResponse = unknown;
export type SubjectGroupDestroyApiArg = {
  /** A unique integer value identifying this subject group. */
  id: number;
};
export type UnitListApiResponse = /** status 200  */ UnitRead[];
export type UnitListApiArg = {
  /** Enable conversions based on compound information */
  compoundId?: number;
  /** Which field to use when ordering the results. */
  ordering?: string;
};
export type UnitCreateApiResponse = /** status 201  */ UnitRead;
export type UnitCreateApiArg = {
  unit: Unit;
};
export type UnitRetrieveApiResponse = /** status 200  */ UnitRead;
export type UnitRetrieveApiArg = {
  /** Enable conversions based on compound information */
  compoundId?: number;
  /** A unique integer value identifying this unit. */
  id: number;
};
export type UnitUpdateApiResponse = /** status 200  */ UnitRead;
export type UnitUpdateApiArg = {
  /** A unique integer value identifying this unit. */
  id: number;
  unit: Unit;
};
export type UnitPartialUpdateApiResponse = /** status 200  */ UnitRead;
export type UnitPartialUpdateApiArg = {
  /** A unique integer value identifying this unit. */
  id: number;
  patchedUnit: PatchedUnit;
};
export type UnitDestroyApiResponse = unknown;
export type UnitDestroyApiArg = {
  /** A unique integer value identifying this unit. */
  id: number;
};
export type UserListApiResponse = /** status 200  */ UserRead[];
export type UserListApiArg = void;
export type UserCreateApiResponse = /** status 201  */ UserRead;
export type UserCreateApiArg = {
  user: User;
};
export type UserRetrieveApiResponse = /** status 200  */ UserRead;
export type UserRetrieveApiArg = {
  /** A unique integer value identifying this user. */
  id: number;
};
export type UserUpdateApiResponse = /** status 200  */ UserRead;
export type UserUpdateApiArg = {
  /** A unique integer value identifying this user. */
  id: number;
  user: User;
};
export type UserPartialUpdateApiResponse = /** status 200  */ UserRead;
export type UserPartialUpdateApiArg = {
  /** A unique integer value identifying this user. */
  id: number;
  patchedUser: PatchedUser;
};
export type UserDestroyApiResponse = unknown;
export type UserDestroyApiArg = {
  /** A unique integer value identifying this user. */
  id: number;
};
export type VariableListApiResponse = /** status 200  */ VariableRead[];
export type VariableListApiArg = {
  /** Filter results by dosed_pk_model ID */
  dosedPkModelId?: number;
  /** Filter results by pd_model ID */
  pdModelId?: number;
  /** Filter results by project ID */
  projectId?: number;
};
export type VariableCreateApiResponse = /** status 201  */ VariableRead;
export type VariableCreateApiArg = {
  variable: Variable;
};
export type VariableRetrieveApiResponse = /** status 200  */ VariableRead;
export type VariableRetrieveApiArg = {
  /** A unique integer value identifying this variable. */
  id: number;
};
export type VariableUpdateApiResponse = /** status 200  */ VariableRead;
export type VariableUpdateApiArg = {
  /** A unique integer value identifying this variable. */
  id: number;
  variable: Variable;
};
export type VariablePartialUpdateApiResponse = /** status 200  */ VariableRead;
export type VariablePartialUpdateApiArg = {
  /** A unique integer value identifying this variable. */
  id: number;
  patchedVariable: PatchedVariable;
};
export type VariableDestroyApiResponse = unknown;
export type VariableDestroyApiArg = {
  /** A unique integer value identifying this variable. */
  id: number;
};
export type WhoamiRetrieveApiResponse = unknown;
export type WhoamiRetrieveApiArg = void;
export type CategoryEnum = "SA" | "OP" | "OT";
export type Algorithm = {
  /** name of the algorithm */
  name: string;
  category: CategoryEnum;
};
export type AlgorithmRead = {
  id: number;
  /** name of the algorithm */
  name: string;
  category: CategoryEnum;
};
export type PatchedAlgorithm = {
  /** name of the algorithm */
  name?: string;
  category?: CategoryEnum;
};
export type PatchedAlgorithmRead = {
  id?: number;
  /** name of the algorithm */
  name?: string;
  category?: CategoryEnum;
};
export type BiomarkerType = {
  /** name of the biomarker type */
  name: string;
  /** short description of the biomarker type */
  description?: string | null;
  /** True if this biomarker type will be displayed in the frontend, False otherwise */
  display?: boolean;
  /** Color index associated with this biomarker type. For plotting purposes in the frontend */
  color?: number;
  /** True/False if biomarker type displayed on LHS/RHS axis */
  axis?: boolean;
  /** qname of the mapped model variable */
  mapped_qname?: string;
  /** unit for the value stored in :model:`pkpdapp.Biomarker` */
  stored_unit: number;
  /** dataset containing this biomarker measurement */
  dataset: number;
  /** unit to use when sending or displaying biomarker values */
  display_unit: number;
  /** unit for the time values stored in :model:`pkpdapp.Biomarker` */
  stored_time_unit: number;
  /** unit to use when sending or displaying time values */
  display_time_unit: number;
};
export type BiomarkerTypeRead = {
  id: number;
  data: {
    [key: string]: any[];
  } | null;
  is_continuous: boolean;
  is_categorical: boolean;
  /** name of the biomarker type */
  name: string;
  /** short description of the biomarker type */
  description?: string | null;
  /** True if this biomarker type will be displayed in the frontend, False otherwise */
  display?: boolean;
  /** Color index associated with this biomarker type. For plotting purposes in the frontend */
  color?: number;
  /** True/False if biomarker type displayed on LHS/RHS axis */
  axis?: boolean;
  /** qname of the mapped model variable */
  mapped_qname?: string;
  /** unit for the value stored in :model:`pkpdapp.Biomarker` */
  stored_unit: number;
  /** dataset containing this biomarker measurement */
  dataset: number;
  /** unit to use when sending or displaying biomarker values */
  display_unit: number;
  /** unit for the time values stored in :model:`pkpdapp.Biomarker` */
  stored_time_unit: number;
  /** unit to use when sending or displaying time values */
  display_time_unit: number;
};
export type PatchedBiomarkerType = {
  /** name of the biomarker type */
  name?: string;
  /** short description of the biomarker type */
  description?: string | null;
  /** True if this biomarker type will be displayed in the frontend, False otherwise */
  display?: boolean;
  /** Color index associated with this biomarker type. For plotting purposes in the frontend */
  color?: number;
  /** True/False if biomarker type displayed on LHS/RHS axis */
  axis?: boolean;
  /** qname of the mapped model variable */
  mapped_qname?: string;
  /** unit for the value stored in :model:`pkpdapp.Biomarker` */
  stored_unit?: number;
  /** dataset containing this biomarker measurement */
  dataset?: number;
  /** unit to use when sending or displaying biomarker values */
  display_unit?: number;
  /** unit for the time values stored in :model:`pkpdapp.Biomarker` */
  stored_time_unit?: number;
  /** unit to use when sending or displaying time values */
  display_time_unit?: number;
};
export type PatchedBiomarkerTypeRead = {
  id?: number;
  data?: {
    [key: string]: any[];
  } | null;
  is_continuous?: boolean;
  is_categorical?: boolean;
  /** name of the biomarker type */
  name?: string;
  /** short description of the biomarker type */
  description?: string | null;
  /** True if this biomarker type will be displayed in the frontend, False otherwise */
  display?: boolean;
  /** Color index associated with this biomarker type. For plotting purposes in the frontend */
  color?: number;
  /** True/False if biomarker type displayed on LHS/RHS axis */
  axis?: boolean;
  /** qname of the mapped model variable */
  mapped_qname?: string;
  /** unit for the value stored in :model:`pkpdapp.Biomarker` */
  stored_unit?: number;
  /** dataset containing this biomarker measurement */
  dataset?: number;
  /** unit to use when sending or displaying biomarker values */
  display_unit?: number;
  /** unit for the time values stored in :model:`pkpdapp.Biomarker` */
  stored_time_unit?: number;
  /** unit to use when sending or displaying time values */
  display_time_unit?: number;
};
export type PkpdMapping = {
  /** PKPD model that this mapping is for */
  pkpd_model: number;
  /** variable in PK part of model */
  pk_variable: number;
  /** variable in PD part of model */
  pd_variable: number;
};
export type PkpdMappingRead = {
  id: number;
  datetime: string;
  read_only: boolean;
  /** PKPD model that this mapping is for */
  pkpd_model: number;
  /** variable in PK part of model */
  pk_variable: number;
  /** variable in PD part of model */
  pd_variable: number;
};
export type TypeEnum = "RO" | "FUP" | "BPR" | "TLG";
export type DerivedVariable = {
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** type of derived variable
    
    * `RO` - receptor occupancy
    * `FUP` - faction unbound plasma
    * `BPR` - blood plasma ratio
    * `TLG` - dosing lag time */
  type: TypeEnum;
  /** PKPD model that this derived variable is for */
  pkpd_model: number;
  /** base variable in PK part of model */
  pk_variable: number;
};
export type DerivedVariableRead = {
  id: number;
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** type of derived variable
    
    * `RO` - receptor occupancy
    * `FUP` - faction unbound plasma
    * `BPR` - blood plasma ratio
    * `TLG` - dosing lag time */
  type: TypeEnum;
  /** PKPD model that this derived variable is for */
  pkpd_model: number;
  /** base variable in PK part of model */
  pk_variable: number;
};
export type CombinedModelSpeciesEnum = "H" | "R" | "N" | "M";
export type CombinedModel = {
  mappings: PkpdMapping[];
  derived_variables: DerivedVariable[];
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the model */
  name: string;
  /** species
    
    * `H` - human
    * `R` - rat
    * `N` - non-human primate
    * `M` - mouse */
  species?: CombinedModelSpeciesEnum;
  /** whether the pk model has saturation */
  has_saturation?: boolean;
  /** whether the pk model has effect compartment */
  has_effect?: boolean;
  /** whether the pk model has lag */
  has_lag?: boolean;
  /** whether the pk model has bioavailability */
  has_bioavailability?: boolean;
  /** whether the pd model has hill coefficient */
  has_hill_coefficient?: boolean;
  /** suggested time to simulate after the last dose (in the time units specified by the mmt model) */
  time_max?: number;
  /** Project that "owns" this model */
  project?: number | null;
  /** model */
  pk_model?: number | null;
  /** PD part of model */
  pd_model?: number | null;
  /** second PD part of model */
  pd_model2?: number | null;
};
export type CombinedModelRead = {
  id: number;
  mappings: PkpdMappingRead[];
  derived_variables: DerivedVariableRead[];
  components: string;
  variables: number[];
  mmt: string;
  time_unit: number;
  is_library_model: boolean;
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the model */
  name: string;
  /** species
    
    * `H` - human
    * `R` - rat
    * `N` - non-human primate
    * `M` - mouse */
  species?: CombinedModelSpeciesEnum;
  /** whether the pk model has saturation */
  has_saturation?: boolean;
  /** whether the pk model has effect compartment */
  has_effect?: boolean;
  /** whether the pk model has lag */
  has_lag?: boolean;
  /** whether the pk model has bioavailability */
  has_bioavailability?: boolean;
  /** whether the pd model has hill coefficient */
  has_hill_coefficient?: boolean;
  /** suggested time to simulate after the last dose (in the time units specified by the mmt model) */
  time_max?: number;
  /** Project that "owns" this model */
  project?: number | null;
  /** model */
  pk_model?: number | null;
  /** PD part of model */
  pd_model?: number | null;
  /** second PD part of model */
  pd_model2?: number | null;
};
export type PatchedCombinedModel = {
  mappings?: PkpdMapping[];
  derived_variables?: DerivedVariable[];
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the model */
  name?: string;
  /** species
    
    * `H` - human
    * `R` - rat
    * `N` - non-human primate
    * `M` - mouse */
  species?: CombinedModelSpeciesEnum;
  /** whether the pk model has saturation */
  has_saturation?: boolean;
  /** whether the pk model has effect compartment */
  has_effect?: boolean;
  /** whether the pk model has lag */
  has_lag?: boolean;
  /** whether the pk model has bioavailability */
  has_bioavailability?: boolean;
  /** whether the pd model has hill coefficient */
  has_hill_coefficient?: boolean;
  /** suggested time to simulate after the last dose (in the time units specified by the mmt model) */
  time_max?: number;
  /** Project that "owns" this model */
  project?: number | null;
  /** model */
  pk_model?: number | null;
  /** PD part of model */
  pd_model?: number | null;
  /** second PD part of model */
  pd_model2?: number | null;
};
export type PatchedCombinedModelRead = {
  id?: number;
  mappings?: PkpdMappingRead[];
  derived_variables?: DerivedVariableRead[];
  components?: string;
  variables?: number[];
  mmt?: string;
  time_unit?: number;
  is_library_model?: boolean;
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the model */
  name?: string;
  /** species
    
    * `H` - human
    * `R` - rat
    * `N` - non-human primate
    * `M` - mouse */
  species?: CombinedModelSpeciesEnum;
  /** whether the pk model has saturation */
  has_saturation?: boolean;
  /** whether the pk model has effect compartment */
  has_effect?: boolean;
  /** whether the pk model has lag */
  has_lag?: boolean;
  /** whether the pk model has bioavailability */
  has_bioavailability?: boolean;
  /** whether the pd model has hill coefficient */
  has_hill_coefficient?: boolean;
  /** suggested time to simulate after the last dose (in the time units specified by the mmt model) */
  time_max?: number;
  /** Project that "owns" this model */
  project?: number | null;
  /** model */
  pk_model?: number | null;
  /** PD part of model */
  pd_model?: number | null;
  /** second PD part of model */
  pd_model2?: number | null;
};
export type SimulateResponse = {
  time: number[];
  outputs: {
    [key: string]: number[];
  };
};
export type ErrorResponse = {
  error: string;
};
export type Simulate = {
  outputs: string[];
  variables: {
    [key: string]: number;
  };
  time_max?: number;
};
export type Efficacy = {
  /** name of the experiment */
  name?: string;
  /** half maximal effective concentration */
  c50: number;
  /** Hill coefficient measure of binding */
  hill_coefficient?: number;
  /** unit for c50 */
  c50_unit: number;
  /** compound for efficacy experiment */
  compound: number;
};
export type EfficacyRead = {
  id: number;
  /** name of the experiment */
  name?: string;
  /** half maximal effective concentration */
  c50: number;
  /** Hill coefficient measure of binding */
  hill_coefficient?: number;
  /** unit for c50 */
  c50_unit: number;
  /** compound for efficacy experiment */
  compound: number;
};
export type CompoundTypeEnum = "SM" | "LM";
export type IntrinsicClearanceAssayEnum = "MS" | "HC";
export type Compound = {
  efficacy_experiments: Efficacy[];
  /** name of the compound */
  name: string;
  /** short description of the compound */
  description?: string;
  /** molecular mass for compound for conversion from mol to grams */
  molecular_mass?: number;
  compound_type?: CompoundTypeEnum;
  /** fraction unbound plasma (unitless) */
  fraction_unbound_plasma?: number | null;
  /** blood to plasma ratio (unitless) */
  blood_to_plasma_ratio?: number | null;
  /** intrinsic clearance */
  intrinsic_clearance?: number | null;
  intrinsic_clearance_assay?: IntrinsicClearanceAssayEnum;
  /** fraction unbound in plasma and red blood cells (unitless) */
  fraction_unbound_including_cells?: number | null;
  /** molecular mass for target for conversion from mol to grams */
  target_molecular_mass?: number;
  /** target concentration */
  target_concentration?: number | null;
  /** dissociation constant */
  dissociation_constant?: number | null;
  /** is the compound target soluble */
  is_soluble?: boolean;
  use_efficacy?: number | null;
  /** unit for molecular mass (e.g. g/mol) */
  molecular_mass_unit?: number;
  /** unit for intrinsic clearance */
  intrinsic_clearance_unit?: number;
  /** unit for target molecular mass (e.g. g/mol) */
  target_molecular_mass_unit?: number;
  /** unit for target concentration */
  target_concentration_unit?: number;
  /** unit for dissociation constant */
  dissociation_unit?: number;
};
export type CompoundRead = {
  id: number;
  efficacy_experiments: EfficacyRead[];
  /** name of the compound */
  name: string;
  /** short description of the compound */
  description?: string;
  /** molecular mass for compound for conversion from mol to grams */
  molecular_mass?: number;
  compound_type?: CompoundTypeEnum;
  /** fraction unbound plasma (unitless) */
  fraction_unbound_plasma?: number | null;
  /** blood to plasma ratio (unitless) */
  blood_to_plasma_ratio?: number | null;
  /** intrinsic clearance */
  intrinsic_clearance?: number | null;
  intrinsic_clearance_assay?: IntrinsicClearanceAssayEnum;
  /** fraction unbound in plasma and red blood cells (unitless) */
  fraction_unbound_including_cells?: number | null;
  /** molecular mass for target for conversion from mol to grams */
  target_molecular_mass?: number;
  /** target concentration */
  target_concentration?: number | null;
  /** dissociation constant */
  dissociation_constant?: number | null;
  /** is the compound target soluble */
  is_soluble?: boolean;
  use_efficacy?: number | null;
  /** unit for molecular mass (e.g. g/mol) */
  molecular_mass_unit?: number;
  /** unit for intrinsic clearance */
  intrinsic_clearance_unit?: number;
  /** unit for target molecular mass (e.g. g/mol) */
  target_molecular_mass_unit?: number;
  /** unit for target concentration */
  target_concentration_unit?: number;
  /** unit for dissociation constant */
  dissociation_unit?: number;
};
export type PatchedCompound = {
  efficacy_experiments?: Efficacy[];
  /** name of the compound */
  name?: string;
  /** short description of the compound */
  description?: string;
  /** molecular mass for compound for conversion from mol to grams */
  molecular_mass?: number;
  compound_type?: CompoundTypeEnum;
  /** fraction unbound plasma (unitless) */
  fraction_unbound_plasma?: number | null;
  /** blood to plasma ratio (unitless) */
  blood_to_plasma_ratio?: number | null;
  /** intrinsic clearance */
  intrinsic_clearance?: number | null;
  intrinsic_clearance_assay?: IntrinsicClearanceAssayEnum;
  /** fraction unbound in plasma and red blood cells (unitless) */
  fraction_unbound_including_cells?: number | null;
  /** molecular mass for target for conversion from mol to grams */
  target_molecular_mass?: number;
  /** target concentration */
  target_concentration?: number | null;
  /** dissociation constant */
  dissociation_constant?: number | null;
  /** is the compound target soluble */
  is_soluble?: boolean;
  use_efficacy?: number | null;
  /** unit for molecular mass (e.g. g/mol) */
  molecular_mass_unit?: number;
  /** unit for intrinsic clearance */
  intrinsic_clearance_unit?: number;
  /** unit for target molecular mass (e.g. g/mol) */
  target_molecular_mass_unit?: number;
  /** unit for target concentration */
  target_concentration_unit?: number;
  /** unit for dissociation constant */
  dissociation_unit?: number;
};
export type PatchedCompoundRead = {
  id?: number;
  efficacy_experiments?: EfficacyRead[];
  /** name of the compound */
  name?: string;
  /** short description of the compound */
  description?: string;
  /** molecular mass for compound for conversion from mol to grams */
  molecular_mass?: number;
  compound_type?: CompoundTypeEnum;
  /** fraction unbound plasma (unitless) */
  fraction_unbound_plasma?: number | null;
  /** blood to plasma ratio (unitless) */
  blood_to_plasma_ratio?: number | null;
  /** intrinsic clearance */
  intrinsic_clearance?: number | null;
  intrinsic_clearance_assay?: IntrinsicClearanceAssayEnum;
  /** fraction unbound in plasma and red blood cells (unitless) */
  fraction_unbound_including_cells?: number | null;
  /** molecular mass for target for conversion from mol to grams */
  target_molecular_mass?: number;
  /** target concentration */
  target_concentration?: number | null;
  /** dissociation constant */
  dissociation_constant?: number | null;
  /** is the compound target soluble */
  is_soluble?: boolean;
  use_efficacy?: number | null;
  /** unit for molecular mass (e.g. g/mol) */
  molecular_mass_unit?: number;
  /** unit for intrinsic clearance */
  intrinsic_clearance_unit?: number;
  /** unit for target molecular mass (e.g. g/mol) */
  target_molecular_mass_unit?: number;
  /** unit for target concentration */
  target_concentration_unit?: number;
  /** unit for dissociation constant */
  dissociation_unit?: number;
};
export type Dataset = {
  /** name of the dataset */
  name: string;
  /** date/time the experiment was conducted. All time measurements are relative to this date/time, which is in YYYY-MM-DD HH:MM:SS format. For example, 2020-07-18 14:30:59 */
  datetime?: string | null;
  /** short description of the dataset */
  description?: string;
  /** Project that "owns" this model */
  project?: number | null;
};
export type Dose = {
  /** starting time point of dose, see protocol for units */
  start_time: number;
  /** amount of compound administered over the duration, see protocol for units. Rate of administration is assumed constant */
  amount: number;
  /** Duration of dose administration, see protocol for units. Duration must be greater than 0. */
  duration?: number;
  /** Number of times to repeat the dose.  */
  repeats?: number;
  /** Interval between repeated doses. See protocol for units.  */
  repeat_interval?: number;
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
};
export type DoseRead = {
  id: number;
  /** starting time point of dose, see protocol for units */
  start_time: number;
  /** amount of compound administered over the duration, see protocol for units. Rate of administration is assumed constant */
  amount: number;
  /** Duration of dose administration, see protocol for units. Duration must be greater than 0. */
  duration?: number;
  /** Number of times to repeat the dose.  */
  repeats?: number;
  /** Interval between repeated doses. See protocol for units.  */
  repeat_interval?: number;
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
};
export type DoseTypeEnum = "D" | "I";
export type Protocol = {
  doses: Dose[];
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the protocol */
  name: string;
  dose_type?: DoseTypeEnum;
  /** qname of the mapped dosing compartment for each dose */
  mapped_qname?: string | null;
  /** Dataset that uses this protocol. */
  dataset?: number | null;
  /** Project that "owns" this protocol. */
  project?: number | null;
  /** drug compound */
  compound?: number | null;
  /** unit for the start_time and duration values stored in each dose */
  time_unit?: number | null;
  /** unit for the amount value stored in each dose */
  amount_unit?: number | null;
  /** Group that uses this protocol */
  group?: number | null;
};
export type ProtocolRead = {
  id: number;
  doses: DoseRead[];
  variables: number[];
  subjects: number[];
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the protocol */
  name: string;
  dose_type?: DoseTypeEnum;
  /** qname of the mapped dosing compartment for each dose */
  mapped_qname?: string | null;
  /** Dataset that uses this protocol. */
  dataset?: number | null;
  /** Project that "owns" this protocol. */
  project?: number | null;
  /** drug compound */
  compound?: number | null;
  /** unit for the start_time and duration values stored in each dose */
  time_unit?: number | null;
  /** unit for the amount value stored in each dose */
  amount_unit?: number | null;
  /** Group that uses this protocol */
  group?: number | null;
};
export type SubjectGroup = {
  protocols: Protocol[];
  /** name of the group */
  name: string;
  /** unique identifier in the dataset */
  id_in_dataset?: string | null;
  /** Dataset that this group belongs to. */
  dataset?: number | null;
  /** Project that this group belongs to. */
  project?: number | null;
};
export type SubjectGroupRead = {
  id: number;
  subjects: number[];
  protocols: ProtocolRead[];
  /** name of the group */
  name: string;
  /** unique identifier in the dataset */
  id_in_dataset?: string | null;
  /** Dataset that this group belongs to. */
  dataset?: number | null;
  /** Project that this group belongs to. */
  project?: number | null;
};
export type DatasetRead = {
  id: number;
  biomarker_types: BiomarkerTypeRead[];
  subjects: number[];
  groups: SubjectGroupRead[];
  protocols: ProtocolRead[];
  /** name of the dataset */
  name: string;
  /** date/time the experiment was conducted. All time measurements are relative to this date/time, which is in YYYY-MM-DD HH:MM:SS format. For example, 2020-07-18 14:30:59 */
  datetime?: string | null;
  /** short description of the dataset */
  description?: string;
  /** Project that "owns" this model */
  project?: number | null;
};
export type PatchedDataset = {
  /** name of the dataset */
  name?: string;
  /** date/time the experiment was conducted. All time measurements are relative to this date/time, which is in YYYY-MM-DD HH:MM:SS format. For example, 2020-07-18 14:30:59 */
  datetime?: string | null;
  /** short description of the dataset */
  description?: string;
  /** Project that "owns" this model */
  project?: number | null;
};
export type PatchedDatasetRead = {
  id?: number;
  biomarker_types?: BiomarkerTypeRead[];
  subjects?: number[];
  groups?: SubjectGroupRead[];
  protocols?: ProtocolRead[];
  /** name of the dataset */
  name?: string;
  /** date/time the experiment was conducted. All time measurements are relative to this date/time, which is in YYYY-MM-DD HH:MM:SS format. For example, 2020-07-18 14:30:59 */
  datetime?: string | null;
  /** short description of the dataset */
  description?: string;
  /** Project that "owns" this model */
  project?: number | null;
};
export type DatasetCsv = {
  name: string;
  csv: string;
};
export type PatchedDose = {
  /** starting time point of dose, see protocol for units */
  start_time?: number;
  /** amount of compound administered over the duration, see protocol for units. Rate of administration is assumed constant */
  amount?: number;
  /** Duration of dose administration, see protocol for units. Duration must be greater than 0. */
  duration?: number;
  /** Number of times to repeat the dose.  */
  repeats?: number;
  /** Interval between repeated doses. See protocol for units.  */
  repeat_interval?: number;
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
};
export type PatchedDoseRead = {
  id?: number;
  /** starting time point of dose, see protocol for units */
  start_time?: number;
  /** amount of compound administered over the duration, see protocol for units. Rate of administration is assumed constant */
  amount?: number;
  /** Duration of dose administration, see protocol for units. Duration must be greater than 0. */
  duration?: number;
  /** Number of times to repeat the dose.  */
  repeats?: number;
  /** Interval between repeated doses. See protocol for units.  */
  repeat_interval?: number;
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
};
export type LogLikelihoodParameter = {
  /** name of log_likelihood parameter. */
  name: string;
  /** parameter index for distribution and equation parameters. blank for models (variable is used instead) */
  parent_index?: number | null;
  /** output index for all log_likelihoods.  */
  child_index?: number;
  /** length of array representing parameter. null for scalar */
  length?: number | null;
  child: number;
  /** input model variable for this parameter. */
  variable?: number | null;
};
export type LogLikelihoodParameterRead = {
  id: number;
  /** name of log_likelihood parameter. */
  name: string;
  /** parameter index for distribution and equation parameters. blank for models (variable is used instead) */
  parent_index?: number | null;
  /** output index for all log_likelihoods.  */
  child_index?: number;
  /** length of array representing parameter. null for scalar */
  length?: number | null;
  parent: number;
  child: number;
  /** input model variable for this parameter. */
  variable?: number | null;
};
export type FormEnum = "N" | "U" | "LN" | "F" | "S" | "E" | "M";
export type LogLikelihood = {
  parameters: LogLikelihoodParameter[];
  /** name of log_likelihood. */
  name: string;
  /** description of log_likelihood. For equations will be the code of that equation using Python syntax: arg1 * arg2^arg3 */
  description?: string | null;
  /** set if a fixed value is required */
  value?: number | null;
  /** True if biomarker_type refers to time-independent data. If there are multiple timepoints in biomarker_type then only the first is taken  */
  time_independent_data?: boolean;
  /** True if this log_likelihood is observed  */
  observed?: boolean;
  form?: FormEnum;
  /** If form=MODEL, a variable (any) in the deterministic model.  */
  variable?: number | null;
  /** data associated with this log_likelihood. This is used for measurement data (observed=True) or for covariates (observed=False). The random variable associated with this log_likelihood has the same shape as this data. For covariates the subject ids in the data correspond to the values of the random variable at that location. */
  biomarker_type?: number | null;
  /** filter subject data on this protocol(null implies all subjects) */
  protocol_filter?: number | null;
};
export type LogLikelihoodRead = {
  id: number;
  parameters: LogLikelihoodParameterRead[];
  model: string[] | null;
  dataset: number | null;
  time_variable: number | null;
  is_a_prior: boolean;
  /** name of log_likelihood. */
  name: string;
  /** description of log_likelihood. For equations will be the code of that equation using Python syntax: arg1 * arg2^arg3 */
  description?: string | null;
  /** set if a fixed value is required */
  value?: number | null;
  /** True if biomarker_type refers to time-independent data. If there are multiple timepoints in biomarker_type then only the first is taken  */
  time_independent_data?: boolean;
  /** True if this log_likelihood is observed  */
  observed?: boolean;
  form?: FormEnum;
  /** Log_likelihood belongs to this inference object.  */
  inference: number;
  /** If form=MODEL, a variable (any) in the deterministic model.  */
  variable?: number | null;
  /** data associated with this log_likelihood. This is used for measurement data (observed=True) or for covariates (observed=False). The random variable associated with this log_likelihood has the same shape as this data. For covariates the subject ids in the data correspond to the values of the random variable at that location. */
  biomarker_type?: number | null;
  /** filter subject data on this protocol(null implies all subjects) */
  protocol_filter?: number | null;
  children: number[];
};
export type InitializationStrategyEnum = "D" | "R" | "F";
export type Inference = {
  log_likelihoods: LogLikelihood[];
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the dataset */
  name: string;
  /** short description of what this inference does */
  description?: string;
  initialization_strategy?: InitializationStrategyEnum;
  /** number of chains */
  number_of_chains?: number;
  /** maximum number of iterations */
  max_number_of_iterations?: number;
  /** final iteration of burn-in */
  burn_in?: number;
  /** number of iterations calculated */
  number_of_iterations?: number;
  /** Elapsed run time for inference in seconds */
  time_elapsed?: number;
  /** number of function evaluations */
  number_of_function_evals?: number;
  /** If executing, this is the celery task id */
  task_id?: string | null;
  /** metadata for inference */
  metadata?: any;
  /** Project that "owns" this inference object */
  project: number;
  /** algorithm used to perform the inference */
  algorithm?: number;
  initialization_inference?: number | null;
};
export type InferenceRead = {
  id: number;
  log_likelihoods: LogLikelihoodRead[];
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the dataset */
  name: string;
  /** short description of what this inference does */
  description?: string;
  initialization_strategy?: InitializationStrategyEnum;
  /** number of chains */
  number_of_chains?: number;
  /** maximum number of iterations */
  max_number_of_iterations?: number;
  /** final iteration of burn-in */
  burn_in?: number;
  /** number of iterations calculated */
  number_of_iterations?: number;
  /** Elapsed run time for inference in seconds */
  time_elapsed?: number;
  /** number of function evaluations */
  number_of_function_evals?: number;
  /** If executing, this is the celery task id */
  task_id?: string | null;
  /** metadata for inference */
  metadata?: any;
  /** Project that "owns" this inference object */
  project: number;
  /** algorithm used to perform the inference */
  algorithm?: number;
  initialization_inference?: number | null;
};
export type PatchedInference = {
  log_likelihoods?: LogLikelihood[];
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the dataset */
  name?: string;
  /** short description of what this inference does */
  description?: string;
  initialization_strategy?: InitializationStrategyEnum;
  /** number of chains */
  number_of_chains?: number;
  /** maximum number of iterations */
  max_number_of_iterations?: number;
  /** final iteration of burn-in */
  burn_in?: number;
  /** number of iterations calculated */
  number_of_iterations?: number;
  /** Elapsed run time for inference in seconds */
  time_elapsed?: number;
  /** number of function evaluations */
  number_of_function_evals?: number;
  /** If executing, this is the celery task id */
  task_id?: string | null;
  /** metadata for inference */
  metadata?: any;
  /** Project that "owns" this inference object */
  project?: number;
  /** algorithm used to perform the inference */
  algorithm?: number;
  initialization_inference?: number | null;
};
export type PatchedInferenceRead = {
  id?: number;
  log_likelihoods?: LogLikelihoodRead[];
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the dataset */
  name?: string;
  /** short description of what this inference does */
  description?: string;
  initialization_strategy?: InitializationStrategyEnum;
  /** number of chains */
  number_of_chains?: number;
  /** maximum number of iterations */
  max_number_of_iterations?: number;
  /** final iteration of burn-in */
  burn_in?: number;
  /** number of iterations calculated */
  number_of_iterations?: number;
  /** Elapsed run time for inference in seconds */
  time_elapsed?: number;
  /** number of function evaluations */
  number_of_function_evals?: number;
  /** If executing, this is the celery task id */
  task_id?: string | null;
  /** metadata for inference */
  metadata?: any;
  /** Project that "owns" this inference object */
  project?: number;
  /** algorithm used to perform the inference */
  algorithm?: number;
  initialization_inference?: number | null;
};
export type InferenceChain = {
  /** inference for this chain */
  inference: number;
};
export type InferenceChainRead = {
  id: number;
  data: string;
  outputs: string;
  /** inference for this chain */
  inference: number;
};
export type PatchedInferenceChain = {
  /** inference for this chain */
  inference?: number;
};
export type PatchedInferenceChainRead = {
  id?: number;
  data?: string;
  outputs?: string;
  /** inference for this chain */
  inference?: number;
};
export type Pharmacodynamic = {
  mmt?: string;
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the model */
  name: string;
  /** short description of the model */
  description?: string;
  /** suggested maximum time to simulate for this model (in the time units specified by the mmt model) */
  time_max?: number;
  /** whether this model is a library model (i.e. it is not an uploaded user model) */
  is_library_model?: boolean;
  /** Project that "owns" this model */
  project?: number | null;
};
export type PharmacodynamicRead = {
  id: number;
  components: string;
  variables: number[];
  mmt?: string;
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the model */
  name: string;
  /** short description of the model */
  description?: string;
  /** suggested maximum time to simulate for this model (in the time units specified by the mmt model) */
  time_max?: number;
  /** whether this model is a library model (i.e. it is not an uploaded user model) */
  is_library_model?: boolean;
  /** Project that "owns" this model */
  project?: number | null;
};
export type PatchedPharmacodynamic = {
  mmt?: string;
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the model */
  name?: string;
  /** short description of the model */
  description?: string;
  /** suggested maximum time to simulate for this model (in the time units specified by the mmt model) */
  time_max?: number;
  /** whether this model is a library model (i.e. it is not an uploaded user model) */
  is_library_model?: boolean;
  /** Project that "owns" this model */
  project?: number | null;
};
export type PatchedPharmacodynamicRead = {
  id?: number;
  components?: string;
  variables?: number[];
  mmt?: string;
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the model */
  name?: string;
  /** short description of the model */
  description?: string;
  /** suggested maximum time to simulate for this model (in the time units specified by the mmt model) */
  time_max?: number;
  /** whether this model is a library model (i.e. it is not an uploaded user model) */
  is_library_model?: boolean;
  /** Project that "owns" this model */
  project?: number | null;
};
export type PharmacodynamicSbml = {};
export type PharmacodynamicSbmlWrite = {
  sbml: string;
};
export type Pharmacokinetic = {
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the model */
  name: string;
  /** short description of the model */
  description?: string;
  /** the model represented using mmt (see https://myokit.readthedocs) */
  mmt?: string;
  /** suggested maximum time to simulate for this model (in the time units specified by the mmt model) */
  time_max?: number;
  /** whether this model is a library model (i.e. it is not an uploaded user model) */
  is_library_model?: boolean;
};
export type PharmacokineticRead = {
  id: number;
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the model */
  name: string;
  /** short description of the model */
  description?: string;
  /** the model represented using mmt (see https://myokit.readthedocs) */
  mmt?: string;
  /** suggested maximum time to simulate for this model (in the time units specified by the mmt model) */
  time_max?: number;
  /** whether this model is a library model (i.e. it is not an uploaded user model) */
  is_library_model?: boolean;
};
export type PatchedPharmacokinetic = {
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the model */
  name?: string;
  /** short description of the model */
  description?: string;
  /** the model represented using mmt (see https://myokit.readthedocs) */
  mmt?: string;
  /** suggested maximum time to simulate for this model (in the time units specified by the mmt model) */
  time_max?: number;
  /** whether this model is a library model (i.e. it is not an uploaded user model) */
  is_library_model?: boolean;
};
export type PatchedPharmacokineticRead = {
  id?: number;
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the model */
  name?: string;
  /** short description of the model */
  description?: string;
  /** the model represented using mmt (see https://myokit.readthedocs) */
  mmt?: string;
  /** suggested maximum time to simulate for this model (in the time units specified by the mmt model) */
  time_max?: number;
  /** whether this model is a library model (i.e. it is not an uploaded user model) */
  is_library_model?: boolean;
};
export type ProjectAccess = {
  /** True if user has read access only */
  read_only?: boolean;
  user: number;
};
export type ProjectAccessRead = {
  id: number;
  /** True if user has read access only */
  read_only?: boolean;
  user: number;
  project: number;
};
export type ProjectSpeciesEnum = "M" | "R" | "H" | "K" | "O";
export type Project = {
  user_access: ProjectAccess[];
  /** name of the project */
  name: string;
  /** short description of the project */
  description?: string;
  /** subject species
    
    * `M` - Mouse
    * `R` - Rat
    * `H` - Human
    * `K` - Monkey
    * `O` - Other */
  species?: ProjectSpeciesEnum;
  compound: number;
};
export type ProjectRead = {
  id: number;
  user_access: ProjectAccessRead[];
  datasets: number[];
  protocols: number[];
  /** name of the project */
  name: string;
  /** short description of the project */
  description?: string;
  created: string;
  /** subject species
    
    * `M` - Mouse
    * `R` - Rat
    * `H` - Human
    * `K` - Monkey
    * `O` - Other */
  species?: ProjectSpeciesEnum;
  compound: number;
  /** users with access to this project */
  users: number[];
};
export type PatchedProject = {
  user_access?: ProjectAccess[];
  /** name of the project */
  name?: string;
  /** short description of the project */
  description?: string;
  /** subject species
    
    * `M` - Mouse
    * `R` - Rat
    * `H` - Human
    * `K` - Monkey
    * `O` - Other */
  species?: ProjectSpeciesEnum;
  compound?: number;
};
export type PatchedProjectRead = {
  id?: number;
  user_access?: ProjectAccessRead[];
  datasets?: number[];
  protocols?: number[];
  /** name of the project */
  name?: string;
  /** short description of the project */
  description?: string;
  created?: string;
  /** subject species
    
    * `M` - Mouse
    * `R` - Rat
    * `H` - Human
    * `K` - Monkey
    * `O` - Other */
  species?: ProjectSpeciesEnum;
  compound?: number;
  /** users with access to this project */
  users?: number[];
};
export type Monolix = {};
export type MonolixRead = {
  data: string;
  pd_model: string;
  pk_model: string;
};
export type MonolixWrite = {
  data_csv: string;
  model_txt: string;
  project_mlxtran: string;
};
export type PatchedProjectAccess = {
  /** True if user has read access only */
  read_only?: boolean;
  user?: number;
};
export type PatchedProjectAccessRead = {
  id?: number;
  /** True if user has read access only */
  read_only?: boolean;
  user?: number;
  project?: number;
};
export type PatchedProtocol = {
  doses?: Dose[];
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the protocol */
  name?: string;
  dose_type?: DoseTypeEnum;
  /** qname of the mapped dosing compartment for each dose */
  mapped_qname?: string | null;
  /** Dataset that uses this protocol. */
  dataset?: number | null;
  /** Project that "owns" this protocol. */
  project?: number | null;
  /** drug compound */
  compound?: number | null;
  /** unit for the start_time and duration values stored in each dose */
  time_unit?: number | null;
  /** unit for the amount value stored in each dose */
  amount_unit?: number | null;
  /** Group that uses this protocol */
  group?: number | null;
};
export type PatchedProtocolRead = {
  id?: number;
  doses?: DoseRead[];
  variables?: number[];
  subjects?: number[];
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  /** name of the protocol */
  name?: string;
  dose_type?: DoseTypeEnum;
  /** qname of the mapped dosing compartment for each dose */
  mapped_qname?: string | null;
  /** Dataset that uses this protocol. */
  dataset?: number | null;
  /** Project that "owns" this protocol. */
  project?: number | null;
  /** drug compound */
  compound?: number | null;
  /** unit for the start_time and duration values stored in each dose */
  time_unit?: number | null;
  /** unit for the amount value stored in each dose */
  amount_unit?: number | null;
  /** Group that uses this protocol */
  group?: number | null;
};
export type SimulationSlider = {
  variable: number;
};
export type SimulationSliderRead = {
  id: number;
  variable: number;
};
export type SimulationYAxis = {
  /** True if the variable is plotted on the right y axis */
  right?: boolean;
  variable: number;
};
export type SimulationYAxisRead = {
  id: number;
  /** True if the variable is plotted on the right y axis */
  right?: boolean;
  variable: number;
};
export type SimulationCxLine = {
  /** value of the line */
  value: number;
};
export type SimulationCxLineRead = {
  id: number;
  /** value of the line */
  value: number;
};
export type Y2ScaleEnum = "lin" | "lg2" | "lg10" | "ln";
export type SimulationPlot = {
  y_axes: SimulationYAxis[];
  cx_lines: SimulationCxLine[];
  /** index of the plot in the simulation */
  index: number;
  /** scale for x axis
    
    * `lin` - Linear
    * `lg2` - Log2
    * `lg10` - Log10
    * `ln` - Ln */
  x_scale?: Y2ScaleEnum;
  /** scale for y axis
    
    * `lin` - Linear
    * `lg2` - Log2
    * `lg10` - Log10
    * `ln` - Ln */
  y_scale?: Y2ScaleEnum;
  /** scale for rhs y axis
    
    * `lin` - Linear
    * `lg2` - Log2
    * `lg10` - Log10
    * `ln` - Ln */
  y2_scale?: Y2ScaleEnum;
  /** lower bound for the y axis */
  min?: number | null;
  /** upper bound for the y axis */
  max?: number | null;
  /** lower bound for the rhs y axis */
  min2?: number | null;
  /** upper bound for the rhs y axis */
  max2?: number | null;
  /** unit for x axis */
  x_unit: number;
  /** unit for y axis */
  y_unit?: number | null;
  /** unit for rhs y axis */
  y_unit2?: number | null;
};
export type SimulationPlotRead = {
  id: number;
  y_axes: SimulationYAxisRead[];
  cx_lines: SimulationCxLineRead[];
  /** index of the plot in the simulation */
  index: number;
  /** scale for x axis
    
    * `lin` - Linear
    * `lg2` - Log2
    * `lg10` - Log10
    * `ln` - Ln */
  x_scale?: Y2ScaleEnum;
  /** scale for y axis
    
    * `lin` - Linear
    * `lg2` - Log2
    * `lg10` - Log10
    * `ln` - Ln */
  y_scale?: Y2ScaleEnum;
  /** scale for rhs y axis
    
    * `lin` - Linear
    * `lg2` - Log2
    * `lg10` - Log10
    * `ln` - Ln */
  y2_scale?: Y2ScaleEnum;
  /** lower bound for the y axis */
  min?: number | null;
  /** upper bound for the y axis */
  max?: number | null;
  /** lower bound for the rhs y axis */
  min2?: number | null;
  /** upper bound for the rhs y axis */
  max2?: number | null;
  /** unit for x axis */
  x_unit: number;
  /** unit for y axis */
  y_unit?: number | null;
  /** unit for rhs y axis */
  y_unit2?: number | null;
};
export type Simulation = {
  sliders: SimulationSlider[];
  plots: SimulationPlot[];
  /** name of the simulation */
  name: string;
  /** number of subplot rows */
  nrows?: number;
  /** number of subplot columns */
  ncols?: number;
  /** maximum time for the simulation */
  time_max?: number;
  /** absolute tolerance for the simulation */
  abs_tolerance?: number;
  /** relative tolerance for the simulation */
  rel_tolerance?: number;
  project: number;
  /** unit for maximum time */
  time_max_unit: number;
};
export type SimulationRead = {
  id: number;
  sliders: SimulationSliderRead[];
  plots: SimulationPlotRead[];
  /** name of the simulation */
  name: string;
  /** number of subplot rows */
  nrows?: number;
  /** number of subplot columns */
  ncols?: number;
  /** maximum time for the simulation */
  time_max?: number;
  /** absolute tolerance for the simulation */
  abs_tolerance?: number;
  /** relative tolerance for the simulation */
  rel_tolerance?: number;
  project: number;
  /** unit for maximum time */
  time_max_unit: number;
};
export type PatchedSimulation = {
  sliders?: SimulationSlider[];
  plots?: SimulationPlot[];
  /** name of the simulation */
  name?: string;
  /** number of subplot rows */
  nrows?: number;
  /** number of subplot columns */
  ncols?: number;
  /** maximum time for the simulation */
  time_max?: number;
  /** absolute tolerance for the simulation */
  abs_tolerance?: number;
  /** relative tolerance for the simulation */
  rel_tolerance?: number;
  project?: number;
  /** unit for maximum time */
  time_max_unit?: number;
};
export type PatchedSimulationRead = {
  id?: number;
  sliders?: SimulationSliderRead[];
  plots?: SimulationPlotRead[];
  /** name of the simulation */
  name?: string;
  /** number of subplot rows */
  nrows?: number;
  /** number of subplot columns */
  ncols?: number;
  /** maximum time for the simulation */
  time_max?: number;
  /** absolute tolerance for the simulation */
  abs_tolerance?: number;
  /** relative tolerance for the simulation */
  rel_tolerance?: number;
  project?: number;
  /** unit for maximum time */
  time_max_unit?: number;
};
export type Subject = {
  /** unique id in the dataset */
  id_in_dataset: number;
  /** Shape index associated with this subject. For plotting purposes in the frontend */
  shape?: number;
  /** True if this subject will be displayed in the frontend, False otherwise */
  display?: boolean;
  /** subject metadata */
  metadata?: string;
  /** dataset containing this subject */
  dataset: number;
  /** dosing protocol for this subject. */
  protocol?: number | null;
  /** subject group containing this subject. */
  group?: number | null;
};
export type SubjectRead = {
  id: number;
  /** unique id in the dataset */
  id_in_dataset: number;
  /** Shape index associated with this subject. For plotting purposes in the frontend */
  shape?: number;
  /** True if this subject will be displayed in the frontend, False otherwise */
  display?: boolean;
  /** subject metadata */
  metadata?: string;
  /** dataset containing this subject */
  dataset: number;
  /** dosing protocol for this subject. */
  protocol?: number | null;
  /** subject group containing this subject. */
  group?: number | null;
};
export type PatchedSubject = {
  /** unique id in the dataset */
  id_in_dataset?: number;
  /** Shape index associated with this subject. For plotting purposes in the frontend */
  shape?: number;
  /** True if this subject will be displayed in the frontend, False otherwise */
  display?: boolean;
  /** subject metadata */
  metadata?: string;
  /** dataset containing this subject */
  dataset?: number;
  /** dosing protocol for this subject. */
  protocol?: number | null;
  /** subject group containing this subject. */
  group?: number | null;
};
export type PatchedSubjectRead = {
  id?: number;
  /** unique id in the dataset */
  id_in_dataset?: number;
  /** Shape index associated with this subject. For plotting purposes in the frontend */
  shape?: number;
  /** True if this subject will be displayed in the frontend, False otherwise */
  display?: boolean;
  /** subject metadata */
  metadata?: string;
  /** dataset containing this subject */
  dataset?: number;
  /** dosing protocol for this subject. */
  protocol?: number | null;
  /** subject group containing this subject. */
  group?: number | null;
};
export type PatchedSubjectGroup = {
  protocols?: Protocol[];
  /** name of the group */
  name?: string;
  /** unique identifier in the dataset */
  id_in_dataset?: string | null;
  /** Dataset that this group belongs to. */
  dataset?: number | null;
  /** Project that this group belongs to. */
  project?: number | null;
};
export type PatchedSubjectGroupRead = {
  id?: number;
  subjects?: number[];
  protocols?: ProtocolRead[];
  /** name of the group */
  name?: string;
  /** unique identifier in the dataset */
  id_in_dataset?: string | null;
  /** Dataset that this group belongs to. */
  dataset?: number | null;
  /** Project that this group belongs to. */
  project?: number | null;
};
export type Unit = {
  /** symbol for unit display */
  symbol: string;
  /** grams exponent */
  g?: number;
  /** meters exponent */
  m?: number;
  /** seconds exponent */
  s?: number;
  /** ampere exponent */
  A?: number;
  /** kelvin exponent */
  K?: number;
  /** candela exponent */
  cd?: number;
  /** mole exponent */
  mol?: number;
  /** multiplier in powers of 10 */
  multiplier?: number;
};
export type UnitRead = {
  id: number;
  compatible_units: {
    [key: string]: string;
  }[];
  /** symbol for unit display */
  symbol: string;
  /** grams exponent */
  g?: number;
  /** meters exponent */
  m?: number;
  /** seconds exponent */
  s?: number;
  /** ampere exponent */
  A?: number;
  /** kelvin exponent */
  K?: number;
  /** candela exponent */
  cd?: number;
  /** mole exponent */
  mol?: number;
  /** multiplier in powers of 10 */
  multiplier?: number;
};
export type PatchedUnit = {
  /** symbol for unit display */
  symbol?: string;
  /** grams exponent */
  g?: number;
  /** meters exponent */
  m?: number;
  /** seconds exponent */
  s?: number;
  /** ampere exponent */
  A?: number;
  /** kelvin exponent */
  K?: number;
  /** candela exponent */
  cd?: number;
  /** mole exponent */
  mol?: number;
  /** multiplier in powers of 10 */
  multiplier?: number;
};
export type PatchedUnitRead = {
  id?: number;
  compatible_units?: {
    [key: string]: string;
  }[];
  /** symbol for unit display */
  symbol?: string;
  /** grams exponent */
  g?: number;
  /** meters exponent */
  m?: number;
  /** seconds exponent */
  s?: number;
  /** ampere exponent */
  A?: number;
  /** kelvin exponent */
  K?: number;
  /** candela exponent */
  cd?: number;
  /** mole exponent */
  mol?: number;
  /** multiplier in powers of 10 */
  multiplier?: number;
};
export type User = {
  /** Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};
export type Profile = {
  user: number;
};
export type ProfileRead = {
  id: number;
  user: number;
};
export type UserRead = {
  id: number;
  /** Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  profile: ProfileRead;
  project_set: number[];
};
export type PatchedUser = {
  /** Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};
export type PatchedUserRead = {
  id?: number;
  /** Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  profile?: ProfileRead;
  project_set?: number[];
};
export type Variable = {
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  is_public?: boolean;
  /** lowest possible value for this variable */
  lower_bound?: number | null;
  /** largest possible value for this variable */
  upper_bound?: number | null;
  /** default value for this variable */
  default_value?: number;
  /** True if default_value is stored as the log of this value */
  is_log?: boolean;
  /** name of the variable */
  name: string;
  /** description of the variable */
  description?: string | null;
  /** myokit binding of the variable (e.g. time) */
  binding?: string | null;
  /** fully qualitifed name of the variable */
  qname: string;
  /** if unit is None then this is the unit of this variable as a string */
  unit_symbol?: string | null;
  /** True for a constant variable of the model, i.e. a parameter. False if non-constant, i.e. an output of the model (default is True) */
  constant?: boolean;
  /** True if it is a state variable of the model and has an initial condition parameter (default is False) */
  state?: boolean;
  /** Color index associated with this variable. For display purposes in the frontend */
  color?: number;
  /** True if this variable will be displayed in the frontend, False otherwise */
  display?: boolean;
  /** False/True if biomarker type displayed on LHS/RHS axis */
  axis?: boolean;
  /** variable values are in this unit (note this might be different from the unit in the stored sbml) */
  unit?: number | null;
  /** pharmacodynamic model */
  pd_model?: number | null;
  /** pharmacokinetic model */
  pk_model?: number | null;
  /** dosed pharmacokinetic model */
  dosed_pk_model?: number | null;
  /** dosing protocol */
  protocol?: number | null;
};
export type VariableRead = {
  id: number;
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  is_public?: boolean;
  /** lowest possible value for this variable */
  lower_bound?: number | null;
  /** largest possible value for this variable */
  upper_bound?: number | null;
  /** default value for this variable */
  default_value?: number;
  /** True if default_value is stored as the log of this value */
  is_log?: boolean;
  /** name of the variable */
  name: string;
  /** description of the variable */
  description?: string | null;
  /** myokit binding of the variable (e.g. time) */
  binding?: string | null;
  /** fully qualitifed name of the variable */
  qname: string;
  /** if unit is None then this is the unit of this variable as a string */
  unit_symbol?: string | null;
  /** True for a constant variable of the model, i.e. a parameter. False if non-constant, i.e. an output of the model (default is True) */
  constant?: boolean;
  /** True if it is a state variable of the model and has an initial condition parameter (default is False) */
  state?: boolean;
  /** Color index associated with this variable. For display purposes in the frontend */
  color?: number;
  /** True if this variable will be displayed in the frontend, False otherwise */
  display?: boolean;
  /** False/True if biomarker type displayed on LHS/RHS axis */
  axis?: boolean;
  /** variable values are in this unit (note this might be different from the unit in the stored sbml) */
  unit?: number | null;
  /** pharmacodynamic model */
  pd_model?: number | null;
  /** pharmacokinetic model */
  pk_model?: number | null;
  /** dosed pharmacokinetic model */
  dosed_pk_model?: number | null;
  /** dosing protocol */
  protocol?: number | null;
};
export type PatchedVariable = {
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  is_public?: boolean;
  /** lowest possible value for this variable */
  lower_bound?: number | null;
  /** largest possible value for this variable */
  upper_bound?: number | null;
  /** default value for this variable */
  default_value?: number;
  /** True if default_value is stored as the log of this value */
  is_log?: boolean;
  /** name of the variable */
  name?: string;
  /** description of the variable */
  description?: string | null;
  /** myokit binding of the variable (e.g. time) */
  binding?: string | null;
  /** fully qualitifed name of the variable */
  qname?: string;
  /** if unit is None then this is the unit of this variable as a string */
  unit_symbol?: string | null;
  /** True for a constant variable of the model, i.e. a parameter. False if non-constant, i.e. an output of the model (default is True) */
  constant?: boolean;
  /** True if it is a state variable of the model and has an initial condition parameter (default is False) */
  state?: boolean;
  /** Color index associated with this variable. For display purposes in the frontend */
  color?: number;
  /** True if this variable will be displayed in the frontend, False otherwise */
  display?: boolean;
  /** False/True if biomarker type displayed on LHS/RHS axis */
  axis?: boolean;
  /** variable values are in this unit (note this might be different from the unit in the stored sbml) */
  unit?: number | null;
  /** pharmacodynamic model */
  pd_model?: number | null;
  /** pharmacokinetic model */
  pk_model?: number | null;
  /** dosed pharmacokinetic model */
  dosed_pk_model?: number | null;
  /** dosing protocol */
  protocol?: number | null;
};
export type PatchedVariableRead = {
  id?: number;
  /** true if object has been stored */
  read_only?: boolean;
  /** datetime the object was stored. */
  datetime?: string | null;
  is_public?: boolean;
  /** lowest possible value for this variable */
  lower_bound?: number | null;
  /** largest possible value for this variable */
  upper_bound?: number | null;
  /** default value for this variable */
  default_value?: number;
  /** True if default_value is stored as the log of this value */
  is_log?: boolean;
  /** name of the variable */
  name?: string;
  /** description of the variable */
  description?: string | null;
  /** myokit binding of the variable (e.g. time) */
  binding?: string | null;
  /** fully qualitifed name of the variable */
  qname?: string;
  /** if unit is None then this is the unit of this variable as a string */
  unit_symbol?: string | null;
  /** True for a constant variable of the model, i.e. a parameter. False if non-constant, i.e. an output of the model (default is True) */
  constant?: boolean;
  /** True if it is a state variable of the model and has an initial condition parameter (default is False) */
  state?: boolean;
  /** Color index associated with this variable. For display purposes in the frontend */
  color?: number;
  /** True if this variable will be displayed in the frontend, False otherwise */
  display?: boolean;
  /** False/True if biomarker type displayed on LHS/RHS axis */
  axis?: boolean;
  /** variable values are in this unit (note this might be different from the unit in the stored sbml) */
  unit?: number | null;
  /** pharmacodynamic model */
  pd_model?: number | null;
  /** pharmacokinetic model */
  pk_model?: number | null;
  /** dosed pharmacokinetic model */
  dosed_pk_model?: number | null;
  /** dosing protocol */
  protocol?: number | null;
};
export const {
  useAlgorithmListQuery,
  useAlgorithmCreateMutation,
  useAlgorithmRetrieveQuery,
  useAlgorithmUpdateMutation,
  useAlgorithmPartialUpdateMutation,
  useAlgorithmDestroyMutation,
  useAuceCreateMutation,
  useBiomarkerTypeListQuery,
  useBiomarkerTypeCreateMutation,
  useBiomarkerTypeRetrieveQuery,
  useBiomarkerTypeUpdateMutation,
  useBiomarkerTypePartialUpdateMutation,
  useBiomarkerTypeDestroyMutation,
  useCombinedModelListQuery,
  useCombinedModelCreateMutation,
  useCombinedModelRetrieveQuery,
  useCombinedModelUpdateMutation,
  useCombinedModelPartialUpdateMutation,
  useCombinedModelDestroyMutation,
  useCombinedModelSetParamsToDefaultsUpdateMutation,
  useCombinedModelSetVariablesFromInferenceUpdateMutation,
  useCombinedModelSimulateCreateMutation,
  useCompoundListQuery,
  useCompoundCreateMutation,
  useCompoundRetrieveQuery,
  useCompoundUpdateMutation,
  useCompoundPartialUpdateMutation,
  useCompoundDestroyMutation,
  useDatasetListQuery,
  useDatasetCreateMutation,
  useDatasetRetrieveQuery,
  useDatasetUpdateMutation,
  useDatasetPartialUpdateMutation,
  useDatasetDestroyMutation,
  useDatasetCsvUpdateMutation,
  useDoseListQuery,
  useDoseCreateMutation,
  useDoseRetrieveQuery,
  useDoseUpdateMutation,
  useDosePartialUpdateMutation,
  useDoseDestroyMutation,
  useInferenceListQuery,
  useInferenceCreateMutation,
  useInferenceRetrieveQuery,
  useInferenceUpdateMutation,
  useInferencePartialUpdateMutation,
  useInferenceDestroyMutation,
  useInferenceStopCreateMutation,
  useInferenceWizardCreateMutation,
  useInferenceChainListQuery,
  useInferenceChainCreateMutation,
  useInferenceChainRetrieveQuery,
  useInferenceChainUpdateMutation,
  useInferenceChainPartialUpdateMutation,
  useInferenceChainDestroyMutation,
  useNcaCreateMutation,
  usePharmacodynamicListQuery,
  usePharmacodynamicCreateMutation,
  usePharmacodynamicRetrieveQuery,
  usePharmacodynamicUpdateMutation,
  usePharmacodynamicPartialUpdateMutation,
  usePharmacodynamicDestroyMutation,
  usePharmacodynamicMmtUpdateMutation,
  usePharmacodynamicSbmlUpdateMutation,
  usePharmacodynamicSetVariablesFromInferenceUpdateMutation,
  usePharmacodynamicSimulateCreateMutation,
  usePharmacokineticListQuery,
  usePharmacokineticCreateMutation,
  usePharmacokineticRetrieveQuery,
  usePharmacokineticUpdateMutation,
  usePharmacokineticPartialUpdateMutation,
  usePharmacokineticDestroyMutation,
  useProjectListQuery,
  useProjectCreateMutation,
  useProjectRetrieveQuery,
  useProjectUpdateMutation,
  useProjectPartialUpdateMutation,
  useProjectDestroyMutation,
  useProjectCopyUpdateMutation,
  useProjectMonolixUpdateMutation,
  useProjectAccessListQuery,
  useProjectAccessCreateMutation,
  useProjectAccessRetrieveQuery,
  useProjectAccessUpdateMutation,
  useProjectAccessPartialUpdateMutation,
  useProjectAccessDestroyMutation,
  useProtocolListQuery,
  useProtocolCreateMutation,
  useProtocolRetrieveQuery,
  useProtocolUpdateMutation,
  useProtocolPartialUpdateMutation,
  useProtocolDestroyMutation,
  useSessionRetrieveQuery,
  useSimulationListQuery,
  useSimulationCreateMutation,
  useSimulationRetrieveQuery,
  useSimulationUpdateMutation,
  useSimulationPartialUpdateMutation,
  useSimulationDestroyMutation,
  useSubjectListQuery,
  useSubjectCreateMutation,
  useSubjectRetrieveQuery,
  useSubjectUpdateMutation,
  useSubjectPartialUpdateMutation,
  useSubjectDestroyMutation,
  useSubjectGroupListQuery,
  useSubjectGroupCreateMutation,
  useSubjectGroupRetrieveQuery,
  useSubjectGroupUpdateMutation,
  useSubjectGroupPartialUpdateMutation,
  useSubjectGroupDestroyMutation,
  useUnitListQuery,
  useUnitCreateMutation,
  useUnitRetrieveQuery,
  useUnitUpdateMutation,
  useUnitPartialUpdateMutation,
  useUnitDestroyMutation,
  useUserListQuery,
  useUserCreateMutation,
  useUserRetrieveQuery,
  useUserUpdateMutation,
  useUserPartialUpdateMutation,
  useUserDestroyMutation,
  useVariableListQuery,
  useVariableCreateMutation,
  useVariableRetrieveQuery,
  useVariableUpdateMutation,
  useVariablePartialUpdateMutation,
  useVariableDestroyMutation,
  useWhoamiRetrieveQuery,
} = injectedRtkApi;
