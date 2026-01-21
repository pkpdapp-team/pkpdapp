// src/components/ProjectTable.tsx
import { FC, useState } from "react";
import { useSelector } from "react-redux";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  SvgIcon,
  Box,
  OutlinedInput,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Chip,
} from "@mui/material";
import {
  Compound,
  Project,
  useCompoundCreateMutation,
  useProjectCreateMutation,
  useProjectListQuery,
  useCombinedModelCreateMutation,
  useSimulationCreateMutation,
  useUnitListQuery,
  useCompoundListQuery,
  CompoundRead,
  ProjectRead,
} from "../../app/backendApi";
import ProjectRow from "./Project";
import { RootState } from "../../app/store";
import DropdownButton from "../../components/DropdownButton";
import SortIcon from "@mui/icons-material/Sort";
import { ReactComponent as FolderLogo } from "../../shared/assets/svg/folder.svg";
import { defaultHeaderSx } from "../../shared/tableHeadersSx";
import useDataset from "../../hooks/useDataset";
import { TableHeader } from "../../components/TableHeader";
import DnsIcon from "@mui/icons-material/Dns";
import { getTableHeight } from "../../shared/calculateTableHeights";
import { useResults } from "../results/useResults";

const PROJECT_TABLE_BREAKPOINTS = [
  {
    minHeight: 1100,
    tableHeight: "80vh",
  },
  {
    minHeight: 1000,
    tableHeight: "80vh",
  },
  {
    minHeight: 900,
    tableHeight: "78vh",
  },
  {
    minHeight: 800,
    tableHeight: "75vh",
  },
  {
    minHeight: 700,
    tableHeight: "70vh",
  },
  {
    minHeight: 600,
    tableHeight: "65vh",
  },
  {
    minHeight: 500,
    tableHeight: "60vh",
  },
  {
    minHeight: 400,
    tableHeight: "55vh",
  },
  {
    minHeight: 300,
    tableHeight: "50vh",
  },
];

enum SortOptions {
  CREATED = "created",
  NAME = "name",
  SPECIES = "species",
  COMPOUND = "compound",
}

