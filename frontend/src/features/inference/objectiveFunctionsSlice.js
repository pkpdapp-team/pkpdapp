import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'

const objectiveFunctionsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = objectiveFunctionsAdapter.getInitialState({
  status: 'idle',
  errorFetch: null,
})


export const fetchObjectiveFunctionsByInference = createAsyncThunk('objectiveFunctions/fetchObjectiveFunctions', async (inference, { dispatch }) => {
  let response = await api.get(
    `/api/objective_function/?inference_id=${inference.id}`
  )
  return response
})

export const fetchObjectiveFunctionById = createAsyncThunk('objectiveFunctions/fetchObjectiveFunctionById', async (objectiveFunctionId, { dispatch }) => {
  let objectiveFunction = await api.get(
    `/api/objective_function/${objectiveFunctionId}/`
  )
  return objectiveFunction
})

export const addNewObjectiveFunction = createAsyncThunk(
  'objectiveFunctions/addNewObjectiveFunction',
  async (project, { dispatch }) => {
    const initialObjectiveFunction = {
      name: 'new',
      project: project.id,
    }
    let objectiveFunction = await api.post(
      '/api/objective_function/', initialObjectiveFunction
    )

    return objectiveFunction
  }
)

export const updateObjectiveFunction = createAsyncThunk(
  'objectiveFunctions/updateObjectiveFunction',
  async (objectiveFunction, { getState }) => {
    const response = await api.put(`/api/objective_function/${objectiveFunction.id}/`, objectiveFunction)
    return response
  }
)

export const deleteObjectiveFunction = createAsyncThunk(
  'objectiveFunctions/deleteObjectiveFunction',
  async (objectiveFunctionId, { dispatch }) => {
    await api.delete(
      `/api/objective_function/${objectiveFunctionId}`
    )
    return objectiveFunctionId
  }
)

export const objectiveFunctionsSlice = createSlice({
  name: 'objectiveFunctions',
  initialState, 
  reducers: {
  },
  extraReducers: {
    [fetchObjectiveFunctionById.fulfilled]: objectiveFunctionsAdapter.upsertOne,
    [fetchObjectiveFunctionsByInference.fulfilled]: objectiveFunctionsAdapter.upsertMany,
    [addNewObjectiveFunction.fulfilled]: objectiveFunctionsAdapter.addOne,
    [updateObjectiveFunction.fulfilled]: objectiveFunctionsAdapter.upsertOne,
    [deleteObjectiveFunction.fulfilled]: objectiveFunctionsAdapter.removeOne,
  }
})

export const { toggleObjectiveFunction } = objectiveFunctionsSlice.actions

export default objectiveFunctionsSlice.reducer

export const {
  selectAll: selectAllObjectiveFunctions,
  selectById: selectObjectiveFunctionById,
  selectIds: selectObjectiveFunctionIds
} = objectiveFunctionsAdapter.getSelectors(state => state.objectiveFunctions)


export const selectObjectiveFunctionsByInference = (state, inference) => selectAllObjectiveFunctions(state).filter(objectiveFunction => objectiveFunction.inference === inference.id);

