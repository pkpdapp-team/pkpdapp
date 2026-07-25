import { FC, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import {
  CovariateRead,
  CovariatePopulationRead,
  PopulationRegionEnum,
  ProjectRead,
  SubjectGroupRead,
  useCovariateCreateMutation,
  useCovariateDestroyMutation,
  useCovariateListQuery,
  useCovariatePartialUpdateMutation,
  useCovariatePopulationCreateMutation,
  useCovariatePopulationListQuery,
  useCovariatePopulationPartialUpdateMutation,
  useSubjectGroupPartialUpdateMutation,
} from "../../app/backendApi";
import HelpButton from "../../components/HelpButton";
import { weightPopulations } from "../../shared/weightPopulations";
import {
  meanStdToMedianVariance,
  medianVarianceToMeanStd,
} from "../../shared/lognormal";

interface Props {
  group: SubjectGroupRead;
  project: ProjectRead;
  disabled: boolean;
}

const REGION_OPTIONS: { value: PopulationRegionEnum; label: string }[] = [
  { value: "US", label: "United States" },
  { value: "EU", label: "Europe" },
  { value: "ASIA", label: "Asia" },
  { value: "CUSTOM", label: "Custom" },
];

// A number input that patches on blur, seeded from the group value. These are
// mandatory fields, so an empty value is ignored rather than cleared.
const NumberField: FC<{
  label: string;
  defaultValue: number | null | undefined;
  disabled: boolean;
  min?: number;
  integer?: boolean;
  onCommit: (value: number) => void;
}> = ({ label, defaultValue, disabled, min, integer, onCommit }) => (
  <TextField
    size="small"
    type="number"
    label={label}
    disabled={disabled}
    sx={{ width: "9rem" }}
    defaultValue={defaultValue ?? ""}
    inputProps={{ min, step: integer ? 1 : "any" }}
    onBlur={(event) => {
      const raw = event.target.value;
      if (raw !== "") {
        const value = parseFloat(raw);
        if (
          !Number.isFinite(value) ||
          (min !== undefined && value < min) ||
          (integer && !Number.isInteger(value))
        ) {
          event.target.value = String(defaultValue ?? "");
          return;
        }
        onCommit(value);
      }
    }}
  />
);

// display helper: trim floating-point noise from converted values
const formatNumber = (value: number) => String(Number(value.toPrecision(6)));

// Mean / std-deviation inputs for a continuous covariate's per-group log-normal.
// The backend stores the log-normal median and log-space variance; users enter
// the arithmetic mean and standard deviation, which are converted here. Local
// state keeps both values together so editing either commits a consistent
// (median, variance) pair. Seeded from the population, or the backend defaults
// (median 1, variance 0.09) when the group has no population yet.
const ContinuousCovariateFields: FC<{
  population: CovariatePopulationRead | undefined;
  disabled: boolean;
  onCommit: (patch: { median: number; variance: number }) => void;
}> = ({ population, disabled, onCommit }) => {
  const seed = medianVarianceToMeanStd(
    population?.median ?? 1.0,
    population?.variance ?? 0.09,
  );
  const [mean, setMean] = useState(formatNumber(seed.mean));
  const [std, setStd] = useState(formatNumber(seed.std));

  const commit = (rawMean: string, rawStd: string) => {
    const meanValue = parseFloat(rawMean);
    const stdValue = parseFloat(rawStd);
    if (
      !Number.isFinite(meanValue) ||
      meanValue <= 0 ||
      !Number.isFinite(stdValue) ||
      stdValue < 0
    ) {
      return;
    }
    onCommit(meanStdToMedianVariance(meanValue, stdValue));
  };

  return (
    <>
      <TextField
        size="small"
        type="number"
        label="Mean"
        sx={{ width: "9rem" }}
        disabled={disabled}
        value={mean}
        inputProps={{ min: 0, step: "any" }}
        onChange={(event) => setMean(event.target.value)}
        onBlur={() => commit(mean, std)}
      />
      <TextField
        size="small"
        type="number"
        label="Std deviation"
        sx={{ width: "9rem" }}
        disabled={disabled}
        value={std}
        inputProps={{ min: 0, step: "any" }}
        onChange={(event) => setStd(event.target.value)}
        onBlur={() => commit(mean, std)}
      />
    </>
  );
};

const GroupPopulation: FC<Props> = ({ group, project, disabled }) => {
  const [updateSubjectGroup] = useSubjectGroupPartialUpdateMutation();
  const { data: covariates, refetch: refetchCovariates } = useCovariateListQuery(
    { projectId: project.id },
    { skip: !project.id },
  );
  const { data: populations, refetch: refetchPopulations } =
    useCovariatePopulationListQuery(
      { projectId: project.id },
      { skip: !project.id },
    );
  const [createCovariate] = useCovariateCreateMutation();
  const [destroyCovariate] = useCovariateDestroyMutation();
  const [updateCovariate] = useCovariatePartialUpdateMutation();
  const [createPopulation] = useCovariatePopulationCreateMutation();
  const [updatePopulation] = useCovariatePopulationPartialUpdateMutation();

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"CONT" | "CAT">("CONT");
  const [newCategories, setNewCategories] = useState(2);
  const [newReference, setNewReference] = useState(1);

  const patchGroup = (patch: Record<string, unknown>) => {
    updateSubjectGroup({
      id: group.id,
      patchedSubjectGroup: patch,
    });
  };

  const groupPopulations = (populations || []).filter(
    (population) => population.subject_group === group.id,
  );
  const populationFor = (
    covariate: CovariateRead,
  ): CovariatePopulationRead | undefined =>
    groupPopulations.find((population) => population.covariate === covariate.id);

  const commitPopulation = async (
    covariate: CovariateRead,
    patch: Partial<CovariatePopulationRead>,
  ) => {
    const existing = populationFor(covariate);
    if (existing) {
      await updatePopulation({
        id: existing.id,
        patchedCovariatePopulation: patch,
      });
    } else {
      await createPopulation({
        covariatePopulation: {
          subject_group: group.id,
          covariate: covariate.id,
          ...patch,
        },
      });
    }
    refetchPopulations();
  };

  const addCovariate = async () => {
    if (!newName) {
      return;
    }
    await createCovariate({
      covariate: {
        project: project.id,
        name: newName,
        type: newType,
        n_categories: newType === "CAT" ? newCategories : undefined,
        reference_value: newType === "CONT" ? newReference : undefined,
      },
    });
    setNewName("");
    setNewReference(1);
    refetchCovariates();
    // the backend creates default populations for every group; refresh so the
    // pre-filled defaults show immediately
    refetchPopulations();
  };

  const removeCovariate = async (covariate: CovariateRead) => {
    await destroyCovariate({ id: covariate.id });
    refetchCovariates();
  };

  return (
    <Box sx={{ padding: "1rem 0" }}>
      <Typography variant="h6" sx={{ display: "flex", alignItems: "center" }}>
        Population{" "}
        <HelpButton title="Population">
          <p>
            This information is only used if a covariate is selected for one or
            more parameters (on the Model &rarr; Parameters tab). The study size
            sets the number of simulated individuals; age, male-to-female ratio
            and region drive the built-in weight/age/sex covariates.
          </p>
          <p>
            Each individual&apos;s built-in covariates are <em>sampled</em> as
            below; a continuous covariate&apos;s effect is then <em>centred</em>
            on a fixed reference value (separate from the sampling distribution):
          </p>
          <ul style={{ margin: "0.25rem 0", paddingLeft: "1.5rem" }}>
            <li>
              <strong>Age</strong> &mdash; drawn from a uniform distribution
              between the Age min and Age max values; centred on a fixed
              reference of 25.
            </li>
            <li>
              <strong>Sex</strong> &mdash; each individual is male with
              probability equal to the male:female ratio, otherwise female
              (0&nbsp;=&nbsp;female, 1&nbsp;=&nbsp;male).
            </li>
            <li>
              <strong>Weight</strong> &mdash; sampled from a log-normal whose
              arithmetic mean and standard deviation (kg) depend on the region
              and the individual&apos;s sex (indicative default values):
              <ul style={{ margin: "0.25rem 0", paddingLeft: "1.5rem" }}>
                {REGION_OPTIONS.map(({ value, label }) => {
                  const weights =
                    weightPopulations.regions[value] ??
                    weightPopulations.default;
                  return (
                    <li key={value}>
                      {label} &mdash; female {weights.female.mean}&nbsp;&plusmn;
                      &nbsp;{weights.female.std}, male {weights.male.mean}
                      &nbsp;&plusmn;&nbsp;{weights.male.std}
                    </li>
                  );
                })}
              </ul>
              The weight effect is centred on the project&apos;s species weight,
              so the weight covariate is only available for human-species
              projects.
            </li>
          </ul>
        </HelpButton>
      </Typography>
      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", marginTop: 1 }}>
        <NumberField
          label="Study size (N)"
          defaultValue={group.study_size}
          disabled={disabled}
          min={1}
          integer
          onCommit={(value) => patchGroup({ study_size: value })}
        />
        <NumberField
          label="Age min"
          defaultValue={group.age_min}
          disabled={disabled}
          onCommit={(value) => patchGroup({ age_min: value })}
        />
        <NumberField
          label="Age max"
          defaultValue={group.age_max}
          disabled={disabled}
          onCommit={(value) => patchGroup({ age_max: value })}
        />
        <NumberField
          label="Male:female ratio"
          defaultValue={group.m2f_ratio}
          disabled={disabled}
          onCommit={(value) => patchGroup({ m2f_ratio: value })}
        />
        <Select
          size="small"
          disabled={disabled}
          sx={{ width: "11rem" }}
          value={group.population_region ?? "EU"}
          onChange={(event) =>
            patchGroup({ population_region: event.target.value })
          }
        >
          {REGION_OPTIONS.map((option) => (
            <MenuItem value={option.value} key={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      <Typography
        variant="h6"
        sx={{ display: "flex", alignItems: "center", marginTop: 2 }}
      >
        Custom covariates{" "}
        <HelpButton title="Custom covariates">
          <p>
            Define your own covariates (e.g. albumin, GFR, ethnicity) and set
            their distribution for this population. Attach them to parameters on
            the Model → Parameters tab.
          </p>
          <p>Per-individual values are sampled from the distribution you set:</p>
          <ul style={{ margin: "0.25rem 0", paddingLeft: "1.5rem" }}>
            <li>
              <strong>Continuous</strong> &mdash; sampled from a log-normal with
              the arithmetic <em>mean</em> and <em>standard deviation</em> you
              set for this group. Its effect is centred on the covariate&apos;s
              reference value (a separate, per-covariate value), not on the
              sampling mean.
            </li>
            <li>
              <strong>Categorical</strong> &mdash; each category is drawn with
              the probability you assign to it (probabilities are normalised to
              sum to 1); if left unset they default to a uniform distribution
              over the categories. Category&nbsp;0 is the base category.
            </li>
          </ul>
        </HelpButton>
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ marginTop: 1 }}>
        <TextField
          size="small"
          label="Name"
          value={newName}
          disabled={disabled}
          onChange={(event) => setNewName(event.target.value)}
        />
        <Select
          size="small"
          value={newType}
          disabled={disabled}
          onChange={(event) => setNewType(event.target.value as "CONT" | "CAT")}
        >
          <MenuItem value="CONT">Continuous</MenuItem>
          <MenuItem value="CAT">Categorical</MenuItem>
        </Select>
        {newType === "CAT" && (
          <TextField
            size="small"
            type="number"
            label="Categories"
            sx={{ width: "7rem" }}
            value={newCategories}
            disabled={disabled}
            onChange={(event) =>
              setNewCategories(Math.max(2, parseInt(event.target.value) || 2))
            }
          />
        )}
        {newType === "CONT" && (
          <TextField
            size="small"
            type="number"
            label="Reference value"
            sx={{ width: "9rem" }}
            value={newReference}
            disabled={disabled}
            inputProps={{ min: 0, step: "any" }}
            onChange={(event) =>
              setNewReference(parseFloat(event.target.value) || 0)
            }
          />
        )}
        <Button
          variant="contained"
          onClick={addCovariate}
          disabled={disabled || newName.trim() === ""}
        >
          Add covariate
        </Button>
      </Stack>

      <Stack spacing={1} sx={{ marginTop: 1 }}>
        {(covariates || []).map((covariate) => {
          const population = populationFor(covariate);
          return (
            <Stack
              key={covariate.id}
              direction="row"
              spacing={1}
              alignItems="center"
            >
              <Typography sx={{ width: "10rem" }}>{covariate.name}</Typography>
              {covariate.type === "CAT" ? (
                <TextField
                  size="small"
                  label="Category probabilities (comma separated)"
                  sx={{ width: "20rem" }}
                  disabled={disabled}
                  defaultValue={(population?.category_probabilities || []).join(
                    ", ",
                  )}
                  onBlur={(event) => {
                    const probabilities = event.target.value
                      .split(",")
                      .map((value) => parseFloat(value.trim()))
                      .filter((value) => !Number.isNaN(value));
                    commitPopulation(covariate, {
                      category_probabilities: probabilities,
                    });
                  }}
                />
              ) : (
                <>
                  <ContinuousCovariateFields
                    population={population}
                    disabled={disabled}
                    onCommit={(patch) => commitPopulation(covariate, patch)}
                  />
                  {/* reference is per-covariate (centres the effect), not per-group */}
                  <TextField
                    size="small"
                    type="number"
                    label="Reference value"
                    sx={{ width: "9rem" }}
                    disabled={disabled}
                    defaultValue={covariate.reference_value ?? ""}
                    inputProps={{ min: 0, step: "any" }}
                    onBlur={async (event) => {
                      const value = parseFloat(event.target.value);
                      if (event.target.value !== "" && value > 0) {
                        await updateCovariate({
                          id: covariate.id,
                          patchedCovariate: { reference_value: value },
                        });
                        refetchCovariates();
                      }
                    }}
                  />
                </>
              )}
              <IconButton
                size="small"
                disabled={disabled}
                onClick={() => removeCovariate(covariate)}
              >
                <RemoveCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
};

export default GroupPopulation;
