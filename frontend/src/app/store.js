import { configureStore } from '@reduxjs/toolkit'
import projectsReducer from '../features/projects/projectsSlice'
import datasetsReducer from '../features/datasets/datasetsSlice'
import subjectsReducer from '../features/datasets/subjectsSlice'
import biomarkerDatasReducer from '../features/datasets/biomarkerDatasSlice'
import pdModelsReducer from '../features/pdModels/pdModelsSlice'
import pkModelsReducer from '../features/pkModels/pkModelsSlice'
import basePkModelsReducer from '../features/pkModels/basePkModelsSlice'
import protocolsReducer from '../features/protocols/protocolsSlice'
import usersReducer from '../features/projects/usersSlice'
import unitsReducer from '../features/projects/unitsSlice'
import variablesReducer from '../features/variables/variablesSlice'


export default configureStore({
  reducer: {
    projects: projectsReducer,
    datasets: datasetsReducer,
    biomarkerDatas: biomarkerDatasReducer,
    subjects: subjectsReducer,
    pkModels: pkModelsReducer,
    basePkModels: basePkModelsReducer,
    protocols: protocolsReducer,
    pdModels: pdModelsReducer,
    users: usersReducer,
    units: unitsReducer,
    variables: variablesReducer,
  },
})
