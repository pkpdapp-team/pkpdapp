import { 
  createSlice, createEntityAdapter, createAsyncThunk,
} from '@reduxjs/toolkit'

import { api } from '../../Api'

const projectsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id
})

const initialState = projectsAdapter.getInitialState({
  status: 'idle',
  selected: null,
  error: null,
})

export const fetchProjects = createAsyncThunk('projects/fetchProjects', async ({ getState }) => {
  const response = await api.get(`/api/project`)
  return response.projects
})

export const addNewProject = createAsyncThunk(
  'projects/addNewProject',
  async () => {
    const initialProject= {
      name: 'new',
      user_ids: [api.loggedInUser().id],
    }
    const response = await api.post('/api/project', initialProject)
    return response.project
  }
)

export const projectsSlice = createSlice({
  name: 'projects',
  initialState, 
  reducers: {
    chooseProject(state, action) {
      state.selected = action.payload.id
    },
  },
  extraReducers: {
    [fetchProjects.pending]: (state, action) => {
      state.status = 'loading'
    },
    [fetchProjects.rejected]: (state, action) => {
      state.status = 'failed'
      state.error = action.error.message
    },
    [fetchProjects.fulfilled]: (state, action) => {
      state.status = 'succeeded'
      projectsAdapter.upsertMany(state, action.payload)
    },
    [addNewProject.fulfilled]: projectsAdapter.addOne
  }
})

export const { chooseProject } = projectsSlice.actions

export default projectsSlice.reducer

export const selectChosenProject = state => {
  if (!state.projects.selected) {
    return null
  }
  return state.entities[state.projects.selected]
}

export const {
  selectAll: selectAllProjects,
  selectById: selectProjectById,
  selectIds: selectProjectIds
} = projectsAdapter.getSelectors(state => state.projects)
