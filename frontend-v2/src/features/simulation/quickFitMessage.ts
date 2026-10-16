import {
  BiomarkerTypeRead,
  Optimise,
  OptimiseResponse,
  SubjectGroupRead,
  UnitRead,
  VariableRead,
} from "../../app/backendApi";
import formatUnitSymbol from "../../shared/formatUnitSymbol";
import { correlation, isNearBound, percentRse, standardErrors } from "./optimisationStats";

// what "Discuss with AI" sends to the chat, as at fit time

export const QUICK_FIT_HEADER = "[OPTIMISATION RESULTS]";

type FittedParameter = {
  name: string;
  unit: string;
  start: number;
  lower: number;
  upper: number;
  optimal: number;
  log_space: boolean;
  near_bound: boolean;
  rse_percent: number | null;
};

type Sigma = {
  start: number;
  lower: number;
  upper: number;
  optimal: number;
  log_space: boolean;
  near_bound: boolean;
};

type Noise = {
  output: string;
  noise_model: string;
  sigma: Sigma; // the additive sigma for a combined model
  sigma_proportional: Sigma | null; // combined only
};

type Correlation = { a: string; b: string; r: number | null };

export type QuickFitMessage = {
  summary: {
    stop_reason: string;
    neg2ll: number | null;
    aic: number | null;
    bic: number | null;
    excluded_near_zero_observations: number;
  };
  inputs: {
    method: string;
    max_iterations: number | null;
    observations: string[];
    subject_groups: string[];
    parameters: FittedParameter[];
    noise: Noise[];
  };
  uncertainty: {
    condition_number: number | null;
    correlations: Correlation[]; // every pair
  };
};

function numberOrNull(value: number): number | null {
  return Number.isNaN(value) ? null : value;
}

function variableName(id: number, variables: VariableRead[]): string {
  return variables.find((v) => v.id === id)?.name ?? String(id);
}

// same label as the dialog: "name (description)", else name, else the biomarker's name
function observationNames(
  result: OptimiseResponse,
  biomarkerTypes: BiomarkerTypeRead[],
  variables: VariableRead[],
): string[] {
  return (result.biomarker_types ?? []).map((id) => {
    const biomarkerType = biomarkerTypes.find((b) => b.id === id);
    const variable = variables.find((v) => v.id === biomarkerType?.variable);
    return variable?.description
      ? `${variable.name} (${variable.description})`
      : variable?.name || biomarkerType?.name || String(id);
  });
}

function subjectGroupNames(result: OptimiseResponse, groups: SubjectGroupRead[]): string[] {
  return (result.subject_groups ?? []).map(
    (id) => groups.find((g) => g.id === id)?.name ?? String(id),
  );
}

function sigma(start: number, bounds: number[], optimal: number, logSpace: boolean): Sigma {
  return {
    start,
    lower: bounds[0],
    upper: bounds[1],
    optimal,
    log_space: logSpace,
    near_bound: isNearBound(optimal, bounds[0], bounds[1]),
  };
}

function fittedParameters(
  result: OptimiseResponse,
  request: Optimise,
  variables: VariableRead[],
  units: UnitRead[],
): FittedParameter[] {
  const se = result.covariance ? standardErrors(result.covariance) : null;
  return result.inputs.map((id, i) => {
    const variable = variables.find((v) => v.id === id);
    const unit = units.find((u) => u.id === variable?.unit);
    const optimal = result.optimal[i];
    const lower = result.bounds[0][i];
    const upper = result.bounds[1][i];
    return {
      name: variableName(id, variables),
      unit: formatUnitSymbol(unit?.symbol, variable?.unit_per_body_weight),
      start: result.starting[i],
      lower,
      upper,
      optimal,
      log_space: request.use_log_space?.[i] ?? false,
      near_bound: isNearBound(optimal, lower, upper),
      rse_percent: se ? numberOrNull(percentRse(se[i], optimal)) : null,
    };
  });
}

function noise(result: OptimiseResponse, variables: VariableRead[]): Noise[] {
  const { sigma_variables, sigma_start, sigma_bounds } = result;
  if (!sigma_variables || !sigma_start || !sigma_bounds || !result.sigma) {
    return [];
  }
  return sigma_variables.map((id, i) => {
    const noiseModel = result.noise_models[i];
    const hasProportional =
      noiseModel === "combined" &&
      result.sigma_mult != null &&
      result.sigma_mult_start != null &&
      result.sigma_bounds_mult != null;
    return {
      output: variableName(id, variables),
      noise_model: noiseModel,
      sigma: sigma(
        sigma_start[i],
        sigma_bounds[i],
        result.sigma[i],
        result.sigma_use_log_space?.[i] ?? true,
      ),
      sigma_proportional: hasProportional
        ? sigma(
            result.sigma_mult_start![i],
            result.sigma_bounds_mult![i],
            result.sigma_mult![i],
            result.sigma_mult_use_log_space?.[i] ?? true,
          )
        : null,
    };
  });
}

function correlations(result: OptimiseResponse, variables: VariableRead[]): Correlation[] {
  const covariance = result.covariance;
  if (!covariance) {
    return [];
  }
  const se = standardErrors(covariance);
  const pairs: Correlation[] = [];
  for (let i = 0; i < covariance.length; i++) {
    for (let j = i + 1; j < covariance.length; j++) {
      pairs.push({
        a: variableName(result.inputs[i], variables),
        b: variableName(result.inputs[j], variables),
        r: numberOrNull(correlation(covariance[i][j], se[i], se[j])),
      });
    }
  }
  return pairs;
}

export function buildQuickFitMessage(
  result: OptimiseResponse,
  request: Optimise,
  variables: VariableRead[],
  units: UnitRead[],
  biomarkerTypes: BiomarkerTypeRead[],
  groups: SubjectGroupRead[],
): QuickFitMessage {
  return {
    summary: {
      stop_reason: result.reason,
      neg2ll: result.neg2ll,
      aic: result.aic,
      bic: result.bic,
      excluded_near_zero_observations: result.filtered_observations ?? 0,
    },
    inputs: {
      method: result.method,
      max_iterations: result.max_iterations ?? null,
      observations: observationNames(result, biomarkerTypes, variables),
      subject_groups: subjectGroupNames(result, groups),
      parameters: fittedParameters(result, request, variables, units),
      noise: noise(result, variables),
    },
    uncertainty: {
      condition_number: result.condition_number,
      correlations: correlations(result, variables),
    },
  };
}

export function quickFitMessageText(message: QuickFitMessage): string {
  return `${QUICK_FIT_HEADER}\n${JSON.stringify(message)}`;
}

export function isQuickFitMessage(text: string): boolean {
  return text.startsWith(`${QUICK_FIT_HEADER}\n`);
}

// the sent JSON indented for reading, or the raw text if it isn't JSON
export function quickFitMessageDetails(text: string): string {
  const json = text.slice(QUICK_FIT_HEADER.length + 1);
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}
