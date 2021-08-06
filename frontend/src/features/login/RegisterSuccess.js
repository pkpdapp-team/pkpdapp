import React from "react";
import Success from "./Success"

export default function RegisterSuccess() {
  const text = "You have successfully created a new user, please check your email for a link to activate this account"
  return (
    <Success text={text} />
  )
}
