import { configureStore } from '@reduxjs/toolkit'
import projectsReducer from '../features/projects/projectsSlice'
import datasetsReducer from '../features/datasets/datasetsSlice'
import pdModelsReducer from '../features/pdModels/pdModelsSlice'
import pkModelsReducer from '../features/pkModels/pkModelsSlice'

export default configureStore({
  reducer: {
    projects: projectsReducer,
    datasets: datasetsReducer,
    pkModels: pkModelsReducer,
    pdModels: pdModelsReducer,
  }
})
