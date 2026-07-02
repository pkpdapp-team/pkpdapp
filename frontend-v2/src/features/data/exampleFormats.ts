/**
 * Static example dataset formats shown in the "Example file formats" help dialog
 * on the Data page. The content mirrors the sheets in the shipped `Examples.xlsx`
 * template: for each supported layout it holds the recommended column headers, a
 * full block of example rows, format-specific notes and a list of tips.
 *
 * The display rows include a trailing "…" continuation row (as in the
 * spreadsheet). The download step in ExampleFormatsDialog strips that row so the
 * exported file contains only real data.
 */

export interface ExampleFormat {
  /** Tab label. */
  name: string;
  /** Base name (without extension) for the per-example download. */
  fileName: string;
  /** The "Recommended datafile format …" summary line. */
  description: string;
  /** Format-specific explanatory notes (e.g. II/ADDL, YTYPE). */
  notes?: string[];
  /** Header row. */
  columns: string[];
  /** Example data rows (includes the trailing "…" continuation row). */
  rows: string[][];
  /** Numbered tips shown below the table. */
  tips: string[];
}

const ELLIPSIS = "…";

/** Subjects 1-3 are group "1", subjects 4-6 are group "2". */
const SUBJECTS = [1, 2, 3, 4, 5, 6];
const groupOf = (id: number) => (id <= 3 ? "1" : "2");

/** Time points shared by every example, with the single-dose amount at t = 0. */
const TIME_POINTS = [
  { time: "0", pk: "NA", pd: "100", amount: "1" },
  { time: "2", pk: "100", pd: "500", amount: "." },
  { time: "7", pk: "50", pd: "350", amount: "." },
  { time: "24", pk: "10", pd: "170", amount: "." },
];

function withEllipsis(rows: string[][], columnCount: number): string[][] {
  return [...rows, Array(columnCount).fill(ELLIPSIS)];
}

// 1. Single observation, single dose.
const singleObsSingleDose: string[][] = SUBJECTS.flatMap((id) =>
  TIME_POINTS.map((p) => [
    String(id),
    groupOf(id),
    p.time,
    "h",
    p.pk,
    "ng/mL",
    p.amount,
    "mg/kg",
  ]),
);

// 2. Single observation, multiple doses (II / ADDL define the repeat schedule).
const singleObsMultipleDoses: string[][] = SUBJECTS.flatMap((id) =>
  TIME_POINTS.map((p) => [
    String(id),
    groupOf(id),
    p.time,
    "h",
    p.pk,
    "ng/mL",
    p.amount,
    "mg/kg",
    p.time === "0" ? "24" : ".",
    p.time === "0" ? "5" : ".",
  ]),
);

// 3. Multiple observations, single dose, wide format (one column per observation).
const multipleObsWide: string[][] = SUBJECTS.flatMap((id) =>
  TIME_POINTS.map((p) => [
    String(id),
    groupOf(id),
    p.time,
    "h",
    p.pk,
    "ng/mL",
    p.pd,
    "dimensionless",
    p.amount,
    "mg/kg",
  ]),
);

// 4. Multiple observations, single dose, long format (YTYPE identifies each obs).
const multipleObsLong: string[][] = [
  ...SUBJECTS.flatMap((id) =>
    TIME_POINTS.map((p) => [
      String(id),
      groupOf(id),
      p.time,
      "h",
      "1",
      p.pk,
      "ng/mL",
      p.amount,
      "mg/kg",
    ]),
  ),
  ...SUBJECTS.flatMap((id) =>
    TIME_POINTS.map((p) => [
      String(id),
      groupOf(id),
      p.time,
      "h",
      "2",
      p.pd,
      "dimensionless",
      p.amount,
      "mg/kg",
    ]),
  ),
];

const COMMON_TIPS = [
  "Fill the unit columns all the way down.",
  'Do not leave empty cells in your datafile; use "NA" or "." for empty cells.',
  'Any non-numerical entry in "Observation" (e.g., BLQ, <0.1 etc.) will be ignored.',
];

export const EXAMPLE_FORMATS: ExampleFormat[] = [
  {
    name: "Single obs, single dose",
    fileName: "single_obs_single_dose",
    description:
      "Recommended datafile format incl. preferred header names for single dose data.",
    columns: [
      "ID",
      "GroupID",
      "Time",
      "Time_units",
      "Observation",
      "Observation_units",
      "Amount",
      "Amount_units",
    ],
    rows: withEllipsis(singleObsSingleDose, 8),
    tips: COMMON_TIPS,
  },
  {
    name: "Single obs, multiple doses",
    fileName: "single_obs_multiple_doses",
    description:
      "Recommended datafile format incl. preferred header names for multiple dose data.",
    notes: [
      "II — Inter-dose interval (e.g., 24 h; same units as time).",
      'ADDL — Additional doses (e.g., 5 additional doses of "Amount" at intervals defined in "II").',
      "In this example 1 mg/kg is dosed at t = 0, 24, 48, 72, 96 and 120 h.",
    ],
    columns: [
      "ID",
      "GroupID",
      "Time",
      "Time_units",
      "Observation",
      "Observation_units",
      "Amount",
      "Amount_units",
      "II",
      "ADDL",
    ],
    rows: withEllipsis(singleObsMultipleDoses, 10),
    tips: COMMON_TIPS,
  },
  {
    name: "Multiple obs, single dose (wide)",
    fileName: "multiple_obs_single_dose_wide",
    description:
      "Recommended datafile format incl. preferred header names for single dose data and multiple observations (wide format).",
    columns: [
      "ID",
      "GroupID",
      "Time",
      "Time_units",
      "Observation1",
      "Observation1_units",
      "Observation2",
      "Observation2_units",
      "Amount",
      "Amount_units",
    ],
    rows: withEllipsis(multipleObsWide, 10),
    tips: [
      'In the wide format, the "Observation_units" are for documentation only; actual units need to be mapped in the PKPD Explorer.',
      ...COMMON_TIPS,
    ],
  },
  {
    name: "Multiple obs, single dose (long)",
    fileName: "multiple_obs_single_dose_long",
    description:
      "Recommended datafile format incl. preferred header names for single dose data and multiple observations (long format).",
    notes: [
      "YTYPE — represents the Observation ID.",
      "The order of observations is not important; here the file is sorted by columns A, E and C.",
      "The order could also be PK first followed by PD (E, A, C) or any other order.",
    ],
    columns: [
      "ID",
      "GroupID",
      "Time",
      "Time_units",
      "YTYPE",
      "Observation",
      "Observation_units",
      "Amount",
      "Amount_units",
    ],
    rows: withEllipsis(multipleObsLong, 9),
    tips: [
      'If the 2nd observation is a PD observation, use "dimensionless" for units.',
      "If the 2nd observation is a PK observation, use relevant concentration units (e.g., µg/mL, ng/mL, pmol/L).",
      'The headers "Observation_units" or "Observation_unit" are automatically mapped in the PKPD Explorer.',
      "Fill the unit columns all the way down.",
      'Do not leave empty cells in your datafile; use "NA" or "." for empty cells.',
      'Any non-numerical entry under "Observation" (e.g., BLQ, <0.1 etc.) will be ignored.',
    ],
  },
];
