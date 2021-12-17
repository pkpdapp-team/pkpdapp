import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import { api } from "../../Api";

const algorithmsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id,
});

const initialState = algorithmsAdapter.getInitialState({
  status: "idle",
  error: null,
});

export const fetchAlgorithms = createAsyncThunk(
  "algorithms/fetchAlgorithms",
  async (project, { getState }) => {
    const response = await api.get(`/api/algorithm/`);
    return response;
  }
);

export const addNewAlgorithm = createAsyncThunk(
  "algorithms/addNewAlgorithm",
  async () => {
    const initialAlgorithm = {
      name: "new",
    };
    const algorithm = await api.post("/api/algorithm/", initialAlgorithm);
    return algorithm;
  }
);

export const updateAlgorithm = createAsyncThunk(
  "algorithms/updateAlgorithm",
  async (algorithm) => {
    const response = await api.put(
      `/api/algorithm/${algorithm.id}/`,
      algorithm
    );
    return response;
  }
);

export const algorithmsSlice = createSlice({
  name: "algorithms",
  initialState,
  reducers: {},
  extraReducers: {
    [fetchAlgorithms.pending]: (state, action) => {
      state.status = "loading";
    },
    [fetchAlgorithms.rejected]: (state, action) => {
      state.status = "failed";
      state.error = action.error.message;
    },
    [fetchAlgorithms.fulfilled]: (state, action) => {
      state.status = "succeeded";
      algorithmsAdapter.setAll(state, action.payload);
    },
    [addNewAlgorithm.fulfilled]: algorithmsAdapter.addOne,
    [updateAlgorithm.fulfilled]: algorithmsAdapter.upsertOne,
  },
});

// export const {} = algorithmsSlice.actions

export default algorithmsSlice.reducer;

export const {
  selectAll: selectAllAlgorithms,
  selectById: selectAlgorithmById,
  selectIds: selectAlgorithmIds,
} = algorithmsAdapter.getSelectors((state) => state.algorithms);
