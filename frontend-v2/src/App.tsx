import React, { useEffect } from 'react';
import logo from './logo.svg';
import './App.css';

import { fetchSession, isAuthenticated, login } from './features/login/loginSlice';  
import { useDispatch, useSelector } from 'react-redux';
import Login from './features/login/login';
import Sidebar from './features/main/Sidebar';
import { useAppDispatch } from './app/hooks';
import { RootState } from './app/store';

function App() {
  const dispatch = useAppDispatch();
  const isAuth = useSelector(isAuthenticated);
  const error = useSelector((state: RootState) => state.login.error);

  const onLogin = (username: string, password: string) => {
    dispatch(login({ username, password }));
  }

  useEffect(() => {
    dispatch(fetchSession());
  }, [dispatch]);

  return (
    <>
    { isAuth ? (
      <Sidebar />
    ): (
      <Login onLogin={onLogin} isLoading={false} errorMessage={error}/>
    )}
    </>
  );
}

export default App;

