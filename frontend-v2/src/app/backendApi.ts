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
      query: () => ({ url: `/api/biomarker_type/` }),
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
      query: () => ({ url: `/api/dataset/` }),
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
      query: () => ({ url: `/api/protocol/` }),
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
      query: () => ({ url: `/api/subject/` }),
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
    unitList: build.query<UnitListApiResponse, UnitListApiArg>({
      query: () => ({ url: `/api/unit/` }),
    }),
    unitCreate: build.mutation<UnitCreateApiResponse, UnitCreateApiArg>({
      query: (queryArg) => ({
        url: `/api/unit/`,
        method: "POST",
        body: queryArg.unit,
      }),
    }),
    unitRetrieve: build.query<UnitRetrieveApiResponse, UnitRetrieveApiArg>({
      query: (queryArg) => ({ url: `/api/unit/${queryArg.id}/` }),
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
        params: { project_id: queryArg.projectId },
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
export type AlgorithmListApiResponse = /** status 200  */ Algorithm[];
export type AlgorithmListApiArg = void;
export type AlgorithmCreateApiResponse = /** status 201  */ Algorithm;
export type AlgorithmCreateApiArg = {
  algorithm: Algorithm;
};
export type AlgorithmRetrieveApiResponse = /** status 200  */ Algorithm;
export type AlgorithmRetrieveApiArg = {
  /** A unique integer value identifying this algorithm. */
  id: number;
};
export type AlgorithmUpdateApiResponse = /** status 200  */ Algorithm;
export type AlgorithmUpdateApiArg = {
  /** A unique integer value identifying this algorithm. */
  id: number;
  algorithm: Algorithm;
};
export type AlgorithmPartialUpdateApiResponse = /** status 200  */ Algorithm;
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
export type BiomarkerTypeListApiResponse = /** status 200  */ BiomarkerType[];
export type BiomarkerTypeListApiArg = void;
export type BiomarkerTypeCreateApiResponse = /** status 201  */ BiomarkerType;
export type BiomarkerTypeCreateApiArg = {
  biomarkerType: BiomarkerType;
};
export type BiomarkerTypeRetrieveApiResponse = /** status 200  */ BiomarkerType;
export type BiomarkerTypeRetrieveApiArg = {
  /** A unique integer value identifying this biomarker type. */
  id: number;
};
export type BiomarkerTypeUpdateApiResponse = /** status 200  */ BiomarkerType;
export type BiomarkerTypeUpdateApiArg = {
  /** A unique integer value identifying this biomarker type. */
  id: number;
  biomarkerType: BiomarkerType;
};
export type BiomarkerTypePartialUpdateApiResponse =
  /** status 200  */ BiomarkerType;
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
export type CombinedModelListApiResponse = /** status 200  */ CombinedModel[];
export type CombinedModelListApiArg = {
  /** Filter results by project ID */
  projectId?: number;
};
export type CombinedModelCreateApiResponse = /** status 201  */ CombinedModel;
export type CombinedModelCreateApiArg = {
  combinedModel: CombinedModel;
};
export type CombinedModelRetrieveApiResponse = /** status 200  */ CombinedModel;
export type CombinedModelRetrieveApiArg = {
  /** A unique integer value identifying this combined model. */
  id: number;
};
export type CombinedModelUpdateApiResponse = /** status 200  */ CombinedModel;
export type CombinedModelUpdateApiArg = {
  /** A unique integer value identifying this combined model. */
  id: number;
  combinedModel: CombinedModel;
};
export type CombinedModelPartialUpdateApiResponse =
  /** status 200  */ CombinedModel;
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
export type CombinedModelSetVariablesFromInferenceUpdateApiResponse =
  /** status 200  */ CombinedModel;
export type CombinedModelSetVariablesFromInferenceUpdateApiArg = {
  /** A unique integer value identifying this combined model. */
  id: number;
  combinedModel: CombinedModel;
};
export type CombinedModelSimulateCreateApiResponse =
  /** status 200  */ SimulateResponse;
export type CombinedModelSimulateCreateApiArg = {
  id: number;
  simulate: Simulate;
};
export type CompoundListApiResponse = /** status 200  */ Compound[];
export type CompoundListApiArg = void;
export type CompoundCreateApiResponse = /** status 201  */ Compound;
export type CompoundCreateApiArg = {
  compound: Compound;
};
export type CompoundRetrieveApiResponse = /** status 200  */ Compound;
export type CompoundRetrieveApiArg = {
  /** A unique integer value identifying this compound. */
  id: number;
};
export type CompoundUpdateApiResponse = /** status 200  */ Compound;
export type CompoundUpdateApiArg = {
  /** A unique integer value identifying this compound. */
  id: number;
  compound: Compound;
};
export type CompoundPartialUpdateApiResponse = /** status 200  */ Compound;
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
export type DatasetListApiResponse = /** status 200  */ Dataset[];
export type DatasetListApiArg = void;
export type DatasetCreateApiResponse = /** status 201  */ Dataset;
export type DatasetCreateApiArg = {
  dataset: Dataset;
};
export type DatasetRetrieveApiResponse = /** status 200  */ Dataset;
export type DatasetRetrieveApiArg = {
  /** A unique integer value identifying this dataset. */
  id: number;
};
export type DatasetUpdateApiResponse = /** status 200  */ Dataset;
export type DatasetUpdateApiArg = {
  /** A unique integer value identifying this dataset. */
  id: number;
  dataset: Dataset;
};
export type DatasetPartialUpdateApiResponse = /** status 200  */ Dataset;
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
export type DoseListApiResponse = /** status 200  */ Dose[];
export type DoseListApiArg = void;
export type DoseCreateApiResponse = /** status 201  */ Dose;
export type DoseCreateApiArg = {
  dose: Dose;
};
export type DoseRetrieveApiResponse = /** status 200  */ Dose;
export type DoseRetrieveApiArg = {
  /** A unique integer value identifying this dose. */
  id: number;
};
export type DoseUpdateApiResponse = /** status 200  */ Dose;
export type DoseUpdateApiArg = {
  /** A unique integer value identifying this dose. */
  id: number;
  dose: Dose;
};
export type DosePartialUpdateApiResponse = /** status 200  */ Dose;
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
export type InferenceListApiResponse = /** status 200  */ Inference[];
export type InferenceListApiArg = void;
export type InferenceCreateApiResponse = /** status 201  */ Inference;
export type InferenceCreateApiArg = {
  inference: Inference;
};
export type InferenceRetrieveApiResponse = /** status 200  */ Inference;
export type InferenceRetrieveApiArg = {
  /** A unique integer value identifying this inference. */
  id: number;
};
export type InferenceUpdateApiResponse = /** status 200  */ Inference;
export type InferenceUpdateApiArg = {
  /** A unique integer value identifying this inference. */
  id: number;
  inference: Inference;
};
export type InferencePartialUpdateApiResponse = /** status 200  */ Inference;
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
export type InferenceChainListApiResponse = /** status 200  */ InferenceChain[];
export type InferenceChainListApiArg = void;
export type InferenceChainCreateApiResponse = /** status 201  */ InferenceChain;
export type InferenceChainCreateApiArg = {
  inferenceChain: InferenceChain;
};
export type InferenceChainRetrieveApiResponse =
  /** status 200  */ InferenceChain;
export type InferenceChainRetrieveApiArg = {
  /** A unique integer value identifying this inference chain. */
  id: number;
};
export type InferenceChainUpdateApiResponse = /** status 200  */ InferenceChain;
export type InferenceChainUpdateApiArg = {
  /** A unique integer value identifying this inference chain. */
  id: number;
  inferenceChain: InferenceChain;
};
export type InferenceChainPartialUpdateApiResponse =
  /** status 200  */ InferenceChain;
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
  /** status 200  */ Pharmacodynamic[];
export type PharmacodynamicListApiArg = void;
export type PharmacodynamicCreateApiResponse =
  /** status 201  */ Pharmacodynamic;
export type PharmacodynamicCreateApiArg = {
  pharmacodynamic: Pharmacodynamic;
};
export type PharmacodynamicRetrieveApiResponse =
  /** status 200  */ Pharmacodynamic;
export type PharmacodynamicRetrieveApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: number;
};
export type PharmacodynamicUpdateApiResponse =
  /** status 200  */ Pharmacodynamic;
export type PharmacodynamicUpdateApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: number;
  pharmacodynamic: Pharmacodynamic;
};
export type PharmacodynamicPartialUpdateApiResponse =
  /** status 200  */ Pharmacodynamic;
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
  /** status 200  */ Pharmacodynamic;
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
  pharmacodynamicSbml: PharmacodynamicSbml;
};
export type PharmacodynamicSetVariablesFromInferenceUpdateApiResponse =
  /** status 200  */ Pharmacodynamic;
