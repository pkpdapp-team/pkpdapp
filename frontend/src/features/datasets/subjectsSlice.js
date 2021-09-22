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

export const fetchSubject = createAsyncThunk('subjects/fetchSubject', async (subjectId, { getState }) => {
  console.log('fetchSubject', subjectId)
  const response = await api.get(
    `/api/subject/${subjectId}/`
  )
  return response
})

export const updateSubject = createAsyncThunk(
  'subjects/updateSubject',
  async (subject) => {
    const response = await api.patch(`/api/subject/${subject.id}/`, subject)
    return response
  }
)

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
    [updateSubject.fulfilled]: subjectsAdapter.upsertOne,
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
