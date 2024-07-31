import { useEffect } from "react";
import "./App.css";

import {
  fetchSession,
  isAuthenticated,
  login,
} from "./features/login/loginSlice";
import { useSelector } from "react-redux";
import Login from "./features/login/login";
import Sidebar from "./features/main/Sidebar";
import { useAppDispatch } from "./app/hooks";
import { RootState } from "./app/store";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Typography } from "@mui/material";

function App() {
  const dispatch = useAppDispatch();
  const isAuth = useSelector(isAuthenticated);
  const error = useSelector((state: RootState) => state.login.error);

  const onLogin = (username: string, password: string) => {
    dispatch(login({ username, password }));
  };

  useEffect(() => {
    dispatch(fetchSession());
  }, [dispatch]);

  return (
    <>
      {isAuth ? (
        <>
          <Sidebar />
          <ToastContainer />
        </>
      ) : (
        <Login onLogin={onLogin} isLoading={false} errorMessage={error} />
      )}
      <Typography
        sx={{
          position: "fixed",
          bottom: 0,
          right: 0,
          color: "gray",
          paddingRight: 1,
        }}
      >
        pkpdx version {import.meta.env.VITE_APP_VERSION?.slice(0, 7) || "dev"}
      </Typography>
    </>
  );
}

export default App;
