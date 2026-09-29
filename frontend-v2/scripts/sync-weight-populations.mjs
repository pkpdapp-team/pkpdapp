// Sync the shared body-weight population data from the backend (the single
// source of truth) into a typed, committed frontend constant.
//
//   source: ../pkpdapp/pkpdapp/utils/weight_populations.json
//   output: src/shared/weightPopulations.ts
//
// Run with: yarn sync:weight-populations
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(
  here,
  "../../pkpdapp/pkpdapp/utils/weight_populations.json",
);
const outputPath = path.resolve(here, "../src/shared/weightPopulations.ts");

// re-parse + re-serialise so the emitted file is normalised (and the sync fails
// loudly if the source JSON is malformed)
const data = JSON.parse(readFileSync(sourcePath, "utf8"));

const banner = `// GENERATED FILE — do not edit by hand.
// Source of truth: pkpdapp/pkpdapp/utils/weight_populations.json
// Regenerate with: yarn sync:weight-populations
`;

const body = `export interface WeightParams {
  mean: number;
  std: number;
}
export interface RegionWeights {
  female: WeightParams;
  male: WeightParams;
}
export interface WeightPopulations {
  regions: Record<string, RegionWeights>;
  default: RegionWeights;
}

export const weightPopulations: WeightPopulations = ${JSON.stringify(
  data,
  null,
  2,
)};
`;

writeFileSync(outputPath, `${banner}\n${body}`);
console.log(`wrote ${path.relative(process.cwd(), outputPath)}`);
