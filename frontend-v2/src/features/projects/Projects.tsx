// src/components/ProjectTable.tsx
import React from "react";
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
import { useCustomToast } from "../../hooks/useCustomToast";
import { notificationTypes } from "../../components/Notification/notificationTypes";
import { ReactComponent as FolderLogo } from "../../shared/assets/svg/folder.svg";
import { defaultHeaderSx } from "../../shared/tableHeadersSx";

enum SortOptions {
  CREATED = "created",
  NAME = "name",
  SPECIES = "species",
  COMPOUND = "compound",
}

const SM_SIM_TIME = 48;
const LM_SIM_TIME = 672;
const ProjectTable: React.FC = () => {
  const [sortBy, setSortBy] = React.useState<SortOptions>(SortOptions.CREATED);
  const toast = useCustomToast();

  const handleSortBy = (option: SortOptions) => {
    toast({
      type: notificationTypes.SUCCESS,
      text: "You must complete all mandatory fields",
      autoClose: 35000,
    });
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

  const projects = projectsUnordered ? [...projectsUnordered] : undefined;

  const { data: units, isLoading: unitsLoading } = useUnitListQuery({});

  const [addProject] = useProjectCreateMutation();
  const [addCombinedModel] = useCombinedModelCreateMutation();
  const [addCompound] = useCompoundCreateMutation();
  const [addSimulation] = useSimulationCreateMutation();

  if (isLoading || unitsLoading || compoundsLoading) {
    return <div>Loading...</div>;
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
    const project: Project = {
      name: new_name,
      description: "",
      compound: 0,
      user_access,
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
        if ("data" in newProject) {
          addCombinedModel({
            combinedModel: {
              name: `model for project ${newProject.data.id}`,
              project: newProject.data.id,
              mappings: [],
              derived_variables: [],
            },
          }).then((combinedModel) => {
            if ("data" in combinedModel) {
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
    <TableContainer sx={{ width: "90%" }}>
      <DropdownButton
        useIcon={false}
        data_cy="create-project"
        options={[
          { label: "Small Molecule", value: "SM" },
          { label: "Large Molecule", value: "LM" },
        ]}
        onOptionSelected={(value: "SM" | "LM") => handleAddRow(value)}
      >
        Create new project
      </DropdownButton>
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
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <div style={{ ...defaultHeaderSx, display: "flex" }}>
                  Select
                  <div
                    style={{
                      ...defaultHeaderSx,
                      color: "red",
                      paddingLeft: "5px",
                    }}
                  >
                    *
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>
                  Name{" "}
                  <IconButton
                    color={sortBy === SortOptions.NAME ? "success" : undefined}
                    onClick={() => handleSortBy(SortOptions.NAME)}
                  >
                    <SortIcon />
                  </IconButton>
                </div>
              </TableCell>
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>
                  Species{" "}
                  <IconButton
                    color={
                      sortBy === SortOptions.SPECIES ? "success" : undefined
                    }
                    onClick={() => handleSortBy(SortOptions.SPECIES)}
                  >
                    <SortIcon />
                  </IconButton>
                </div>
              </TableCell>
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>
                  Compound{" "}
                  <IconButton
                    color={
                      sortBy === SortOptions.COMPOUND ? "success" : undefined
                    }
                    onClick={() => handleSortBy(SortOptions.COMPOUND)}
                  >
                    <SortIcon />
                  </IconButton>
                </div>
              </TableCell>
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>Modality</div>
              </TableCell>
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>Actions</div>
              </TableCell>
              <TableCell align="right"></TableCell>
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
              />
            ))}
          </TableBody>
        </Table>
      )}
    </TableContainer>
  );
};

export default ProjectTable;
