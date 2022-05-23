import { configureStore } from "@reduxjs/toolkit";
import projectsReducer from "../features/projects/projectsSlice";
import datasetsReducer from "../features/datasets/datasetsSlice";
import subjectsReducer from "../features/datasets/subjectsSlice";
import biomarkerTypesReducer from "../features/datasets/biomarkerTypesSlice";
import pdModelsReducer from "../features/pdModels/pdModelsSlice";
import pkModelsReducer from "../features/pkModels/pkModelsSlice";
import pkpdModelsReducer from "../features/pkpdModels/pkpdModelsSlice";
import basePkModelsReducer from "../features/pkModels/basePkModelsSlice";
import protocolsReducer from "../features/protocols/protocolsSlice";
import usersReducer from "../features/projects/usersSlice";
import unitsReducer from "../features/projects/unitsSlice";
import variablesReducer from "../features/variables/variablesSlice";
import inferensesReducer from "../features/inference/inferenceSlice";
import algorithmsReducer from "../features/inference/algorithmsSlice";
import chainsReducer from "../features/inference/chainSlice";

export default configureStore({
  reducer: {
    projects: projectsReducer,
    datasets: datasetsReducer,
    biomarkerTypes: biomarkerTypesReducer,
    subjects: subjectsReducer,
    pkModels: pkModelsReducer,
    pkpdModels: pkpdModelsReducer,
    basePkModels: basePkModelsReducer,
    protocols: protocolsReducer,
    pdModels: pdModelsReducer,
    users: usersReducer,
    units: unitsReducer,
    variables: variablesReducer,
    inferences: inferensesReducer,
    algorithms: algorithmsReducer,
    chains: chainsReducer,
  },
   middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
