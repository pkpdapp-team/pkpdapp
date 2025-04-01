import React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { store } from "./app/store";
import App from "./App";

test("renders learn react link", () => {
  const { getByText } = render(
    <Provider store={store}>
      <App />
    </Provider>,
  );

  // @ts-expect-error toBeInTheDocument doesn't exist in recent versions of Jest.
  expect(getByText(/learn/i)).toBeInTheDocument();
});
