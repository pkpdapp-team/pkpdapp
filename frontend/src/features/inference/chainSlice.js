import {
  createSlice,
  createEntityAdapter,
  createAsyncThunk,
} from "@reduxjs/toolkit";
import { api } from "../../Api";

const chainsAdapter = createEntityAdapter({
  sortComparer: (a, b) => b.id < a.id,
});

const initialState = chainsAdapter.getInitialState({
  status: "idle",
  errorFetch: null,
});

export const fetchChains = createAsyncThunk(
  "chains/fetchChains",
  async (project, { dispatch }) => {
    let response = await api.get(
      `/api/inference_chain/?project_id=${project.id}`
    );
    return response;
  }
);

export const fetchChainById = createAsyncThunk(
  "chains/fetchChainById",
  async (model_id, { dispatch }) => {
    let response = await api.get(`/api/inference_chain/${model_id}/`);
    return response;
  }
);

export const fetchChainsByInference = createAsyncThunk(
  "chains/fetchChainByInference",
  async (inference, { dispatch }) => {
    console.log("fetchChainsByInference", inference);
    let response = await api.get(
      `/api/inference_chain/?inference_id=${inference.id}`
    );
    return response;
  }
);

export const chainsSlice = createSlice({
  name: "chains",
  initialState,
  reducers: {
    toggleChain(state, action) {
      let chain = state.entities[action.payload.id];
      chain.chosen = !chain.chosen;
    },
    setChainError(state, action) {
      let chain = state.entities[action.payload.id];
      chain.error = action.payload.error;
    },
  },
  extraReducers: {
    [fetchChains.pending]: (state, action) => {
      state.status = "loading";
    },
    [fetchChains.rejected]: (state, action) => {
      state.status = "failed";
      state.errorFetch = action.error.message;
    },
    [fetchChains.fulfilled]: (state, action) => {
      state.status = "succeeded";
      chainsAdapter.setAll(state, action.payload);
    },
    [fetchChainsByInference.fulfilled]: chainsAdapter.upsertMany,
    [fetchChainById.fulfilled]: chainsAdapter.upsertOne,
  },
});

export const { toggleChain } = chainsSlice.actions;

export default chainsSlice.reducer;

export const {
  selectAll: selectAllChains,
  selectById: selectChainById,
  selectIds: selectChainIds,
} = chainsAdapter.getSelectors((state) => state.chains);

export const selectChosenChains = (state) =>
  selectAllChains(state).filter((chain) => chain.chosen);