const SM_SIM_TIME = 48;
const LM_SIM_TIME = 672;
const ProjectTable: FC = () => {
  const [sortBy, setSortBy] = useState<SortOptions>(SortOptions.CREATED);
  const [filterBy, setFilterBy] = useState<string[]>([]);

  const handleSortBy = (option: SortOptions) => {
    setSortBy((prev) => {
      if (prev === option) {
        return SortOptions.CREATED;
      }
      return option;
    });
  };

  const selectedProject = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const { data: projectsUnordered, isLoading } = useProjectListQuery();
  const user = useSelector((state: RootState) => state.login.user);
  const { data: compounds, isLoading: compoundsLoading } =
    useCompoundListQuery();

  let projects = projectsUnordered ? [...projectsUnordered] : undefined;

  const { data: units, isLoading: unitsLoading } = useUnitListQuery({});

  const [addProject] = useProjectCreateMutation();
  const { createResults } = useResults();
  const [addCombinedModel] = useCombinedModelCreateMutation();
  const [addCompound] = useCompoundCreateMutation();
  const [addSimulation] = useSimulationCreateMutation();
  const { addDataset } = useDataset(selectedProject);

  if (isLoading || unitsLoading || compoundsLoading) {
    return <div>Loading...</div>;
  }

  const allTagsSet = projects?.reduce((acc, project) => {
    if (project.tags) {
      project.tags.split(",").forEach((tag) => {
        acc.add(tag.trim());
      });
    }
    return acc;
  }, new Set<string>());
  const allTags = allTagsSet ? Array.from(allTagsSet) : [];

  if (filterBy.length > 0) {
    projects = projects?.filter((project) => {
      const tags = project.tags ? project.tags.split(",") : [];
      return filterBy.every((tag) => tags.includes(tag));
    });
  }

  const compoundNames = compounds?.reduce(
    (acc: { [key: number]: string }, compound: CompoundRead) => {
      acc[compound.id] = compound.name;
      return acc;
    },
    {},
  );

  if (sortBy === SortOptions.CREATED) {
    projects?.sort((a: ProjectRead, b: ProjectRead) => {
      return Date.parse(a.created) > Date.parse(b.created) ? -1 : 1;
    });
  } else if (sortBy === SortOptions.NAME) {
    projects?.sort((a: ProjectRead, b: ProjectRead) => {
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    });
  } else if (sortBy === SortOptions.SPECIES) {
    projects?.sort((a: ProjectRead, b: ProjectRead) => {
      const species_a = a.species?.toLowerCase() || "";
      const species_b = b.species?.toLowerCase() || "";
      return species_a < species_b ? -1 : 1;
    });
  } else if (sortBy === SortOptions.COMPOUND) {
    projects?.sort((a: ProjectRead, b: ProjectRead) => {
      if (!compoundNames) {
        return 0;
      }
      const compound_a = compoundNames[a.compound]?.toLowerCase() || "";
      const compound_b = compoundNames[b.compound]?.toLowerCase() || "";
      return compound_a < compound_b ? -1 : 1;
    });
  }

  const projectNames = projects?.map((project) => project.name) || [];
  const handleAddRow = (type: "SM" | "LM") => {
    const user_access = [
      { id: user?.id || 0, read_only: false, user: user?.id || 0, project: 0 },
    ];
    const new_name_base = "untitled";
    let new_name = new_name_base;
    let name_exists = projectNames.includes(new_name);
    let append = 0;
    while (name_exists) {
      append += 1;
      new_name = `${new_name_base}${append}`;
      name_exists = projectNames.includes(new_name);
    }

    const kg_unit = units?.find((u) => u.symbol === "kg")?.id;
    const project: Project = {
      name: new_name,
      description: "",
      compound: 0,
      user_access,
      species_weight_unit: kg_unit,
    };

    let compound: Compound | undefined = undefined;
    if (type === "SM") {
      compound = {
        name: "untitled",
        description: "",
        compound_type: "SM",
        efficacy_experiments: [],
        dissociation_constant: 500,
      };
    } else if (type === "LM") {
      compound = {
        name: "untitled",
        description: "",
        compound_type: "LM",
        efficacy_experiments: [],
        molecular_mass: 150000,
        fraction_unbound_plasma: 1.0,
        dissociation_constant: 1,
      };
    }
    if (!compound) {
      return;
    }
    addCompound({ compound })
      .unwrap()
      .then((newCompound) => {
        project.compound = newCompound.id || 0;
        return addProject({ project });
      })
      .then((newProject) => {
        if (newProject?.data) {
          createResults({
            resultsTable: {
              id: 0,
              name: "Table 1",
              project: newProject.data.id,
              columns: "parameters",
              rows: "groups",
              filters: {
                parameterIndex: "columns",
                variableIndex: "rows",
                groupIndex: 0,
                intervalIndex: 0,
              },
            },
          });
          addDataset(newProject.data.id);
          addCombinedModel({
            combinedModel: {
              name: `model for project ${newProject.data.id}`,
              project: newProject.data.id,
              mappings: [],
              derived_variables: [],
              time_intervals: [],
            },
          }).then((combinedModel) => {
            if (combinedModel?.data) {
              const defaultXUnit =
                units?.find((u) => u.symbol === "h")?.id ||
                combinedModel.data.time_unit;
              const defaultSimultationTime =
                compound?.compound_type === "SM" ? SM_SIM_TIME : LM_SIM_TIME;
              addSimulation({
                simulation: {
                  name: `default`,
                  project: newProject.data.id,
                  sliders: [],
                  plots: [],
                  time_max_unit: defaultXUnit,
                  time_max: defaultSimultationTime,
                },
              });
            }
          });
        }
      });
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          paddingBottom: "1rem",
        }}
      >
        <TableHeader id="projects-heading" label="Projects" variant="h4" />
        <DropdownButton
          useIcon={false}
          data_cy="create-project"
          options={[
            { label: "Small Molecule", value: "SM" },
            { label: "Large Molecule", value: "LM" },
          ]}
          onOptionSelected={handleAddRow}
        >
          New Project
        </DropdownButton>
      </Box>
      <FormControl sx={{ m: 1, width: 300 }} size="small">
        <InputLabel id="filter-by-tags-label">Filter By Tag</InputLabel>
        <Select
          labelId="filter-by-tags-label"
          id="filter-by-tags"
          multiple
          value={filterBy}
          onChange={(event) => {
            const {
              target: { value },
            } = event;
            setFilterBy(
              // On autofill we get a stringified value.
              typeof value === "string" ? value.split(",") : value,
            );
          }}
          input={
            <OutlinedInput id="filter-by-tags-chip" label="Filter By Tag" />
          }
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} />
              ))}
            </Box>
          )}
        >
          {allTags.map((tag) => (
            <MenuItem key={tag} value={tag}>
              {tag}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TableContainer
        sx={{
          height: getTableHeight({ steps: PROJECT_TABLE_BREAKPOINTS }),
        }}
      >
        {projects?.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "80vh",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <SvgIcon
              color="primary"
              sx={{ width: "10rem", height: "10rem" }}
              viewBox="0 0 164 124"
            >
              <FolderLogo />
            </SvgIcon>
            <div style={{ fontWeight: "bold", marginTop: "2rem" }}>
              No projects started
            </div>
            <div>Create a new one</div>
          </div>
        ) : (
          <Table stickyHeader size="small" aria-labelledby="projects-heading">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{ borderBottom: "solid 2px blue" }}
                  padding="checkbox"
                >
                  <DnsIcon
                    titleAccess="Selected project"
                    fontSize="small"
                    sx={{ marginTop: ".5rem" }}
                  />
                </TableCell>
                <TableCell sx={{ borderBottom: "solid 2px blue" }}>
                  <div style={{ ...defaultHeaderSx }}>
                    Name{" "}
                    <IconButton
                      color={
                        sortBy === SortOptions.NAME ? "success" : undefined
                      }
                      onClick={() => handleSortBy(SortOptions.NAME)}
                    >
                      <SortIcon titleAccess="Sort by name" />
                    </IconButton>
                  </div>
                </TableCell>
                <TableCell sx={{ borderBottom: "solid 2px blue" }}>
                  <div style={{ ...defaultHeaderSx }}>
                    Compound{" "}
                    <IconButton
                      color={
                        sortBy === SortOptions.COMPOUND ? "success" : undefined
                      }
                      onClick={() => handleSortBy(SortOptions.COMPOUND)}
                    >
                      <SortIcon titleAccess="Sort by compound" />
                    </IconButton>
                  </div>
                </TableCell>
                <TableCell sx={{ borderBottom: "solid 2px blue" }}>
                  <div style={{ ...defaultHeaderSx }}>Modality</div>
                </TableCell>
                <TableCell sx={{ borderBottom: "solid 2px blue" }}>
                  <div style={{ ...defaultHeaderSx }}>
                    Species{" "}
                    <IconButton
                      color={
                        sortBy === SortOptions.SPECIES ? "success" : undefined
                      }
                      onClick={() => handleSortBy(SortOptions.SPECIES)}
                    >
                      <SortIcon titleAccess="Sort by species" />
                    </IconButton>
                  </div>
                </TableCell>
                <TableCell sx={{ borderBottom: "solid 2px blue" }}>
                  <div style={{ ...defaultHeaderSx }}>Tags </div>
                </TableCell>
                <TableCell sx={{ borderBottom: "solid 2px blue" }}>
                  <div style={{ ...defaultHeaderSx }}>Description </div>
                </TableCell>
                <TableCell
                  sx={{ borderBottom: "solid 2px blue" }}
                  width="10rem"
                >
                  <div style={{ ...defaultHeaderSx }}>Actions</div>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No projects found</TableCell>
                </TableRow>
              )}
              {projects?.map((project, i) => (
                <ProjectRow
                  key={project.id}
                  isAnyProjectSelected={Boolean(selectedProject)}
                  project={project}
                  otherProjectNames={projectNames
                    .slice(0, i)
                    .concat(projectNames.slice(i + 1))}
                  isSelected={selectedProject === project.id}
                  allTags={allTags}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </>
  );
};

export default ProjectTable;
