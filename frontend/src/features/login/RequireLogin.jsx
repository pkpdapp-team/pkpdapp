import * as React from 'react';
import { useLocation, Redirect } from "react-router-dom";
import { useSelector } from "react-redux";
import { isAuthenticated } from "./loginSlice"


export default function RequireAuth({ children }) {
  let location = useLocation();
  const gotoLogin = !useSelector(isAuthenticated);


  if (gotoLogin) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return (
      <Redirect 
          to={{
            pathname: "/login",
            state: { referrer: location },
          }}
      />
    );
  }

  return children;
}
