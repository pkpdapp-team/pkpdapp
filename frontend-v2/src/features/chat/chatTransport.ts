import { DefaultChatTransport } from "ai";
import { store } from "../../app/store";
import { api } from "../../app/api";

/**
 * Gather user context from the Redux store to send alongside messages.
 * This lets the LLM know what page the user is on, what model they
 * have configured, and what variables/parameters are set — without
 * requiring a tool call.
 */
function gatherUserContext() {
  const state = store.getState();
  const { selectedPage, selectedSubPage, selectedProject } = state.main;

  const context: Record<string, unknown> = {
    page: selectedPage,
    subPage: selectedSubPage,
  };

  if (!selectedProject) return context;

  // Project
  const project = api.endpoints.projectRetrieve.select({
    id: selectedProject,
  })(state)?.data;
  if (project) {
    context.project = {
      name: project.name,
      description: project.description,
      species: project.species,
    };
  }

  // Combined model (the user's configured PK/PD model)
  const models = api.endpoints.combinedModelList.select({
    projectId: selectedProject,
  })(state)?.data;
  const model = models?.[0];
  if (model) {
    // Resolve PK/PD model IDs to names from cached list queries
    const pkModels = api.endpoints.pharmacokineticList.select()(state)?.data;
    const pdModels = api.endpoints.pharmacodynamicList.select()(state)?.data;
    const pkName =
      pkModels?.find((m) => m.id === model.pk_model)?.name ?? null;
    const pdName =
      pdModels?.find((m) => m.id === model.pd_model)?.name ?? null;

    context.model = {
      name: model.name,
      species: model.species,
      has_saturation: model.has_saturation,
      has_extravascular: model.has_extravascular,
      has_effect: model.has_effect,
      has_lag: model.has_lag,
      has_hill_coefficient: model.has_hill_coefficient,
      pk_model_name: pkName,
      pd_model_name: pdName,
      mmt: model.mmt,
    };

    // Variables / parameters for this model
    const variables = api.endpoints.variableList.select({
      dosedPkModelId: model.id,
    })(state)?.data;
    if (variables) {
      context.variables = variables.map((v) => ({
        name: v.name,
        value: v.default_value,
        unit: v.unit_symbol,
        constant: v.constant,
      }));
    }
  }

  return context;
}

// // Expose for debugging: call window.debugUserContext() in browser console
// (window as unknown as Record<string, unknown>).debugUserContext = () => {
//   const ctx = gatherUserContext();
//   console.log(JSON.stringify(ctx, null, 2));
//   return ctx;
// };

const transport = new DefaultChatTransport({
  api: "/api/chatbot/",
  credentials: "include",
  prepareSendMessagesRequest: ({ messages, headers }) => {
    const csrf = localStorage.getItem("csrf") ?? "";
    const simplified = messages.map((msg) => ({
      role: msg.role,
      content: msg.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") ?? "",
    }));
    return {
      body: { messages: simplified, context: gatherUserContext() },
      headers: {
        ...headers,
        "X-CSRFToken": csrf,
      },
    };
  },
});

export default transport;
