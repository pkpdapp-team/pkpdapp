import type { Preview } from "@storybook/react-vite";
import { Provider } from "react-redux";
import { initialize, mswLoader } from "msw-storybook-addon";
import { isCommonAssetRequest } from "msw";
import { store } from "../src/app/store";
import { api } from "../src/app/api";
import { setProject } from "../src/features/main/mainSlice";

/*
 * Initializes MSW
 * See https://github.com/mswjs/msw-storybook-addon#configuring-msw
 * to learn how to customize it
 */
initialize({
  quiet: true, // Set to true to avoid logging in the console
  serviceWorker: {
    url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
  },
  onUnhandledRequest(request, print) {
    // Suppress warnings for common static assets (CSS, JS, images, fonts, etc.)
    if (isCommonAssetRequest(request)) {
      return;
    }
    // Still log warnings for unhandled API requests
    print.warning();
  },
});

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
          "Projects",
          "Drug and Target",
          "Edit Model (version 3)",
          "Data Upload (create dataset)",
          "Data Upload (edit dataset)",
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
  beforeEach: async () => {
    store.dispatch(api.util.resetApiState());
    store.dispatch(setProject(undefined));
  },
};

export default preview;
