import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import { api } from "../../Api";

const usersAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id,
});

const initialState = usersAdapter.getInitialState({
  status: "idle",
  error: null,
});

export const fetchUsers = createAsyncThunk("users/fetchUsers", async () => {
  const response = await api.get(`/api/user/`);
  return response;
});

export const addNewUser = createAsyncThunk("users/addNewUser", async () => {
  const initialUser = {
    name: "new",
  };
  const response = await api.post("/api/user/", initialUser);
  return response;
});

export const updateUser = createAsyncThunk("users/updateUser", async (user) => {
  const response = await api.put(`/api/user/${user.id}/`, user);
  return response;
});

export const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {},
  extraReducers: {
    [fetchUsers.pending]: (state, action) => {
      state.status = "loading";
    },
    [fetchUsers.rejected]: (state, action) => {
      state.status = "failed";
      state.error = action.error.message;
    },
    [fetchUsers.fulfilled]: (state, action) => {
      state.status = "succeeded";
      usersAdapter.setAll(state, action.payload);
    },
    [addNewUser.fulfilled]: usersAdapter.addOne,
    [updateUser.fulfilled]: usersAdapter.upsertOne,
  },
});

// export const { } = usersSlice.actions

export default usersSlice.reducer;

export const {
  selectAll: selectAllUsers,
  selectById: selectUserById,
  selectIds: selectUserIds,
} = usersAdapter.getSelectors((state) => state.users);

export const selectChosenUsers = (state) =>
  selectAllUsers(state).filter((user) => user.chosen);
