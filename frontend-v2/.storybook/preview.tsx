import type { Preview } from "@storybook/react-vite";
import { Provider } from "react-redux";
import { initialize, mswLoader } from "msw-storybook-addon";
import { store } from "../src/app/store";

// Initialize MSW
initialize();

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
    options: {
      storySort: {
        order: [
          "Drug and Target",
          "Edit Model",
          "Data Upload",
          "Trial Design",
          "Simulations",
          "Results",
        ],
      },
    },
  },
  decorators: [
    (Story) => {
      return (
        <Provider store={store}>
          <Story />
        </Provider>
      );
    },
  ],
  tags: ["autodocs"],
  loaders: [mswLoader],
};

export default preview;
