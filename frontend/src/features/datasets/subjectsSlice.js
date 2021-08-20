import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'
import { api } from '../../Api'

const subjectsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = subjectsAdapter.getInitialState({
  status: 'idle',
  error: null,
})

export const fetchSubject = createAsyncThunk('subjects/fetchSubject', async (biomarkerTypeId, { getState }) => {
  console.log('fetchSubject', biomarkerTypeId)
  const response = await api.get(
    `/api/biomarker-data/${biomarkerTypeId}/`
  )
  response.display = true
  return response
})

export const subjectsSlice = createSlice({
  name: 'subjects',
  initialState, 
  reducers: {
  },
  extraReducers: {
    [fetchSubject.pending]: (state, action) => {
      state.status = 'loading'
    },
    [fetchSubject.rejected]: (state, action) => {
      state.status = 'failed'
      state.error = action.error.message
    },
    [fetchSubject.fulfilled]: (state, action) => {
      state.status = 'succeeded'
      subjectsAdapter.addOne(state, action.payload)
    },
  }
})

export const { 
  setDisplayGroups: setSubjectDisplayGroups,
  toggleDisplayGroup: toggleSubjectDisplayGroup
} = subjectsSlice.actions

export default subjectsSlice.reducer

export const {
  selectAll: selectAllSubjects,
  selectById: selectSubjectById,
  selectIds: selectSubjectIds
} = subjectsAdapter.getSelectors(state => state.subjects)

export const selectSubjectDisplayGroups = state => {
  return state.subjects.displayGroups;
}
