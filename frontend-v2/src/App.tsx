import React from 'react';
import logo from './logo.svg';
import { Counter } from './features/counter/Counter';
import './App.css';

import { isAuthenticated, login } from './features/login/loginSlice';  
import { useDispatch, useSelector } from 'react-redux';
import Login from './features/login/login';
import Sidebar from './features/main/Sidebar';

function App() {
  const dispatch = useDispatch();
  const isAuth = useSelector(isAuthenticated);

  const onLogin = (username: string, password: string) => {
    dispatch(login(username, password));
  }

  return (
    <>
    { isAuth ? (
      <Sidebar />
    ): (
      <Login onLogin={onLogin} isLoading={false}/>
    )}
    </>
  );
}

export default App;

