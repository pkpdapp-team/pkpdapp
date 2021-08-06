import React from "react";
import Success from "./Success"

export default function ResetPasswordRequestSuccess() {
  const text = "Request submitted, please check your email for a link to complete the password reset"
  return (
    <Success text={text} />
  )
}
