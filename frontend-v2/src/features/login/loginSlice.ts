import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import { RootState } from "../../app/store";
import { UserRead, ProjectRead, ProjectAccessRead } from "../../app/backendApi";

export const fetchCsrf = createAsyncThunk<string, undefined>(
  "login/fetchCsrf",
  async (_, { dispatch }) => {
    const csrfResponse = await fetch("/api/csrf/", {
      method: "GET",
      credentials: "include",
    }).then((response) => response.json());
    localStorage.setItem("csrf", csrfResponse["X-CSRFToken"]);
    return csrfResponse["X-CSRFToken"];
  },
);

interface Login {
  isAuthenticated: boolean;
  user: any;
}

interface LoginErrorResponse {
  error: string;
}

export const fetchSession = createAsyncThunk<
  Login,
  undefined,
  { rejectValue: LoginErrorResponse }
>("login/fetchSession", async (_, { dispatch, rejectWithValue }) => {
  const sessionResponse = await fetch("/api/session/", {
    method: "GET",
    credentials: "include",
  })
    .then((response) => {
      dispatch(fetchCsrf());
      return isResponseOk(response);
    })
    .then((data) => ({ isAuthenticated: true, user: data.user }))
    .catch((err) => {
      return rejectWithValue({ error: err.error });
    });
  return sessionResponse;
});

class ServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerError";
  }
}
function isResponseOk(response: Response) {
  if (response.status >= 200 && response.status <= 299) {
    return response.json();
  } else {
    return response
      .json()
      .then((data) => {
        throw new ServerError(data.detail);
      })
      .catch((err) => {
        if (err instanceof ServerError) {
          throw err;
        } else {
          throw Error(response.statusText);
        }
      });
  }
}

interface LoginArgs {
  username: string;
  password: string;
}

export const login = createAsyncThunk<
  Login,
  LoginArgs,
  { rejectValue: LoginErrorResponse }
>(
  "login/login",
  async ({ username, password }, { getState, dispatch, rejectWithValue }) => {
    const csrf = (getState() as RootState).login.csrf;
    const response = await fetch("/api/login/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrf ? csrf : "",
      },
      body: JSON.stringify({ username: username, password: password }),
    })
      .then(isResponseOk)
      .then((data) => {
        dispatch(fetchCsrf());
        return { isAuthenticated: true, user: data.user };
      })
      .catch((err) => {
        return rejectWithValue({ error: err.message });
      });
    return response;
  },
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
        return { isAuthenticated: false };
      });
    return response;
  },
);

interface LoginState {
  user: UserRead | undefined;
  csrf: string | undefined;
  isAuthenticated: boolean;
  error: string | undefined;
}

const slice = createSlice({
  name: "login",
  initialState: {
    user: undefined,
    csrf: undefined,
    isAuthenticated: false,
    error: undefined,
  } as LoginState,
  reducers: {
    setCredentials: (state, action) => {
      const user = action.payload.user;
      const csrf = action.payload.csrf;
      state.user = user;
      state.csrf = csrf;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchCsrf.rejected, (state, action) => {
      state.csrf = undefined;
    });
    builder.addCase(fetchCsrf.fulfilled, (state, action) => {
      state.csrf = action.payload;
    });
    builder.addCase(fetchSession.fulfilled, (state, action) => {
      state.isAuthenticated = action.payload.isAuthenticated;
      state.user = action.payload.user;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isAuthenticated = action.payload.isAuthenticated;
      state.user = action.payload.user;
      state.error = undefined;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.error = action.payload?.error;
    });
    builder.addCase(logout.fulfilled, (state, action) => {
      state.isAuthenticated = action.payload.isAuthenticated;
    });
  },
});

export const { setCredentials } = slice.actions;

export default slice.reducer;

export const selectIsProjectShared = (
  state: RootState,
  project: ProjectRead | undefined,
) => {
  const currentUser = selectCurrentUser(state);
  const myUserId = currentUser?.id || 0;
  const isSharedWithMe =
    project?.user_access.some(
      (ua: ProjectAccessRead) => ua.user === myUserId && ua.read_only === true,
    ) || false;
  return isSharedWithMe;
};

export const selectCurrentUser = (state: RootState) => state.login.user;
export const selectCsrf = (state: RootState) => state.login.csrf;
export const selectAuthHeaders = (state: RootState) => {
  const headers = { "X-CSRFToken": "" };
  const csrf = state.login.csrf;
  if (csrf) {
    headers["X-CSRFToken"] = csrf;
  }
  return headers;
};
export const isAuthenticated = (state: RootState) =>
  state.login.isAuthenticated;
export const loginError = (state: RootState) => state.login.error;