export type PharmacodynamicSetVariablesFromInferenceUpdateApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: number;
  pharmacodynamic: Pharmacodynamic;
};
export type PharmacodynamicSimulateCreateApiResponse =
  /** status 200  */ SimulateResponse;
export type PharmacodynamicSimulateCreateApiArg = {
  id: number;
  simulate: Simulate;
};
export type PharmacokineticListApiResponse =
  /** status 200  */ Pharmacokinetic[];
export type PharmacokineticListApiArg = void;
export type PharmacokineticCreateApiResponse =
  /** status 201  */ Pharmacokinetic;
export type PharmacokineticCreateApiArg = {
  pharmacokinetic: Pharmacokinetic;
};
export type PharmacokineticRetrieveApiResponse =
  /** status 200  */ Pharmacokinetic;
export type PharmacokineticRetrieveApiArg = {
  /** A unique integer value identifying this pharmacokinetic model. */
  id: number;
};
export type PharmacokineticUpdateApiResponse =
  /** status 200  */ Pharmacokinetic;
export type PharmacokineticUpdateApiArg = {
  /** A unique integer value identifying this pharmacokinetic model. */
  id: number;
  pharmacokinetic: Pharmacokinetic;
};
export type PharmacokineticPartialUpdateApiResponse =
  /** status 200  */ Pharmacokinetic;
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
export type ProjectListApiResponse = /** status 200  */ Project[];
export type ProjectListApiArg = void;
export type ProjectCreateApiResponse = /** status 201  */ Project;
export type ProjectCreateApiArg = {
  project: Project;
};
export type ProjectRetrieveApiResponse = /** status 200  */ Project;
export type ProjectRetrieveApiArg = {
  /** A unique integer value identifying this project. */
  id: number;
};
export type ProjectUpdateApiResponse = /** status 200  */ Project;
export type ProjectUpdateApiArg = {
  /** A unique integer value identifying this project. */
  id: number;
  project: Project;
};
export type ProjectPartialUpdateApiResponse = /** status 200  */ Project;
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
export type ProjectMonolixUpdateApiResponse = /** status 200  */ Monolix;
export type ProjectMonolixUpdateApiArg = {
  /** A unique integer value identifying this project. */
  id: number;
  monolix: Monolix;
};
export type ProjectAccessListApiResponse = /** status 200  */ ProjectAccess[];
export type ProjectAccessListApiArg = void;
export type ProjectAccessCreateApiResponse = /** status 201  */ ProjectAccess;
export type ProjectAccessCreateApiArg = {
  projectAccess: ProjectAccess;
};
export type ProjectAccessRetrieveApiResponse = /** status 200  */ ProjectAccess;
export type ProjectAccessRetrieveApiArg = {
  /** A unique integer value identifying this project access. */
  id: number;
};
export type ProjectAccessUpdateApiResponse = /** status 200  */ ProjectAccess;
export type ProjectAccessUpdateApiArg = {
  /** A unique integer value identifying this project access. */
  id: number;
  projectAccess: ProjectAccess;
};
export type ProjectAccessPartialUpdateApiResponse =
  /** status 200  */ ProjectAccess;
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
export type ProtocolListApiResponse = /** status 200  */ Protocol[];
export type ProtocolListApiArg = void;
export type ProtocolCreateApiResponse = /** status 201  */ Protocol;
export type ProtocolCreateApiArg = {
  protocol: Protocol;
};
export type ProtocolRetrieveApiResponse = /** status 200  */ Protocol;
export type ProtocolRetrieveApiArg = {
  /** A unique integer value identifying this protocol. */
  id: number;
};
export type ProtocolUpdateApiResponse = /** status 200  */ Protocol;
export type ProtocolUpdateApiArg = {
  /** A unique integer value identifying this protocol. */
  id: number;
  protocol: Protocol;
};
export type ProtocolPartialUpdateApiResponse = /** status 200  */ Protocol;
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
export type SimulationListApiResponse = /** status 200  */ Simulation[];
export type SimulationListApiArg = {
  /** Filter results by project ID */
  projectId?: number;
};
export type SimulationCreateApiResponse = /** status 201  */ Simulation;
export type SimulationCreateApiArg = {
  simulation: Simulation;
};
export type SimulationRetrieveApiResponse = /** status 200  */ Simulation;
export type SimulationRetrieveApiArg = {
  /** A unique integer value identifying this simulation. */
  id: number;
};
export type SimulationUpdateApiResponse = /** status 200  */ Simulation;
export type SimulationUpdateApiArg = {
  /** A unique integer value identifying this simulation. */
  id: number;
  simulation: Simulation;
};
export type SimulationPartialUpdateApiResponse = /** status 200  */ Simulation;
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
export type SubjectListApiResponse = /** status 200  */ Subject[];
export type SubjectListApiArg = void;
export type SubjectCreateApiResponse = /** status 201  */ Subject;
export type SubjectCreateApiArg = {
  subject: Subject;
};
export type SubjectRetrieveApiResponse = /** status 200  */ Subject;
export type SubjectRetrieveApiArg = {
  /** A unique integer value identifying this subject. */
  id: number;
};
export type SubjectUpdateApiResponse = /** status 200  */ Subject;
export type SubjectUpdateApiArg = {
  /** A unique integer value identifying this subject. */
  id: number;
  subject: Subject;
};
export type SubjectPartialUpdateApiResponse = /** status 200  */ Subject;
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
export type UnitListApiResponse = /** status 200  */ Unit[];
export type UnitListApiArg = void;
export type UnitCreateApiResponse = /** status 201  */ Unit;
export type UnitCreateApiArg = {
  unit: Unit;
};
export type UnitRetrieveApiResponse = /** status 200  */ Unit;
export type UnitRetrieveApiArg = {
  /** A unique integer value identifying this unit. */
  id: number;
};
export type UnitUpdateApiResponse = /** status 200  */ Unit;
export type UnitUpdateApiArg = {
  /** A unique integer value identifying this unit. */
  id: number;
  unit: Unit;
};
export type UnitPartialUpdateApiResponse = /** status 200  */ Unit;
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
export type UserListApiResponse = /** status 200  */ User[];
export type UserListApiArg = void;
export type UserCreateApiResponse = /** status 201  */ User;
export type UserCreateApiArg = {
  user: User;
};
export type UserRetrieveApiResponse = /** status 200  */ User;
export type UserRetrieveApiArg = {
  /** A unique integer value identifying this user. */
  id: number;
};
export type UserUpdateApiResponse = /** status 200  */ User;
export type UserUpdateApiArg = {
  /** A unique integer value identifying this user. */
  id: number;
  user: User;
};
export type UserPartialUpdateApiResponse = /** status 200  */ User;
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
export type VariableListApiResponse = /** status 200  */ Variable[];
export type VariableListApiArg = {
  /** Filter results by project ID */
  projectId?: number;
};
export type VariableCreateApiResponse = /** status 201  */ Variable;
export type VariableCreateApiArg = {
  variable: Variable;
};
export type VariableRetrieveApiResponse = /** status 200  */ Variable;
export type VariableRetrieveApiArg = {
  /** A unique integer value identifying this variable. */
  id: number;
};
export type VariableUpdateApiResponse = /** status 200  */ Variable;
export type VariableUpdateApiArg = {
  /** A unique integer value identifying this variable. */
  id: number;
  variable: Variable;
};
export type VariablePartialUpdateApiResponse = /** status 200  */ Variable;
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
  id: number;
  name: string;
  category: CategoryEnum;
};
export type PatchedAlgorithm = {
  id?: number;
  name?: string;
  category?: CategoryEnum;
};
export type BiomarkerType = {
  id: number;
  data: {
    [key: string]: any[];
  } | null;
  is_continuous: boolean;
  is_categorical: boolean;
  name: string;
  description?: string | null;
  display?: boolean;
  color?: number;
  axis?: boolean;
  stored_unit: number;
  dataset: number;
  display_unit: number;
  stored_time_unit: number;
  display_time_unit: number;
};
export type PatchedBiomarkerType = {
  id?: number;
  data?: {
    [key: string]: any[];
  } | null;
  is_continuous?: boolean;
  is_categorical?: boolean;
  name?: string;
  description?: string | null;
  display?: boolean;
  color?: number;
  axis?: boolean;
  stored_unit?: number;
  dataset?: number;
  display_unit?: number;
  stored_time_unit?: number;
  display_time_unit?: number;
};
export type PkpdMapping = {
  id: number;
  datetime: string;
  read_only: boolean;
  pkpd_model: number;
  pk_variable: number;
  pd_variable: number;
};
export type SpeciesEnum = "H" | "R" | "N" | "M";
export type CombinedModel = {
  id: number;
  mappings: PkpdMapping[];
  components: string;
  variables: number[];
  mmt: string;
  read_only?: boolean;
  datetime?: string | null;
  name: string;
  species?: SpeciesEnum;
  has_saturation?: boolean;
  has_effect?: boolean;
  has_lag?: boolean;
  has_hill_coefficient?: boolean;
  time_max?: number;
  project?: number | null;
  pk_model?: number | null;
  pd_model?: number | null;
  pd_model2?: number | null;
};
export type PatchedCombinedModel = {
  id?: number;
  mappings?: PkpdMapping[];
  components?: string;
  variables?: number[];
  mmt?: string;
  read_only?: boolean;
  datetime?: string | null;
  name?: string;
  species?: SpeciesEnum;
  has_saturation?: boolean;
  has_effect?: boolean;
  has_lag?: boolean;
  has_hill_coefficient?: boolean;
  time_max?: number;
  project?: number | null;
  pk_model?: number | null;
  pd_model?: number | null;
  pd_model2?: number | null;
};
export type SimulateResponse = {
  time: number[];
  outputs: {
    [key: string]: number[];
  };
};
export type Simulate = {
  outputs: string[];
  initial_conditions: {
    [key: string]: number;
  };
  variables: {
    [key: string]: number;
  };
};
export type Efficacy = {
  id: number;
  name: string;
  c50: number;
  hill_coefficient?: number;
  c50_unit: number;
  compound: number;
};
export type CompoundTypeEnum = "SM" | "LM";
export type IntrinsicClearanceAssayEnum = "MS" | "HC";
export type Compound = {
  id: number;
  efficacy_experiments: Efficacy[];
  name: string;
  description?: string;
  molecular_mass: number;
  compound_type?: CompoundTypeEnum;
  fraction_unbound_plasma?: number | null;
  blood_to_plasma_ratio?: number | null;
  intrinsic_clearance?: number | null;
  intrinsic_clearance_assay?: IntrinsicClearanceAssayEnum;
  fraction_unbound_including_cells?: number | null;
  target_molecular_mass: number;
  target_concentration?: number | null;
  dissociation_constant?: number | null;
  is_soluble?: boolean;
  molecular_mass_unit?: number;
  intrinsic_clearance_unit?: number;
  target_molecular_mass_unit?: number;
  target_concentration_unit?: number;
  dissociation_unit?: number;
};
export type PatchedCompound = {
  id?: number;
  efficacy_experiments?: Efficacy[];
  name?: string;
  description?: string;
  molecular_mass?: number;
  compound_type?: CompoundTypeEnum;
  fraction_unbound_plasma?: number | null;
  blood_to_plasma_ratio?: number | null;
  intrinsic_clearance?: number | null;
  intrinsic_clearance_assay?: IntrinsicClearanceAssayEnum;
  fraction_unbound_including_cells?: number | null;
  target_molecular_mass?: number;
  target_concentration?: number | null;
  dissociation_constant?: number | null;
  is_soluble?: boolean;
  molecular_mass_unit?: number;
  intrinsic_clearance_unit?: number;
  target_molecular_mass_unit?: number;
  target_concentration_unit?: number;
  dissociation_unit?: number;
};
export type Dose = {
  id: number;
  start_time: number;
  amount: number;
  duration?: number;
  read_only?: boolean;
  datetime?: string | null;
  protocol: number;
};
export type DoseTypeEnum = "D" | "I";
export type Protocol = {
  id: number;
  doses: Dose[];
  dose_ids: number[];
  dosed_pk_models: string[];
  dataset: string;
  subjects: number[];
  read_only?: boolean;
  datetime?: string | null;
  name: string;
  dose_type?: DoseTypeEnum;
  project?: number | null;
  compound?: number | null;
  time_unit?: number | null;
  amount_unit?: number | null;
};
export type Dataset = {
  id: number;
  biomarker_types: number[];
  subjects: number[];
  protocols: Protocol[];
  name: string;
  datetime?: string | null;
  description?: string;
  project?: number | null;
};
export type PatchedDataset = {
  id?: number;
  biomarker_types?: number[];
  subjects?: number[];
  protocols?: Protocol[];
  name?: string;
  datetime?: string | null;
  description?: string;
  project?: number | null;
};
export type DatasetCsv = {
  csv: string;
};
export type PatchedDose = {
  id?: number;
  start_time?: number;
  amount?: number;
  duration?: number;
  read_only?: boolean;
  datetime?: string | null;
  protocol?: number;
};
export type LogLikelihoodParameter = {
  id: number;
  name: string;
  parent_index?: number | null;
  child_index?: number;
  length?: number | null;
  parent: number;
  child: number;
  variable?: number | null;
};
export type FormEnum = "N" | "U" | "LN" | "F" | "S" | "E" | "M";
export type LogLikelihood = {
  id: number;
  parameters: LogLikelihoodParameter[];
  model: string[] | null;
  dataset: number | null;
  time_variable: number | null;
  is_a_prior: boolean;
  name: string;
  description?: string | null;
  value?: number | null;
  time_independent_data?: boolean;
  observed?: boolean;
  form?: FormEnum;
  inference: number;
  variable?: number | null;
  biomarker_type?: number | null;
  protocol_filter?: number | null;
  children: number[];
};
export type InitializationStrategyEnum = "D" | "R" | "F";
export type Inference = {
  id: number;
  log_likelihoods: LogLikelihood[];
  read_only?: boolean;
  datetime?: string | null;
  name: string;
  description?: string;
  initialization_strategy?: InitializationStrategyEnum;
  number_of_chains?: number;
  max_number_of_iterations?: number;
  burn_in?: number;
  number_of_iterations?: number;
  time_elapsed?: number;
  number_of_function_evals?: number;
  task_id?: string | null;
  metadata?: {
    [key: string]: any;
  };
  project: number;
  algorithm?: number;
  initialization_inference?: number | null;
};
export type PatchedInference = {
  id?: number;
  log_likelihoods?: LogLikelihood[];
  read_only?: boolean;
  datetime?: string | null;
  name?: string;
  description?: string;
  initialization_strategy?: InitializationStrategyEnum;
  number_of_chains?: number;
  max_number_of_iterations?: number;
  burn_in?: number;
  number_of_iterations?: number;
  time_elapsed?: number;
  number_of_function_evals?: number;
  task_id?: string | null;
  metadata?: {
    [key: string]: any;
  };
  project?: number;
  algorithm?: number;
  initialization_inference?: number | null;
};
export type InferenceChain = {
  id: number;
  data: string;
  outputs: string;
  inference: number;
};
export type PatchedInferenceChain = {
  id?: number;
  data?: string;
  outputs?: string;
  inference?: number;
};
export type Pharmacodynamic = {
  id: number;
  components: string;
  variables: number[];
  mmt?: string;
  read_only?: boolean;
  datetime?: string | null;
  name: string;
  description?: string;
  time_max?: number;
  project?: number | null;
};
export type PatchedPharmacodynamic = {
  id?: number;
  components?: string;
  variables?: number[];
  mmt?: string;
  read_only?: boolean;
  datetime?: string | null;
  name?: string;
  description?: string;
  time_max?: number;
  project?: number | null;
};
export type PharmacodynamicSbml = {
  sbml: string;
};
export type Pharmacokinetic = {
  id: number;
  read_only?: boolean;
  datetime?: string | null;
  name: string;
  description?: string;
  mmt?: string;
  time_max?: number;
};
export type PatchedPharmacokinetic = {
  id?: number;
  read_only?: boolean;
  datetime?: string | null;
  name?: string;
  description?: string;
  mmt?: string;
  time_max?: number;
};
export type ProjectAccess = {
  id: number;
  read_only?: boolean;
  user: number;
  project: number;
};
export type Project = {
  id: number;
  user_access: ProjectAccess[];
  name: string;
  description?: string;
  compound: number;
  users: number[];
};
export type PatchedProject = {
  id?: number;
  user_access?: ProjectAccess[];
  name?: string;
  description?: string;
  compound?: number;
  users?: number[];
};
export type Monolix = {
  data_csv: string;
  model_txt: string;
  project_mlxtran: string;
  data: string;
  pd_model: string;
  pk_model: string;
};
export type PatchedProjectAccess = {
  id?: number;
  read_only?: boolean;
  user?: number;
  project?: number;
};
export type PatchedProtocol = {
  id?: number;
  doses?: Dose[];
  dose_ids?: number[];
  dosed_pk_models?: string[];
  dataset?: string;
  subjects?: number[];
  read_only?: boolean;
  datetime?: string | null;
  name?: string;
  dose_type?: DoseTypeEnum;
  project?: number | null;
  compound?: number | null;
  time_unit?: number | null;
  amount_unit?: number | null;
};
export type SimulationSlider = {
  id: number;
  simulation: number;
  variable: number;
};
export type SimulationYAxis = {
  id: number;
  right?: boolean;
  plot: number;
  variable: number;
};
export type SimulationCxLine = {
  id: number;
  value: number;
  plot: number;
};
export type SimulationPlot = {
  id: number;
  y_axes: SimulationYAxis[];
  cx_lines: SimulationCxLine[];
  index: number;
  receptor_occupancy?: boolean;
  simulation: number;
  x_unit: number;
  y_unit?: number | null;
  y_unit2?: number | null;
};
export type Simulation = {
  id: number;
  sliders: SimulationSlider[];
  plots: SimulationPlot[];
  name: string;
  nrows?: number;
  ncols?: number;
  project: number;
};
export type PatchedSimulation = {
  id?: number;
  sliders?: SimulationSlider[];
  plots?: SimulationPlot[];
  name?: string;
  nrows?: number;
  ncols?: number;
  project?: number;
};
export type Subject = {
  id: number;
  id_in_dataset: number;
  shape?: number;
  display?: boolean;
  metadata?: string;
  dataset: number;
  protocol?: number | null;
};
export type PatchedSubject = {
  id?: number;
  id_in_dataset?: number;
  shape?: number;
  display?: boolean;
  metadata?: string;
  dataset?: number;
  protocol?: number | null;
};
export type Unit = {
  id: number;
  compatible_units: {
    [key: string]: string;
  }[];
  symbol: string;
  g?: number;
  m?: number;
  s?: number;
  A?: number;
  K?: number;
  cd?: number;
  mol?: number;
  multiplier?: number;
};
export type PatchedUnit = {
  id?: number;
  compatible_units?: {
    [key: string]: string;
  }[];
  symbol?: string;
  g?: number;
  m?: number;
  s?: number;
  A?: number;
  K?: number;
  cd?: number;
  mol?: number;
  multiplier?: number;
};
export type Profile = {
  id: number;
  user: number;
};
export type User = {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  profile: Profile;
  project_set: number[];
};
export type PatchedUser = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  profile?: Profile;
  project_set?: number[];
};
export type Variable = {
  id: number;
  read_only?: boolean;
  datetime?: string | null;
  is_public?: boolean;
  lower_bound?: number;
  upper_bound?: number;
  default_value?: number;
  is_log?: boolean;
  name: string;
  binding?: string | null;
  qname: string;
  constant?: boolean;
  state?: boolean;
  color?: number;
  display?: boolean;
  axis?: boolean;
  link_to_ro?: boolean;
  unit?: number | null;
  pd_model?: number | null;
  pk_model?: number | null;
  dosed_pk_model?: number | null;
  protocol?: number | null;
};
export type PatchedVariable = {
  id?: number;
  read_only?: boolean;
  datetime?: string | null;
  is_public?: boolean;
  lower_bound?: number;
  upper_bound?: number;
  default_value?: number;
  is_log?: boolean;
  name?: string;
  binding?: string | null;
  qname?: string;
  constant?: boolean;
  state?: boolean;
  color?: number;
  display?: boolean;
  axis?: boolean;
  link_to_ro?: boolean;
  unit?: number | null;
  pd_model?: number | null;
  pk_model?: number | null;
  dosed_pk_model?: number | null;
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
