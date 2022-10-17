import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";

import { api } from "../../Api";


export const fetchCsrf = createAsyncThunk(
  "login/fetchCsrf",
  async (project, { dispatch }) => {
    const response = await fetch("/api/csrf/", {
      method: "GET",
      credentials: "include",
    }).then(response => response.json());
    localStorage.setItem("csrf", response['X-CSRFToken']);
    return response['X-CSRFToken'];
  }
);

export const fetchSession = createAsyncThunk(
  "login/fetchSession",
  async (_, { dispatch }) => {
    const { isAuthenticated, user } = await fetch("/api/session/", {
      method: "GET",
      credentials: "include",
    }).then((response) => {
      dispatch(fetchCsrf());
      return isResponseOk(response)
    }).then(data =>
      ({ isAuthenticated: true, user: data.user })
    ).catch((err) => 
      ({ isAuthenticated: false, user: null })
    );
    console.log('fetchSession', isAuthenticated, user)
    return { isAuthenticated, user };
  }
);

function isResponseOk(response) {
  if (response.status >= 200 && response.status <= 299) {
    return response.json();
  } else {
    throw Error(response.statusText);
  }
}

export const login = createAsyncThunk(
  "login/login",
  async ({username, password}, { getState, dispatch }) => {
    const csrf = getState().login.csrf;
    const response = await fetch("/api/login/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrf,
      },
      body: JSON.stringify({username: username, password: password}),

    })
    .then(isResponseOk)
    .then((data) => {
      dispatch(fetchCsrf());
      return {isAuthenticated: true, user: data.user, error: null}
    })
    .catch((err) => {
      return {isAuthenticated: false, user: null, error: "Wrong usename or password"}
    });
    return response;
  }
);

export const logout = createAsyncThunk(
  "login/logout",
  async (_, { dispatch }) => {
    const response = await fetch("/api/logout/", {
      method: "GET",
      credentials: "include",
    })
    .then(isResponseOk)
    .then((data) => {
      dispatch(fetchCsrf());
      return {isAuthenticated: false}
    });
    return response;
  }
);

const slice = createSlice({

  name: "login",
  initialState: { user: null, csrf: null, isAuthenticated: false, error: null },
  reducers: {
    setCredentials: (state, action) => {
      const user = action.payload.user;
      const csrf = action.payload.csrf;
      console.log('setCredentials', user)
      state.user = user;
      state.csrf = csrf;
    }
  },
  extraReducers: {
    [fetchCsrf.fulfilled]: (state, action) => {
      state.csrf = action.payload 
    },
    [fetchSession.fulfilled]: (state, action) => {
      state.isAuthenticated = action.payload.isAuthenticated 
      state.user = action.payload.user
    },
    [login.fulfilled]: (state, action) => {
      console.log('login.fulfilled', action.payload)
      state.isAuthenticated = action.payload.isAuthenticated;
      state.user = action.payload.user;
      state.error = action.payload.error;
    },
    [logout.fulfilled]: (state, action) => {
      state.isAuthenticated = action.payload.isAuthenticated;
    },
  }
});

export const { setCredentials } = slice.actions;

export default slice.reducer;

export const selectCurrentUser = (state) => state.login.user;
export const selectCsrf = (state) => state.login.csrf;
export const selectAuthHeaders = (state) => {
  let headers = {}
  const csrf = state.login.csrf;
  if (csrf) {
    headers["X-CSRFToken"] = csrf;
  }
  return headers
}
export const isAuthenticated = (state) => state.login.isAuthenticated;
export const loginError = (state) => state.login.error;
