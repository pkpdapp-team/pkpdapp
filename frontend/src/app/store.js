import { configureStore } from '@reduxjs/toolkit'
import projectsReducer from '../features/projects/projectsSlice'
import datasetsReducer from '../features/datasets/datasetsSlice'
import biomarkerDatasReducer from '../features/datasets/biomarkerDatasSlice'
import pdModelsReducer from '../features/pdModels/pdModelsSlice'
import pkModelsReducer from '../features/pkModels/pkModelsSlice'
import basePkModelsReducer from '../features/pkModels/basePkModelsSlice'
import protocolsReducer from '../features/protocols/protocolsSlice'
import usersReducer from '../features/projects/usersSlice'


export default configureStore({
  reducer: {
    projects: projectsReducer,
    datasets: datasetsReducer,
    biomarkerDatas: biomarkerDatasReducer,
    pkModels: pkModelsReducer,
    basePkModels: basePkModelsReducer,
    protocols: protocolsReducer,
    pdModels: pdModelsReducer,
    users: usersReducer,
  },
})
