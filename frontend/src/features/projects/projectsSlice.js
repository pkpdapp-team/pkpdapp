import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
} from "@reduxjs/toolkit";

import { api } from "../../Api";
import { selectCurrentUser } from '../login/loginSlice'

const projectsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id,
});

const initialState = projectsAdapter.getInitialState({
  status: "idle",
  selected: null,
  error: null,
});

export const fetchProjects = createAsyncThunk(
  "projects/fetchProjects",
  async (_, { getState }) => {
    return await api.get(`/api/project/`, getState().login.csrf);
  }
);

export const addNewProject = createAsyncThunk(
  "projects/addNewProject",
  async (_, { getState }) => {
    const user = selectCurrentUser(getState())
    console.log('user is ', user)
    const initialProject = {
      name: "new",
      user_access: [
        {user: user.id, read_only: false}
      ],
    };
    console.log("addNewProject", initialProject);
    return await api.post("/api/project/", getState().login.csrf, initialProject);
  }
);

export const deleteProject = createAsyncThunk(
  "projects/deleteProject",
  async (projectId, { dispatch, getState }) => {
    await api.delete(`/api/project/${projectId}`, getState().login.csrf);
    return projectId;
  }
);

export const updateProject = createAsyncThunk(
  "projects/updateProject",
  async (project, { getState }) => {
    const csrf = getState().login.csrf;
    for (const access of project.user_access) {
      if (project.users.includes(access.user)) {
        await api.put(`/api/project_access/${access.id}/`, csrf, access);
      } else {
        await api.delete(`/api/project_access/${access.id}/`, csrf);
      }
    }
    for (const user_id of project.users) {
      if (!project.user_access.find((access) => access.user === user_id)) {
        const new_access = {
          project: project.id,
          user: user_id,
        };
        await api.post(`/api/project_access/`, csrf,  new_access);
      }
    }
    const new_project = await api.put(`/api/project/${project.id}/`, csrf, project);
    return new_project;
  }
);

export const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    chooseProject(state, action) {
      console.log("choose project", action);
      state.selected = action.payload.id;
    },
  },
  extraReducers: {
    [fetchProjects.pending]: (state, action) => {
      console.log("pending");
      state.status = "loading";
    },
    [fetchProjects.rejected]: (state, action) => {
      console.log("rejected", action.error.message);
      state.status = "failed";
      state.error = action.error.message;
    },
    [fetchProjects.fulfilled]: (state, action) => {
      state.status = "succeeded";
      projectsAdapter.setAll(state, action.payload);
    },
    [deleteProject.fulfilled]: projectsAdapter.removeOne,
    [addNewProject.fulfilled]: projectsAdapter.addOne,
    [updateProject.fulfilled]: projectsAdapter.upsertOne,
  },
});

export const { chooseProject } = projectsSlice.actions;

export default projectsSlice.reducer;

export const selectChosenProject = (state) => {
  if (!state.projects.selected) {
    return null;
  }
  return state.projects.entities[state.projects.selected];
};

export const {
  selectAll: selectAllProjects,
  selectById: selectProjectById,
  selectIds: selectProjectIds,
} = projectsAdapter.getSelectors((state) => state.projects);

export const selectMyProjects = (state) =>
  selectAllProjects(state).filter((p) =>
    p.users.includes(state.login.user.id)
  );

export const userHasReadOnlyAccess = (state, project) => {
  const access = project.user_access.find(
    (x) => x.user === state.login.user.id
  );
  return access.read_only;
};
