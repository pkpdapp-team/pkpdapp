import { emptySplitApi as api } from "./emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    listDatasets: build.query<ListDatasetsApiResponse, ListDatasetsApiArg>({
      query: () => ({ url: `/api/dataset/` }),
    }),
    createDataset: build.mutation<
      CreateDatasetApiResponse,
      CreateDatasetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dataset/`,
        method: "POST",
        body: queryArg.dataset,
      }),
    }),
    retrieveDataset: build.query<
      RetrieveDatasetApiResponse,
      RetrieveDatasetApiArg
    >({
      query: (queryArg) => ({ url: `/api/dataset/${queryArg.id}/` }),
    }),
    updateDataset: build.mutation<
      UpdateDatasetApiResponse,
      UpdateDatasetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dataset/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.dataset,
      }),
    }),
    partialUpdateDataset: build.mutation<
      PartialUpdateDatasetApiResponse,
      PartialUpdateDatasetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dataset/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.dataset,
      }),
    }),
    destroyDataset: build.mutation<
      DestroyDatasetApiResponse,
      DestroyDatasetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dataset/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listUsers: build.query<ListUsersApiResponse, ListUsersApiArg>({
      query: () => ({ url: `/api/user/` }),
    }),
    createUser: build.mutation<CreateUserApiResponse, CreateUserApiArg>({
      query: (queryArg) => ({
        url: `/api/user/`,
        method: "POST",
        body: queryArg.user,
      }),
    }),
    retrieveUser: build.query<RetrieveUserApiResponse, RetrieveUserApiArg>({
      query: (queryArg) => ({ url: `/api/user/${queryArg.id}/` }),
    }),
    updateUser: build.mutation<UpdateUserApiResponse, UpdateUserApiArg>({
      query: (queryArg) => ({
        url: `/api/user/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.user,
      }),
    }),
    partialUpdateUser: build.mutation<
      PartialUpdateUserApiResponse,
      PartialUpdateUserApiArg
    >({
      query: (queryArg) => ({
        url: `/api/user/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.user,
      }),
    }),
    destroyUser: build.mutation<DestroyUserApiResponse, DestroyUserApiArg>({
      query: (queryArg) => ({
        url: `/api/user/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listSubjects: build.query<ListSubjectsApiResponse, ListSubjectsApiArg>({
      query: () => ({ url: `/api/subject/` }),
    }),
    createSubject: build.mutation<
      CreateSubjectApiResponse,
      CreateSubjectApiArg
    >({
      query: (queryArg) => ({
        url: `/api/subject/`,
        method: "POST",
        body: queryArg.subject,
      }),
    }),
    retrieveSubject: build.query<
      RetrieveSubjectApiResponse,
      RetrieveSubjectApiArg
    >({
      query: (queryArg) => ({ url: `/api/subject/${queryArg.id}/` }),
    }),
    updateSubject: build.mutation<
      UpdateSubjectApiResponse,
      UpdateSubjectApiArg
    >({
      query: (queryArg) => ({
        url: `/api/subject/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.subject,
      }),
    }),
    partialUpdateSubject: build.mutation<
      PartialUpdateSubjectApiResponse,
      PartialUpdateSubjectApiArg
    >({
      query: (queryArg) => ({
        url: `/api/subject/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.subject,
      }),
    }),
    destroySubject: build.mutation<
      DestroySubjectApiResponse,
      DestroySubjectApiArg
    >({
      query: (queryArg) => ({
        url: `/api/subject/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listProjects: build.query<ListProjectsApiResponse, ListProjectsApiArg>({
      query: () => ({ url: `/api/project/` }),
    }),
    createProject: build.mutation<
      CreateProjectApiResponse,
      CreateProjectApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project/`,
        method: "POST",
        body: queryArg.project,
      }),
    }),
    retrieveProject: build.query<
      RetrieveProjectApiResponse,
      RetrieveProjectApiArg
    >({
      query: (queryArg) => ({ url: `/api/project/${queryArg.id}/` }),
    }),
    updateProject: build.mutation<
      UpdateProjectApiResponse,
      UpdateProjectApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.project,
      }),
    }),
    partialUpdateProject: build.mutation<
      PartialUpdateProjectApiResponse,
      PartialUpdateProjectApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.project,
      }),
    }),
    destroyProject: build.mutation<
      DestroyProjectApiResponse,
      DestroyProjectApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listProjectAccess: build.query<
      ListProjectAccessApiResponse,
      ListProjectAccessApiArg
    >({
      query: () => ({ url: `/api/project_access/` }),
    }),
    createProjectAccess: build.mutation<
      CreateProjectAccessApiResponse,
      CreateProjectAccessApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project_access/`,
        method: "POST",
        body: queryArg.projectAccess,
      }),
    }),
    retrieveProjectAccess: build.query<
      RetrieveProjectAccessApiResponse,
      RetrieveProjectAccessApiArg
    >({
      query: (queryArg) => ({ url: `/api/project_access/${queryArg.id}/` }),
    }),
    updateProjectAccess: build.mutation<
      UpdateProjectAccessApiResponse,
      UpdateProjectAccessApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project_access/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.projectAccess,
      }),
    }),
    partialUpdateProjectAccess: build.mutation<
      PartialUpdateProjectAccessApiResponse,
      PartialUpdateProjectAccessApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project_access/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.projectAccess,
      }),
    }),
    destroyProjectAccess: build.mutation<
      DestroyProjectAccessApiResponse,
      DestroyProjectAccessApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project_access/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listDoses: build.query<ListDosesApiResponse, ListDosesApiArg>({
      query: () => ({ url: `/api/dose/` }),
    }),
    createDose: build.mutation<CreateDoseApiResponse, CreateDoseApiArg>({
      query: (queryArg) => ({
        url: `/api/dose/`,
        method: "POST",
        body: queryArg.dose,
      }),
    }),
    retrieveDose: build.query<RetrieveDoseApiResponse, RetrieveDoseApiArg>({
      query: (queryArg) => ({ url: `/api/dose/${queryArg.id}/` }),
    }),
    updateDose: build.mutation<UpdateDoseApiResponse, UpdateDoseApiArg>({
      query: (queryArg) => ({
        url: `/api/dose/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.dose,
      }),
    }),
    partialUpdateDose: build.mutation<
      PartialUpdateDoseApiResponse,
      PartialUpdateDoseApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dose/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.dose,
      }),
    }),
    destroyDose: build.mutation<DestroyDoseApiResponse, DestroyDoseApiArg>({
      query: (queryArg) => ({
        url: `/api/dose/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listUnits: build.query<ListUnitsApiResponse, ListUnitsApiArg>({
      query: () => ({ url: `/api/unit/` }),
    }),
    createUnit: build.mutation<CreateUnitApiResponse, CreateUnitApiArg>({
      query: (queryArg) => ({
        url: `/api/unit/`,
        method: "POST",
        body: queryArg.unit,
      }),
    }),
    retrieveUnit: build.query<RetrieveUnitApiResponse, RetrieveUnitApiArg>({
      query: (queryArg) => ({ url: `/api/unit/${queryArg.id}/` }),
    }),
    updateUnit: build.mutation<UpdateUnitApiResponse, UpdateUnitApiArg>({
      query: (queryArg) => ({
        url: `/api/unit/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.unit,
      }),
    }),
    partialUpdateUnit: build.mutation<
      PartialUpdateUnitApiResponse,
      PartialUpdateUnitApiArg
    >({
      query: (queryArg) => ({
        url: `/api/unit/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.unit,
      }),
    }),
    destroyUnit: build.mutation<DestroyUnitApiResponse, DestroyUnitApiArg>({
      query: (queryArg) => ({
        url: `/api/unit/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listVariables: build.query<ListVariablesApiResponse, ListVariablesApiArg>({
      query: () => ({ url: `/api/variable/` }),
    }),
    createVariable: build.mutation<
      CreateVariableApiResponse,
      CreateVariableApiArg
    >({
      query: (queryArg) => ({
        url: `/api/variable/`,
        method: "POST",
        body: queryArg.variable,
      }),
    }),
    retrieveVariable: build.query<
      RetrieveVariableApiResponse,
      RetrieveVariableApiArg
    >({
      query: (queryArg) => ({ url: `/api/variable/${queryArg.id}/` }),
    }),
    updateVariable: build.mutation<
      UpdateVariableApiResponse,
      UpdateVariableApiArg
    >({
      query: (queryArg) => ({
        url: `/api/variable/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.variable,
      }),
    }),
    partialUpdateVariable: build.mutation<
      PartialUpdateVariableApiResponse,
      PartialUpdateVariableApiArg
    >({
      query: (queryArg) => ({
        url: `/api/variable/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.variable,
      }),
    }),
    destroyVariable: build.mutation<
      DestroyVariableApiResponse,
      DestroyVariableApiArg
    >({
      query: (queryArg) => ({
        url: `/api/variable/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listProtocols: build.query<ListProtocolsApiResponse, ListProtocolsApiArg>({
      query: () => ({ url: `/api/protocol/` }),
    }),
    createProtocol: build.mutation<
      CreateProtocolApiResponse,
      CreateProtocolApiArg
    >({
      query: (queryArg) => ({
        url: `/api/protocol/`,
        method: "POST",
        body: queryArg.protocol,
      }),
    }),
    retrieveProtocol: build.query<
      RetrieveProtocolApiResponse,
      RetrieveProtocolApiArg
    >({
      query: (queryArg) => ({ url: `/api/protocol/${queryArg.id}/` }),
    }),
    updateProtocol: build.mutation<
      UpdateProtocolApiResponse,
      UpdateProtocolApiArg
    >({
      query: (queryArg) => ({
        url: `/api/protocol/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.protocol,
      }),
    }),
    partialUpdateProtocol: build.mutation<
      PartialUpdateProtocolApiResponse,
      PartialUpdateProtocolApiArg
    >({
      query: (queryArg) => ({
        url: `/api/protocol/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.protocol,
      }),
    }),
    destroyProtocol: build.mutation<
      DestroyProtocolApiResponse,
      DestroyProtocolApiArg
    >({
      query: (queryArg) => ({
        url: `/api/protocol/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listBiomarkerTypes: build.query<
      ListBiomarkerTypesApiResponse,
      ListBiomarkerTypesApiArg
    >({
      query: () => ({ url: `/api/biomarker_type/` }),
    }),
    createBiomarkerType: build.mutation<
      CreateBiomarkerTypeApiResponse,
      CreateBiomarkerTypeApiArg
    >({
      query: (queryArg) => ({
        url: `/api/biomarker_type/`,
        method: "POST",
        body: queryArg.biomarkerType,
      }),
    }),
    retrieveBiomarkerType: build.query<
      RetrieveBiomarkerTypeApiResponse,
      RetrieveBiomarkerTypeApiArg
    >({
      query: (queryArg) => ({ url: `/api/biomarker_type/${queryArg.id}/` }),
    }),
    updateBiomarkerType: build.mutation<
      UpdateBiomarkerTypeApiResponse,
      UpdateBiomarkerTypeApiArg
    >({
      query: (queryArg) => ({
        url: `/api/biomarker_type/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.biomarkerType,
      }),
    }),
    partialUpdateBiomarkerType: build.mutation<
      PartialUpdateBiomarkerTypeApiResponse,
      PartialUpdateBiomarkerTypeApiArg
    >({
      query: (queryArg) => ({
        url: `/api/biomarker_type/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.biomarkerType,
      }),
    }),
    destroyBiomarkerType: build.mutation<
      DestroyBiomarkerTypeApiResponse,
      DestroyBiomarkerTypeApiArg
    >({
      query: (queryArg) => ({
        url: `/api/biomarker_type/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listPharmacokineticModels: build.query<
      ListPharmacokineticModelsApiResponse,
      ListPharmacokineticModelsApiArg
    >({
      query: () => ({ url: `/api/pharmacokinetic/` }),
    }),
    createPharmacokineticModel: build.mutation<
      CreatePharmacokineticModelApiResponse,
      CreatePharmacokineticModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacokinetic/`,
        method: "POST",
        body: queryArg.pharmacokinetic,
      }),
    }),
    retrievePharmacokineticModel: build.query<
      RetrievePharmacokineticModelApiResponse,
      RetrievePharmacokineticModelApiArg
    >({
      query: (queryArg) => ({ url: `/api/pharmacokinetic/${queryArg.id}/` }),
    }),
    updatePharmacokineticModel: build.mutation<
      UpdatePharmacokineticModelApiResponse,
      UpdatePharmacokineticModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacokinetic/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.pharmacokinetic,
      }),
    }),
    partialUpdatePharmacokineticModel: build.mutation<
      PartialUpdatePharmacokineticModelApiResponse,
      PartialUpdatePharmacokineticModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacokinetic/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.pharmacokinetic,
      }),
    }),
    destroyPharmacokineticModel: build.mutation<
      DestroyPharmacokineticModelApiResponse,
      DestroyPharmacokineticModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacokinetic/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listPharmacodynamicModels: build.query<
      ListPharmacodynamicModelsApiResponse,
      ListPharmacodynamicModelsApiArg
    >({
      query: () => ({ url: `/api/pharmacodynamic/` }),
    }),
    createPharmacodynamicModel: build.mutation<
      CreatePharmacodynamicModelApiResponse,
      CreatePharmacodynamicModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/`,
        method: "POST",
        body: queryArg.pharmacodynamic,
      }),
    }),
    retrievePharmacodynamicModel: build.query<
      RetrievePharmacodynamicModelApiResponse,
      RetrievePharmacodynamicModelApiArg
    >({
      query: (queryArg) => ({ url: `/api/pharmacodynamic/${queryArg.id}/` }),
    }),
    updatePharmacodynamicModel: build.mutation<
      UpdatePharmacodynamicModelApiResponse,
      UpdatePharmacodynamicModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.pharmacodynamic,
      }),
    }),
    partialUpdatePharmacodynamicModel: build.mutation<
      PartialUpdatePharmacodynamicModelApiResponse,
      PartialUpdatePharmacodynamicModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.pharmacodynamic,
      }),
    }),
    destroyPharmacodynamicModel: build.mutation<
      DestroyPharmacodynamicModelApiResponse,
      DestroyPharmacodynamicModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listDosedPharmacokineticModels: build.query<
      ListDosedPharmacokineticModelsApiResponse,
      ListDosedPharmacokineticModelsApiArg
    >({
      query: () => ({ url: `/api/dosed_pharmacokinetic/` }),
    }),
    createDosedPharmacokineticModel: build.mutation<
      CreateDosedPharmacokineticModelApiResponse,
      CreateDosedPharmacokineticModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dosed_pharmacokinetic/`,
        method: "POST",
        body: queryArg.dosedPharmacokinetic,
      }),
    }),
    retrieveDosedPharmacokineticModel: build.query<
      RetrieveDosedPharmacokineticModelApiResponse,
      RetrieveDosedPharmacokineticModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dosed_pharmacokinetic/${queryArg.id}/`,
      }),
    }),
    updateDosedPharmacokineticModel: build.mutation<
      UpdateDosedPharmacokineticModelApiResponse,
      UpdateDosedPharmacokineticModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dosed_pharmacokinetic/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.dosedPharmacokinetic,
      }),
    }),
    partialUpdateDosedPharmacokineticModel: build.mutation<
      PartialUpdateDosedPharmacokineticModelApiResponse,
      PartialUpdateDosedPharmacokineticModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dosed_pharmacokinetic/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.dosedPharmacokinetic,
      }),
    }),
    destroyDosedPharmacokineticModel: build.mutation<
      DestroyDosedPharmacokineticModelApiResponse,
      DestroyDosedPharmacokineticModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dosed_pharmacokinetic/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listInferences: build.query<
      ListInferencesApiResponse,
      ListInferencesApiArg
    >({
      query: () => ({ url: `/api/inference/` }),
    }),
    createInference: build.mutation<
      CreateInferenceApiResponse,
      CreateInferenceApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference/`,
        method: "POST",
        body: queryArg.inference,
      }),
    }),
    retrieveInference: build.query<
      RetrieveInferenceApiResponse,
      RetrieveInferenceApiArg
    >({
      query: (queryArg) => ({ url: `/api/inference/${queryArg.id}/` }),
    }),
    updateInference: build.mutation<
      UpdateInferenceApiResponse,
      UpdateInferenceApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.inference,
      }),
    }),
    partialUpdateInference: build.mutation<
      PartialUpdateInferenceApiResponse,
      PartialUpdateInferenceApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.inference,
      }),
    }),
    destroyInference: build.mutation<
      DestroyInferenceApiResponse,
      DestroyInferenceApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listAlgorithms: build.query<
      ListAlgorithmsApiResponse,
      ListAlgorithmsApiArg
    >({
      query: () => ({ url: `/api/algorithm/` }),
    }),
    createAlgorithm: build.mutation<
      CreateAlgorithmApiResponse,
      CreateAlgorithmApiArg
    >({
      query: (queryArg) => ({
        url: `/api/algorithm/`,
        method: "POST",
        body: queryArg.algorithm,
      }),
    }),
    retrieveAlgorithm: build.query<
      RetrieveAlgorithmApiResponse,
      RetrieveAlgorithmApiArg
    >({
      query: (queryArg) => ({ url: `/api/algorithm/${queryArg.id}/` }),
    }),
    updateAlgorithm: build.mutation<
      UpdateAlgorithmApiResponse,
      UpdateAlgorithmApiArg
    >({
      query: (queryArg) => ({
        url: `/api/algorithm/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.algorithm,
      }),
    }),
    partialUpdateAlgorithm: build.mutation<
      PartialUpdateAlgorithmApiResponse,
      PartialUpdateAlgorithmApiArg
    >({
      query: (queryArg) => ({
        url: `/api/algorithm/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.algorithm,
      }),
    }),
    destroyAlgorithm: build.mutation<
      DestroyAlgorithmApiResponse,
      DestroyAlgorithmApiArg
    >({
      query: (queryArg) => ({
        url: `/api/algorithm/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listInferenceChains: build.query<
      ListInferenceChainsApiResponse,
      ListInferenceChainsApiArg
    >({
      query: () => ({ url: `/api/inference_chain/` }),
    }),
    createInferenceChain: build.mutation<
      CreateInferenceChainApiResponse,
      CreateInferenceChainApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference_chain/`,
        method: "POST",
        body: queryArg.inferenceChain,
      }),
    }),
    retrieveInferenceChain: build.query<
      RetrieveInferenceChainApiResponse,
      RetrieveInferenceChainApiArg
    >({
      query: (queryArg) => ({ url: `/api/inference_chain/${queryArg.id}/` }),
    }),
    updateInferenceChain: build.mutation<
      UpdateInferenceChainApiResponse,
      UpdateInferenceChainApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference_chain/${queryArg.id}/`,
        method: "PUT",
        body: queryArg.inferenceChain,
      }),
    }),
    partialUpdateInferenceChain: build.mutation<
      PartialUpdateInferenceChainApiResponse,
      PartialUpdateInferenceChainApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference_chain/${queryArg.id}/`,
        method: "PATCH",
        body: queryArg.inferenceChain,
      }),
    }),
    destroyInferenceChain: build.mutation<
      DestroyInferenceChainApiResponse,
      DestroyInferenceChainApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference_chain/${queryArg.id}/`,
        method: "DELETE",
      }),
    }),
    listSessions: build.query<ListSessionsApiResponse, ListSessionsApiArg>({
      query: () => ({ url: `/api/session/` }),
    }),
    listWhoAmIs: build.query<ListWhoAmIsApiResponse, ListWhoAmIsApiArg>({
      query: () => ({ url: `/api/whoami/` }),
    }),
    createNca: build.mutation<CreateNcaApiResponse, CreateNcaApiArg>({
      query: (queryArg) => ({
        url: `/api/nca/`,
        method: "POST",
        body: queryArg.body,
      }),
    }),
    createAuce: build.mutation<CreateAuceApiResponse, CreateAuceApiArg>({
      query: (queryArg) => ({
        url: `/api/auce/`,
        method: "POST",
        body: queryArg.body,
      }),
    }),
    createSimulatePk: build.mutation<
      CreateSimulatePkApiResponse,
      CreateSimulatePkApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dosed_pharmacokinetic/${queryArg.id}/simulate`,
        method: "POST",
        body: queryArg.body,
      }),
    }),
    createInferenceWizard: build.mutation<
      CreateInferenceWizardApiResponse,
      CreateInferenceWizardApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference/wizard`,
        method: "POST",
        body: queryArg.body,
      }),
    }),
    createStopInference: build.mutation<
      CreateStopInferenceApiResponse,
      CreateStopInferenceApiArg
    >({
      query: (queryArg) => ({
        url: `/api/inference/${queryArg.id}/stop`,
        method: "POST",
        body: queryArg.body,
      }),
    }),
    createSimulatePd: build.mutation<
      CreateSimulatePdApiResponse,
      CreateSimulatePdApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/${queryArg.id}/simulate`,
        method: "POST",
        body: queryArg.body,
      }),
    }),
    csvDataset: build.mutation<CsvDatasetApiResponse, CsvDatasetApiArg>({
      query: (queryArg) => ({
        url: `/api/dataset/${queryArg.id}/csv/`,
        method: "PUT",
        body: queryArg.datasetCsv,
      }),
    }),
    monolixProject: build.mutation<
      MonolixProjectApiResponse,
      MonolixProjectApiArg
    >({
      query: (queryArg) => ({
        url: `/api/project/${queryArg.id}/monolix/`,
        method: "PUT",
        body: queryArg.monolix,
      }),
    }),
    mmtPharmacodynamicModel: build.mutation<
      MmtPharmacodynamicModelApiResponse,
      MmtPharmacodynamicModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/${queryArg.id}/mmt/`,
        method: "PUT",
        body: queryArg.pharmacodynamic,
      }),
    }),
    sbmlPharmacodynamicModel: build.mutation<
      SbmlPharmacodynamicModelApiResponse,
      SbmlPharmacodynamicModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/${queryArg.id}/sbml/`,
        method: "PUT",
        body: queryArg.pharmacodynamicSbml,
      }),
    }),
    setVariablesFromInferencePharmacodynamicModel: build.mutation<
      SetVariablesFromInferencePharmacodynamicModelApiResponse,
      SetVariablesFromInferencePharmacodynamicModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/pharmacodynamic/${queryArg.id}/set_variables_from_inference/`,
        method: "PUT",
        body: queryArg.pharmacodynamic,
      }),
    }),
    setVariablesFromInferenceDosedPharmacokineticModel: build.mutation<
      SetVariablesFromInferenceDosedPharmacokineticModelApiResponse,
      SetVariablesFromInferenceDosedPharmacokineticModelApiArg
    >({
      query: (queryArg) => ({
        url: `/api/dosed_pharmacokinetic/${queryArg.id}/set_variables_from_inference/`,
        method: "PUT",
        body: queryArg.dosedPharmacokinetic,
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as backendApi };
export type ListDatasetsApiResponse = /** status 200  */ Dataset[];
export type ListDatasetsApiArg = void;
export type CreateDatasetApiResponse = /** status 201  */ Dataset;
export type CreateDatasetApiArg = {
  dataset: Dataset;
};
export type RetrieveDatasetApiResponse = /** status 200  */ Dataset;
export type RetrieveDatasetApiArg = {
  /** A unique integer value identifying this dataset. */
  id: string;
};
export type UpdateDatasetApiResponse = /** status 200  */ Dataset;
export type UpdateDatasetApiArg = {
  /** A unique integer value identifying this dataset. */
  id: string;
  dataset: Dataset;
};
export type PartialUpdateDatasetApiResponse = /** status 200  */ Dataset;
export type PartialUpdateDatasetApiArg = {
  /** A unique integer value identifying this dataset. */
  id: string;
  dataset: Dataset;
};
export type DestroyDatasetApiResponse = unknown;
export type DestroyDatasetApiArg = {
  /** A unique integer value identifying this dataset. */
  id: string;
};
export type ListUsersApiResponse = /** status 200  */ User[];
export type ListUsersApiArg = void;
export type CreateUserApiResponse = /** status 201  */ User;
export type CreateUserApiArg = {
  user: User;
};
export type RetrieveUserApiResponse = /** status 200  */ User;
export type RetrieveUserApiArg = {
  /** A unique integer value identifying this user. */
  id: string;
};
export type UpdateUserApiResponse = /** status 200  */ User;
export type UpdateUserApiArg = {
  /** A unique integer value identifying this user. */
  id: string;
  user: User;
};
export type PartialUpdateUserApiResponse = /** status 200  */ User;
export type PartialUpdateUserApiArg = {
  /** A unique integer value identifying this user. */
  id: string;
  user: User;
};
export type DestroyUserApiResponse = unknown;
export type DestroyUserApiArg = {
  /** A unique integer value identifying this user. */
  id: string;
};
export type ListSubjectsApiResponse = /** status 200  */ Subject[];
export type ListSubjectsApiArg = void;
export type CreateSubjectApiResponse = /** status 201  */ Subject;
export type CreateSubjectApiArg = {
  subject: Subject;
};
export type RetrieveSubjectApiResponse = /** status 200  */ Subject;
export type RetrieveSubjectApiArg = {
  /** A unique integer value identifying this subject. */
  id: string;
};
export type UpdateSubjectApiResponse = /** status 200  */ Subject;
export type UpdateSubjectApiArg = {
  /** A unique integer value identifying this subject. */
  id: string;
  subject: Subject;
};
export type PartialUpdateSubjectApiResponse = /** status 200  */ Subject;
export type PartialUpdateSubjectApiArg = {
  /** A unique integer value identifying this subject. */
  id: string;
  subject: Subject;
};
export type DestroySubjectApiResponse = unknown;
export type DestroySubjectApiArg = {
  /** A unique integer value identifying this subject. */
  id: string;
};
export type ListProjectsApiResponse = /** status 200  */ Project[];
export type ListProjectsApiArg = void;
export type CreateProjectApiResponse = /** status 201  */ Project;
export type CreateProjectApiArg = {
  project: Project;
};
export type RetrieveProjectApiResponse = /** status 200  */ Project;
export type RetrieveProjectApiArg = {
  /** A unique integer value identifying this project. */
  id: string;
};
export type UpdateProjectApiResponse = /** status 200  */ Project;
export type UpdateProjectApiArg = {
  /** A unique integer value identifying this project. */
  id: string;
  project: Project;
};
export type PartialUpdateProjectApiResponse = /** status 200  */ Project;
export type PartialUpdateProjectApiArg = {
  /** A unique integer value identifying this project. */
  id: string;
  project: Project;
};
export type DestroyProjectApiResponse = unknown;
export type DestroyProjectApiArg = {
  /** A unique integer value identifying this project. */
  id: string;
};
export type ListProjectAccessApiResponse = /** status 200  */ ProjectAccess[];
export type ListProjectAccessApiArg = void;
export type CreateProjectAccessApiResponse = /** status 201  */ ProjectAccess;
export type CreateProjectAccessApiArg = {
  projectAccess: ProjectAccess;
};
export type RetrieveProjectAccessApiResponse = /** status 200  */ ProjectAccess;
export type RetrieveProjectAccessApiArg = {
  /** A unique integer value identifying this project access. */
  id: string;
};
export type UpdateProjectAccessApiResponse = /** status 200  */ ProjectAccess;
export type UpdateProjectAccessApiArg = {
  /** A unique integer value identifying this project access. */
  id: string;
  projectAccess: ProjectAccess;
};
export type PartialUpdateProjectAccessApiResponse =
  /** status 200  */ ProjectAccess;
export type PartialUpdateProjectAccessApiArg = {
  /** A unique integer value identifying this project access. */
  id: string;
  projectAccess: ProjectAccess;
};
export type DestroyProjectAccessApiResponse = unknown;
export type DestroyProjectAccessApiArg = {
  /** A unique integer value identifying this project access. */
  id: string;
};
export type ListDosesApiResponse = /** status 200  */ Dose[];
export type ListDosesApiArg = void;
export type CreateDoseApiResponse = /** status 201  */ Dose;
export type CreateDoseApiArg = {
  dose: Dose;
};
export type RetrieveDoseApiResponse = /** status 200  */ Dose;
export type RetrieveDoseApiArg = {
  /** A unique integer value identifying this dose. */
  id: string;
};
export type UpdateDoseApiResponse = /** status 200  */ Dose;
export type UpdateDoseApiArg = {
  /** A unique integer value identifying this dose. */
  id: string;
  dose: Dose;
};
export type PartialUpdateDoseApiResponse = /** status 200  */ Dose;
export type PartialUpdateDoseApiArg = {
  /** A unique integer value identifying this dose. */
  id: string;
  dose: Dose;
};
export type DestroyDoseApiResponse = unknown;
export type DestroyDoseApiArg = {
  /** A unique integer value identifying this dose. */
  id: string;
};
export type ListUnitsApiResponse = /** status 200  */ Unit[];
export type ListUnitsApiArg = void;
export type CreateUnitApiResponse = /** status 201  */ Unit;
export type CreateUnitApiArg = {
  unit: Unit;
};
export type RetrieveUnitApiResponse = /** status 200  */ Unit;
export type RetrieveUnitApiArg = {
  /** A unique integer value identifying this unit. */
  id: string;
};
export type UpdateUnitApiResponse = /** status 200  */ Unit;
export type UpdateUnitApiArg = {
  /** A unique integer value identifying this unit. */
  id: string;
  unit: Unit;
};
export type PartialUpdateUnitApiResponse = /** status 200  */ Unit;
export type PartialUpdateUnitApiArg = {
  /** A unique integer value identifying this unit. */
  id: string;
  unit: Unit;
};
export type DestroyUnitApiResponse = unknown;
export type DestroyUnitApiArg = {
  /** A unique integer value identifying this unit. */
  id: string;
};
export type ListVariablesApiResponse = /** status 200  */ Variable[];
export type ListVariablesApiArg = void;
export type CreateVariableApiResponse = /** status 201  */ Variable;
export type CreateVariableApiArg = {
  variable: Variable;
};
export type RetrieveVariableApiResponse = /** status 200  */ Variable;
export type RetrieveVariableApiArg = {
  /** A unique integer value identifying this variable. */
  id: string;
};
export type UpdateVariableApiResponse = /** status 200  */ Variable;
export type UpdateVariableApiArg = {
  /** A unique integer value identifying this variable. */
  id: string;
  variable: Variable;
};
export type PartialUpdateVariableApiResponse = /** status 200  */ Variable;
export type PartialUpdateVariableApiArg = {
  /** A unique integer value identifying this variable. */
  id: string;
  variable: Variable;
};
export type DestroyVariableApiResponse = unknown;
export type DestroyVariableApiArg = {
  /** A unique integer value identifying this variable. */
  id: string;
};
export type ListProtocolsApiResponse = /** status 200  */ Protocol[];
export type ListProtocolsApiArg = void;
export type CreateProtocolApiResponse = /** status 201  */ Protocol;
export type CreateProtocolApiArg = {
  protocol: Protocol;
};
export type RetrieveProtocolApiResponse = /** status 200  */ Protocol;
export type RetrieveProtocolApiArg = {
  /** A unique integer value identifying this protocol. */
  id: string;
};
export type UpdateProtocolApiResponse = /** status 200  */ Protocol;
export type UpdateProtocolApiArg = {
  /** A unique integer value identifying this protocol. */
  id: string;
  protocol: Protocol;
};
export type PartialUpdateProtocolApiResponse = /** status 200  */ Protocol;
export type PartialUpdateProtocolApiArg = {
  /** A unique integer value identifying this protocol. */
  id: string;
  protocol: Protocol;
};
export type DestroyProtocolApiResponse = unknown;
export type DestroyProtocolApiArg = {
  /** A unique integer value identifying this protocol. */
  id: string;
};
export type ListBiomarkerTypesApiResponse = /** status 200  */ BiomarkerType[];
export type ListBiomarkerTypesApiArg = void;
export type CreateBiomarkerTypeApiResponse = /** status 201  */ BiomarkerType;
export type CreateBiomarkerTypeApiArg = {
  biomarkerType: BiomarkerType;
};
export type RetrieveBiomarkerTypeApiResponse = /** status 200  */ BiomarkerType;
export type RetrieveBiomarkerTypeApiArg = {
  /** A unique integer value identifying this biomarker type. */
  id: string;
};
export type UpdateBiomarkerTypeApiResponse = /** status 200  */ BiomarkerType;
export type UpdateBiomarkerTypeApiArg = {
  /** A unique integer value identifying this biomarker type. */
  id: string;
  biomarkerType: BiomarkerType;
};
export type PartialUpdateBiomarkerTypeApiResponse =
  /** status 200  */ BiomarkerType;
export type PartialUpdateBiomarkerTypeApiArg = {
  /** A unique integer value identifying this biomarker type. */
  id: string;
  biomarkerType: BiomarkerType;
};
export type DestroyBiomarkerTypeApiResponse = unknown;
export type DestroyBiomarkerTypeApiArg = {
  /** A unique integer value identifying this biomarker type. */
  id: string;
};
export type ListPharmacokineticModelsApiResponse =
  /** status 200  */ Pharmacokinetic[];
export type ListPharmacokineticModelsApiArg = void;
export type CreatePharmacokineticModelApiResponse =
  /** status 201  */ Pharmacokinetic;
export type CreatePharmacokineticModelApiArg = {
  pharmacokinetic: Pharmacokinetic;
};
export type RetrievePharmacokineticModelApiResponse =
  /** status 200  */ Pharmacokinetic;
export type RetrievePharmacokineticModelApiArg = {
  /** A unique integer value identifying this pharmacokinetic model. */
  id: string;
};
export type UpdatePharmacokineticModelApiResponse =
  /** status 200  */ Pharmacokinetic;
export type UpdatePharmacokineticModelApiArg = {
  /** A unique integer value identifying this pharmacokinetic model. */
  id: string;
  pharmacokinetic: Pharmacokinetic;
};
export type PartialUpdatePharmacokineticModelApiResponse =
  /** status 200  */ Pharmacokinetic;
export type PartialUpdatePharmacokineticModelApiArg = {
  /** A unique integer value identifying this pharmacokinetic model. */
  id: string;
  pharmacokinetic: Pharmacokinetic;
};
export type DestroyPharmacokineticModelApiResponse = unknown;
export type DestroyPharmacokineticModelApiArg = {
  /** A unique integer value identifying this pharmacokinetic model. */
  id: string;
};
export type ListPharmacodynamicModelsApiResponse =
  /** status 200  */ Pharmacodynamic[];
export type ListPharmacodynamicModelsApiArg = void;
export type CreatePharmacodynamicModelApiResponse =
  /** status 201  */ Pharmacodynamic;
export type CreatePharmacodynamicModelApiArg = {
  pharmacodynamic: Pharmacodynamic;
};
export type RetrievePharmacodynamicModelApiResponse =
  /** status 200  */ Pharmacodynamic;
export type RetrievePharmacodynamicModelApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: string;
};
export type UpdatePharmacodynamicModelApiResponse =
  /** status 200  */ Pharmacodynamic;
export type UpdatePharmacodynamicModelApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: string;
  pharmacodynamic: Pharmacodynamic;
};
export type PartialUpdatePharmacodynamicModelApiResponse =
  /** status 200  */ Pharmacodynamic;
export type PartialUpdatePharmacodynamicModelApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: string;
  pharmacodynamic: Pharmacodynamic;
};
export type DestroyPharmacodynamicModelApiResponse = unknown;
export type DestroyPharmacodynamicModelApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: string;
};
export type ListDosedPharmacokineticModelsApiResponse =
  /** status 200  */ DosedPharmacokinetic[];
export type ListDosedPharmacokineticModelsApiArg = void;
export type CreateDosedPharmacokineticModelApiResponse =
  /** status 201  */ DosedPharmacokinetic;
export type CreateDosedPharmacokineticModelApiArg = {
  dosedPharmacokinetic: DosedPharmacokinetic;
};
export type RetrieveDosedPharmacokineticModelApiResponse =
  /** status 200  */ DosedPharmacokinetic;
export type RetrieveDosedPharmacokineticModelApiArg = {
  /** A unique integer value identifying this dosed pharmacokinetic model. */
  id: string;
};
export type UpdateDosedPharmacokineticModelApiResponse =
  /** status 200  */ DosedPharmacokinetic;
export type UpdateDosedPharmacokineticModelApiArg = {
  /** A unique integer value identifying this dosed pharmacokinetic model. */
  id: string;
  dosedPharmacokinetic: DosedPharmacokinetic;
};
export type PartialUpdateDosedPharmacokineticModelApiResponse =
  /** status 200  */ DosedPharmacokinetic;
export type PartialUpdateDosedPharmacokineticModelApiArg = {
  /** A unique integer value identifying this dosed pharmacokinetic model. */
  id: string;
  dosedPharmacokinetic: DosedPharmacokinetic;
};
export type DestroyDosedPharmacokineticModelApiResponse = unknown;
export type DestroyDosedPharmacokineticModelApiArg = {
  /** A unique integer value identifying this dosed pharmacokinetic model. */
  id: string;
};
export type ListInferencesApiResponse = /** status 200  */ Inference[];
export type ListInferencesApiArg = void;
export type CreateInferenceApiResponse = /** status 201  */ Inference;
export type CreateInferenceApiArg = {
  inference: Inference;
};
export type RetrieveInferenceApiResponse = /** status 200  */ Inference;
export type RetrieveInferenceApiArg = {
  /** A unique integer value identifying this inference. */
  id: string;
};
export type UpdateInferenceApiResponse = /** status 200  */ Inference;
export type UpdateInferenceApiArg = {
  /** A unique integer value identifying this inference. */
  id: string;
  inference: Inference;
};
export type PartialUpdateInferenceApiResponse = /** status 200  */ Inference;
export type PartialUpdateInferenceApiArg = {
  /** A unique integer value identifying this inference. */
  id: string;
  inference: Inference;
};
export type DestroyInferenceApiResponse = unknown;
export type DestroyInferenceApiArg = {
  /** A unique integer value identifying this inference. */
  id: string;
};
export type ListAlgorithmsApiResponse = /** status 200  */ Algorithm[];
export type ListAlgorithmsApiArg = void;
export type CreateAlgorithmApiResponse = /** status 201  */ Algorithm;
export type CreateAlgorithmApiArg = {
  algorithm: Algorithm;
};
export type RetrieveAlgorithmApiResponse = /** status 200  */ Algorithm;
export type RetrieveAlgorithmApiArg = {
  /** A unique integer value identifying this algorithm. */
  id: string;
};
export type UpdateAlgorithmApiResponse = /** status 200  */ Algorithm;
export type UpdateAlgorithmApiArg = {
  /** A unique integer value identifying this algorithm. */
  id: string;
  algorithm: Algorithm;
};
export type PartialUpdateAlgorithmApiResponse = /** status 200  */ Algorithm;
export type PartialUpdateAlgorithmApiArg = {
  /** A unique integer value identifying this algorithm. */
  id: string;
  algorithm: Algorithm;
};
export type DestroyAlgorithmApiResponse = unknown;
export type DestroyAlgorithmApiArg = {
  /** A unique integer value identifying this algorithm. */
  id: string;
};
export type ListInferenceChainsApiResponse =
  /** status 200  */ InferenceChain[];
export type ListInferenceChainsApiArg = void;
export type CreateInferenceChainApiResponse = /** status 201  */ InferenceChain;
export type CreateInferenceChainApiArg = {
  inferenceChain: InferenceChain;
};
export type RetrieveInferenceChainApiResponse =
  /** status 200  */ InferenceChain;
export type RetrieveInferenceChainApiArg = {
  /** A unique integer value identifying this inference chain. */
  id: string;
};
export type UpdateInferenceChainApiResponse = /** status 200  */ InferenceChain;
export type UpdateInferenceChainApiArg = {
  /** A unique integer value identifying this inference chain. */
  id: string;
  inferenceChain: InferenceChain;
};
export type PartialUpdateInferenceChainApiResponse =
  /** status 200  */ InferenceChain;
export type PartialUpdateInferenceChainApiArg = {
  /** A unique integer value identifying this inference chain. */
  id: string;
  inferenceChain: InferenceChain;
};
export type DestroyInferenceChainApiResponse = unknown;
export type DestroyInferenceChainApiArg = {
  /** A unique integer value identifying this inference chain. */
  id: string;
};
export type ListSessionsApiResponse = /** status 200  */ any[];
export type ListSessionsApiArg = void;
export type ListWhoAmIsApiResponse = /** status 200  */ any[];
export type ListWhoAmIsApiArg = void;
export type CreateNcaApiResponse = /** status 201  */ any;
export type CreateNcaApiArg = {
  body: any;
};
export type CreateAuceApiResponse = /** status 201  */ any;
export type CreateAuceApiArg = {
  body: any;
};
export type CreateSimulatePkApiResponse = /** status 201  */ any;
export type CreateSimulatePkApiArg = {
  id: string;
  body: any;
};
export type CreateInferenceWizardApiResponse = /** status 201  */ any;
export type CreateInferenceWizardApiArg = {
  body: any;
};
export type CreateStopInferenceApiResponse = /** status 201  */ any;
export type CreateStopInferenceApiArg = {
  id: string;
  body: any;
};
export type CreateSimulatePdApiResponse = /** status 201  */ any;
export type CreateSimulatePdApiArg = {
  id: string;
  body: any;
};
export type CsvDatasetApiResponse = /** status 200  */ DatasetCsv;
export type CsvDatasetApiArg = {
  /** A unique integer value identifying this dataset. */
  id: string;
  datasetCsv: DatasetCsv;
};
export type MonolixProjectApiResponse = /** status 200  */ Monolix;
export type MonolixProjectApiArg = {
  /** A unique integer value identifying this project. */
  id: string;
  monolix: Monolix;
};
export type MmtPharmacodynamicModelApiResponse =
  /** status 200  */ Pharmacodynamic;
export type MmtPharmacodynamicModelApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: string;
  pharmacodynamic: Pharmacodynamic;
};
export type SbmlPharmacodynamicModelApiResponse =
  /** status 200  */ PharmacodynamicSbml;
export type SbmlPharmacodynamicModelApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: string;
  pharmacodynamicSbml: PharmacodynamicSbml;
};
export type SetVariablesFromInferencePharmacodynamicModelApiResponse =
  /** status 200  */ Pharmacodynamic;
export type SetVariablesFromInferencePharmacodynamicModelApiArg = {
  /** A unique integer value identifying this pharmacodynamic model. */
  id: string;
  pharmacodynamic: Pharmacodynamic;
};
export type SetVariablesFromInferenceDosedPharmacokineticModelApiResponse =
  /** status 200  */ DosedPharmacokinetic;
export type SetVariablesFromInferenceDosedPharmacokineticModelApiArg = {
  /** A unique integer value identifying this dosed pharmacokinetic model. */
  id: string;
  dosedPharmacokinetic: DosedPharmacokinetic;
};
export type Dataset = {
  id?: number;
  biomarker_types?: string[];
  subjects?: string[];
  protocols?: string;
  name: string;
  datetime?: string | null;
  description?: string;
  project?: number | null;
};
export type User = {
  id?: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  profile?: {
    id?: number;
    user: number;
  };
  project_set?: string[];
};
export type Subject = {
  id?: number;
  id_in_dataset: number;
  shape?: number;
  display?: boolean;
  metadata?: string;
  dataset: number;
  protocol?: number | null;
};
export type Project = {
  id?: number;
  user_access: {
    id?: number;
    read_only?: boolean;
    user: number;
    project?: string;
  }[];
  name: string;
  description?: string;
  users?: string[];
};
export type ProjectAccess = {
  id?: number;
  read_only?: boolean;
  user: number;
  project?: string;
};
export type Dose = {
  id?: number;
  start_time: number;
  amount: number;
  duration?: number;
  read_only?: boolean;
  datetime?: string | null;
  protocol: number;
};
export type Unit = {
  id?: number;
  compatible_units?: string;
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
export type Variable = {
  id?: number;
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
  unit?: number | null;
  pd_model?: number | null;
  pk_model?: number | null;
  dosed_pk_model?: number | null;
};
export type Protocol = {
  id?: number;
  doses?: {
    id?: number;
    start_time: number;
    amount: number;
    duration?: number;
    read_only?: boolean;
    datetime?: string | null;
    protocol: number;
  }[];
  dose_ids: string[];
  dosed_pk_models?: string[];
  dataset?: string;
  subjects?: string[];
  read_only?: boolean;
  datetime?: string | null;
  name: string;
  dose_type?: "D" | "I";
  project?: number | null;
  compound?: number | null;
  time_unit?: number | null;
  amount_unit?: number | null;
};
export type BiomarkerType = {
  id?: number;
  data?: string;
  is_continuous?: string;
  is_categorical?: string;
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
export type Pharmacokinetic = {
  id?: number;
  read_only?: boolean;
  datetime?: string | null;
  name: string;
  description?: string;
  mmt?: string;
  time_max?: number;
};
export type Pharmacodynamic = {
  id?: number;
  components?: string;
  variables?: string[];
  mmt?: string;
  read_only?: boolean;
  datetime?: string | null;
  name: string;
  description?: string;
  time_max?: number;
  project?: number | null;
};
export type DosedPharmacokinetic = {
  id?: number;
  mappings: {
    id?: number;
    datetime?: string;
    read_only?: boolean;
    pkpd_model: number;
    pk_variable: number;
    pd_variable: number;
  }[];
  components?: string;
  variables?: string[];
  mmt?: string;
  read_only?: boolean;
  datetime?: string | null;
  name: string;
  dose_compartment?: string | null;
  time_max?: number;
  project?: number | null;
  pk_model?: number | null;
  pd_model?: number | null;
  protocol?: number | null;
};
export type Inference = {
  id?: number;
  log_likelihoods: {
    id?: number;
    parameters: {
      id?: number;
      name: string;
      parent_index?: number | null;
      child_index?: number;
      length?: number | null;
      parent?: string;
      child: number;
      variable?: number | null;
    }[];
    model?: string;
    dataset?: string;
    time_variable?: string;
    is_a_prior?: string;
    name: string;
    description?: string | null;
    value?: number | null;
    time_independent_data?: boolean;
    observed?: boolean;
    form?: "N" | "U" | "LN" | "F" | "S" | "E" | "M";
    inference?: string;
    variable?: number | null;
    biomarker_type?: number | null;
    protocol_filter?: number | null;
    children?: string[];
  }[];
  read_only?: boolean;
  datetime?: string | null;
  name: string;
  description?: string;
  initialization_strategy?: "D" | "R" | "F";
  number_of_chains?: number;
  max_number_of_iterations?: number;
  burn_in?: number;
  number_of_iterations?: number;
  time_elapsed?: number;
  number_of_function_evals?: number;
  task_id?: string | null;
  metadata?: object;
  project: number;
  algorithm?: number;
  initialization_inference?: number | null;
};
export type Algorithm = {
  id?: number;
  name: string;
  category: "SA" | "OP" | "OT";
};
export type InferenceChain = {
  id?: number;
  data?: string;
  outputs?: string;
  inference: number;
};
export type DatasetCsv = {
  csv: Blob;
};
export type Monolix = {
  data_csv: Blob;
  model_txt: Blob;
  project_mlxtran: Blob;
  data?: string;
  pd_model?: string;
  pk_model?: string;
};
export type PharmacodynamicSbml = {
  sbml: string;
};
export const {
  useListDatasetsQuery,
  useCreateDatasetMutation,
  useRetrieveDatasetQuery,
  useUpdateDatasetMutation,
  usePartialUpdateDatasetMutation,
  useDestroyDatasetMutation,
  useListUsersQuery,
  useCreateUserMutation,
  useRetrieveUserQuery,
  useUpdateUserMutation,
  usePartialUpdateUserMutation,
  useDestroyUserMutation,
  useListSubjectsQuery,
  useCreateSubjectMutation,
  useRetrieveSubjectQuery,
  useUpdateSubjectMutation,
  usePartialUpdateSubjectMutation,
  useDestroySubjectMutation,
  useListProjectsQuery,
  useCreateProjectMutation,
  useRetrieveProjectQuery,
  useUpdateProjectMutation,
  usePartialUpdateProjectMutation,
  useDestroyProjectMutation,
  useListProjectAccessQuery,
  useCreateProjectAccessMutation,
  useRetrieveProjectAccessQuery,
  useUpdateProjectAccessMutation,
  usePartialUpdateProjectAccessMutation,
  useDestroyProjectAccessMutation,
  useListDosesQuery,
  useCreateDoseMutation,
  useRetrieveDoseQuery,
  useUpdateDoseMutation,
  usePartialUpdateDoseMutation,
  useDestroyDoseMutation,
  useListUnitsQuery,
  useCreateUnitMutation,
  useRetrieveUnitQuery,
  useUpdateUnitMutation,
  usePartialUpdateUnitMutation,
  useDestroyUnitMutation,
  useListVariablesQuery,
  useCreateVariableMutation,
  useRetrieveVariableQuery,
  useUpdateVariableMutation,
  usePartialUpdateVariableMutation,
  useDestroyVariableMutation,
  useListProtocolsQuery,
  useCreateProtocolMutation,
  useRetrieveProtocolQuery,
  useUpdateProtocolMutation,
  usePartialUpdateProtocolMutation,
  useDestroyProtocolMutation,
  useListBiomarkerTypesQuery,
  useCreateBiomarkerTypeMutation,
  useRetrieveBiomarkerTypeQuery,
  useUpdateBiomarkerTypeMutation,
  usePartialUpdateBiomarkerTypeMutation,
  useDestroyBiomarkerTypeMutation,
  useListPharmacokineticModelsQuery,
  useCreatePharmacokineticModelMutation,
  useRetrievePharmacokineticModelQuery,
  useUpdatePharmacokineticModelMutation,
  usePartialUpdatePharmacokineticModelMutation,
  useDestroyPharmacokineticModelMutation,
  useListPharmacodynamicModelsQuery,
  useCreatePharmacodynamicModelMutation,
  useRetrievePharmacodynamicModelQuery,
  useUpdatePharmacodynamicModelMutation,
  usePartialUpdatePharmacodynamicModelMutation,
  useDestroyPharmacodynamicModelMutation,
  useListDosedPharmacokineticModelsQuery,
  useCreateDosedPharmacokineticModelMutation,
  useRetrieveDosedPharmacokineticModelQuery,
  useUpdateDosedPharmacokineticModelMutation,
  usePartialUpdateDosedPharmacokineticModelMutation,
  useDestroyDosedPharmacokineticModelMutation,
  useListInferencesQuery,
  useCreateInferenceMutation,
  useRetrieveInferenceQuery,
  useUpdateInferenceMutation,
  usePartialUpdateInferenceMutation,
  useDestroyInferenceMutation,
  useListAlgorithmsQuery,
  useCreateAlgorithmMutation,
  useRetrieveAlgorithmQuery,
  useUpdateAlgorithmMutation,
  usePartialUpdateAlgorithmMutation,
  useDestroyAlgorithmMutation,
  useListInferenceChainsQuery,
  useCreateInferenceChainMutation,
  useRetrieveInferenceChainQuery,
  useUpdateInferenceChainMutation,
  usePartialUpdateInferenceChainMutation,
  useDestroyInferenceChainMutation,
  useListSessionsQuery,
  useListWhoAmIsQuery,
  useCreateNcaMutation,
  useCreateAuceMutation,
  useCreateSimulatePkMutation,
  useCreateInferenceWizardMutation,
  useCreateStopInferenceMutation,
  useCreateSimulatePdMutation,
  useCsvDatasetMutation,
  useMonolixProjectMutation,
  useMmtPharmacodynamicModelMutation,
  useSbmlPharmacodynamicModelMutation,
  useSetVariablesFromInferencePharmacodynamicModelMutation,
  useSetVariablesFromInferenceDosedPharmacokineticModelMutation,
} = injectedRtkApi;
