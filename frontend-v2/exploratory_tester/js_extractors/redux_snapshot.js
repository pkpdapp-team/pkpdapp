/**
 * Injected into the page to extract redux state + DOM slider values.
 * Returns a JSON object ready for SimulationModelSnapshot parsing.
 */
(() => {
  const store = window.__pkpd_store__;
  if (!store) return JSON.stringify({ error: "store not exposed" });

  const state = store.getState();
  const queries = (state.api && state.api.queries) || {};
  const mutations = (state.api && state.api.mutations) || {};

  // --- helpers ---

  function findQuery(endpointName) {
    for (const key of Object.keys(queries)) {
      if (key.startsWith(endpointName + "(")) {
        const q = queries[key];
        if (q && q.status === "fulfilled" && q.data) return q.data;
      }
    }
    return null;
  }

  function findMutation(endpointName) {
    for (const key of Object.keys(mutations)) {
      if (key.startsWith(endpointName + "(")) {
        const m = mutations[key];
        if (m && m.status === "fulfilled" && m.data) return m.data;
      }
    }
    return null;
  }

  function findListQuery(endpointName) {
    for (const key of Object.keys(queries)) {
      if (key.startsWith(endpointName + "(")) {
        const q = queries[key];
        if (q && q.status === "fulfilled" && Array.isArray(q.data)) return q.data;
      }
    }
    return [];
  }

  // --- Redux main + login slices (needed early for project lookup) ---
  const mainState = state.main || {};
  const selectedProject = mainState.selectedProject || null;
  const loginState = state.login || {};
  const user = loginState.user || null;

  // --- API cache extraction ---
  const projectList = findListQuery("projectList") || [];
  const project = findQuery("projectRetrieve")
    || projectList.find(p => p.id === selectedProject)
    || projectList[0]
    || null;
  const model = findQuery("combinedModelRetrieve") || (findListQuery("combinedModelList") || [])[0] || null;
  const variables = findListQuery("variableList");
  const compound = findQuery("compoundRetrieve");
  const protocols = findListQuery("protocolList");
  const doses = (protocols && protocols.length > 0)
    ? protocols.flatMap((p) => (p.doses || []))
    : [];
  const simulations = findListQuery("simulationList") || [];
  const simulation = simulations.length > 0 ? simulations[0] : null;

  // simulation results from mutation cache
  const simResult = findMutation("combinedModelSimulateCreate");

  // --- DOM slider values ---
  const sliderElements = document.querySelectorAll('[data-cy^="parameter-slider-"]');
  const sliderValues = {};
  for (const el of sliderElements) {
    const attr = el.getAttribute("data-cy") || "";
    const name = attr.replace("parameter-slider-", "");
    const input = el.querySelector('input[type="range"]') || el.querySelector('input[type="hidden"]');
    if (input && input.value !== undefined) {
      sliderValues[name] = parseFloat(input.value);
    } else if (el.hasAttribute("aria-valuenow")) {
      sliderValues[name] = parseFloat(el.getAttribute("aria-valuenow"));
    }
  }

  // Build result
  return JSON.stringify({
    selectedProject,
    user: user ? { id: user.id, username: user.username } : null,
    project: project ? pickProjectFields(project) : null,
    model: model ? pickModelFields(model) : null,
    variables: Array.isArray(variables) ? variables.map(pickVariableFields) : [],
    compound: compound ? pickCompoundFields(compound) : null,
    doses: Array.isArray(doses) ? doses.map(pickDoseFields) : [],
    simulation: simulation ? pickSimulationFields(simulation) : null,
    simulationResult: simResult ? pickSimResultFields(simResult) : null,
    sliderValues,
    // raw api state for debugging
    _cacheKeys: { queries: Object.keys(queries), mutations: Object.keys(mutations) },
  });

  // --- field pickers (minimize payload, avoid cycles) ---

  function pickProjectFields(p) {
    return { id: p.id, name: p.name, species: p.species, compound: p.compound };
  }

  function pickModelFields(m) {
    return {
      id: m.id,
      name: m.name,
      species: m.species,
      pk_model: m.pk_model,
      pk_model2: m.pk_model2,
      pk_effect_model: m.pk_effect_model,
      pd_model: m.pd_model,
      pd_model2: m.pd_model2,
      time_max: m.time_max,
      number_of_effect_compartments: m.number_of_effect_compartments,
      has_lag: m.has_lag,
      has_anti_drug_antibodies: m.has_anti_drug_antibodies,
      has_bioavailability: m.has_bioavailability,
      mappings: Array.isArray(m.mappings)
        ? m.mappings.map((mm) => ({
            pk_variable: mm.pk_variable,
            pd_variable: mm.pd_variable,
          }))
        : [],
      derived_variables: Array.isArray(m.derived_variables)
        ? m.derived_variables.map((dv) => ({
            type: dv.type,
            pk_variable: dv.pk_variable,
          }))
        : [],
    };
  }

  function pickVariableFields(v) {
    return {
      id: v.id,
      name: v.name,
      qname: v.qname,
      constant: v.constant,
      state: v.state,
      default_value: v.default_value,
      lower_bound: v.lower_bound,
      upper_bound: v.upper_bound,
      unit_symbol: v.unit_symbol || null,
    };
  }

  function pickCompoundFields(c) {
    return {
      id: c.id,
      name: c.name,
      molecular_mass: c.molecular_mass,
      fraction_unbound_plasma: c.fraction_unbound_plasma,
      blood_to_plasma_ratio: c.blood_to_plasma_ratio,
      target_concentration: c.target_concentration,
      dissociation_constant: c.dissociation_constant,
    };
  }

  function pickDoseFields(d) {
    return {
      start_time: d.start_time,
      amount: d.amount,
      duration: d.duration,
      repeats: d.repeats,
      repeat_interval: d.repeat_interval,
    };
  }

  function pickSimulationFields(s) {
    return {
      id: s.id,
      name: s.name,
      nrows: s.nrows,
      ncols: s.ncols,
      time_max: s.time_max,
      time_max_unit: s.time_max_unit,
      plots: Array.isArray(s.plots)
        ? s.plots.map((p) => ({
            id: p.id,
            index: p.index,
            x_unit: p.x_unit,
            y_unit: p.y_unit,
            y_unit2: p.y_unit2,
            y_scale: p.y_scale,
            min: p.min,
            max: p.max,
            min2: p.min2,
            max2: p.max2,
            y_axes: Array.isArray(p.y_axes)
              ? p.y_axes.map((ax) => ({ variable: ax.variable }))
              : [],
          }))
        : [],
      sliders: Array.isArray(s.sliders)
        ? s.sliders.map((sl) => ({ id: sl.id, variable: sl.variable }))
        : [],
    };
  }

  function pickSimResultFields(r) {
    return {
      time: r.time,
      outputs: r.outputs,
      group: r.group,
    };
  }
})();
