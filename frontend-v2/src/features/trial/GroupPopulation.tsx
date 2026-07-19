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
  useCovariatePopulationCreateMutation,
  useCovariatePopulationListQuery,
  useCovariatePopulationPartialUpdateMutation,
  useSubjectGroupPartialUpdateMutation,
} from "../../app/backendApi";
import HelpButton from "../../components/HelpButton";

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

// A number input that patches on blur, seeded from the group value.
const NumberField: FC<{
  label: string;
  defaultValue: number | null | undefined;
  disabled: boolean;
  onCommit: (value: number | null) => void;
}> = ({ label, defaultValue, disabled, onCommit }) => (
  <TextField
    size="small"
    type="number"
    label={label}
    disabled={disabled}
    sx={{ width: "9rem" }}
    defaultValue={defaultValue ?? ""}
    onBlur={(event) => {
      const raw = event.target.value;
      onCommit(raw === "" ? null : parseFloat(raw));
    }}
  />
);

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
  const [createPopulation] = useCovariatePopulationCreateMutation();
  const [updatePopulation] = useCovariatePopulationPartialUpdateMutation();

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"CONT" | "CAT">("CONT");
  const [newCategories, setNewCategories] = useState(2);

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
      },
    });
    setNewName("");
    refetchCovariates();
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
          Describe the virtual population for this group. The study size sets the
          number of simulated individuals; age, male-to-female ratio and region
          drive the built-in weight/age/sex covariates.
        </HelpButton>
      </Typography>
      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", marginTop: 1 }}>
        <NumberField
          label="Study size (N)"
          defaultValue={group.study_size}
          disabled={disabled}
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
          displayEmpty
          disabled={disabled}
          sx={{ width: "11rem" }}
          value={group.population_region ?? ""}
          onChange={(event) =>
            patchGroup({ population_region: event.target.value || null })
          }
        >
          <MenuItem value="">Region…</MenuItem>
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
          Define your own covariates (e.g. albumin, GFR, ethnicity) and set their
          distribution for this population. Attach them to parameters on the
          Model → Parameters tab.
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
        <Button variant="contained" onClick={addCovariate} disabled={disabled}>
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
                  <TextField
                    size="small"
                    type="number"
                    label="Median"
                    sx={{ width: "9rem" }}
                    disabled={disabled}
                    defaultValue={population?.median ?? ""}
                    onBlur={(event) =>
                      commitPopulation(covariate, {
                        median:
                          event.target.value === ""
                            ? null
                            : parseFloat(event.target.value),
                      })
                    }
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Variance"
                    sx={{ width: "9rem" }}
                    disabled={disabled}
                    defaultValue={population?.variance ?? ""}
                    onBlur={(event) =>
                      commitPopulation(covariate, {
                        variance:
                          event.target.value === ""
                            ? null
                            : parseFloat(event.target.value),
                      })
                    }
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
