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

export const fetchProjects = createAsyncThunk('projects/fetchProjects', async () => {
  return await api.get(`/api/project/`)
})

export const addNewProject = createAsyncThunk(
  'projects/addNewProject',
  async () => {
    const initialProject= {
      name: 'new',
      users: [api.loggedInUser().id],
    }
    console.log('addNewProject', initialProject)
    return await api.post('/api/project/', initialProject)
  }
)

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId, { dispatch }) => {
    await api.delete(
      `/api/project/${projectId}`
    )
    return projectId
  }
)

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async (project) => {
    console.log('updating project', project)
    const new_project = await api.put(`/api/project/${project.id}/`, project)
    console.log('got project', new_project)
    return project
  }
)

export const projectsSlice = createSlice({
  name: 'projects',
  initialState, 
  reducers: {
    chooseProject(state, action) {
      console.log('choose project', action)
      state.selected = action.payload.id
    },
  },
  extraReducers: {
    [fetchProjects.pending]: (state, action) => {
      console.log('pending')
      state.status = 'loading'
    },
    [fetchProjects.rejected]: (state, action) => {
      console.log('rejected', action.error.message)
      state.status = 'failed'
      state.error = action.error.message
    },
    [fetchProjects.fulfilled]: (state, action) => {
      state.status = 'succeeded'
      projectsAdapter.setAll(state, action.payload)
    },
    [deleteProject.fulfilled]: projectsAdapter.removeOne,
    [addNewProject.fulfilled]: projectsAdapter.addOne,
    [updateProject.fulfilled]: projectsAdapter.upsertOne
  }
})

export const { chooseProject } = projectsSlice.actions

export default projectsSlice.reducer

export const selectChosenProject = state => {
  if (!state.projects.selected) {
    return null
  }
  return state.projects.entities[state.projects.selected]
}

export const {
  selectAll: selectAllProjects,
  selectById: selectProjectById,
  selectIds: selectProjectIds
} = projectsAdapter.getSelectors(state => state.projects)

export const selectMyProjects = state => selectAllProjects(state).filter(p => p.users.includes(api.loggedInUser().id));

export const userHasReadOnlyAccess = (project) => {
  const access = project.user_access.find(
    x => x.user === api.loggedInUser().id
  )
  return access.read_only
}
