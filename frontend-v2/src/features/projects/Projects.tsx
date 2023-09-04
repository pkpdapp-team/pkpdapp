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
  Button,
  Stack,
  IconButton,
} from "@mui/material";
import { Compound, Project, useCompoundCreateMutation, useProjectCreateMutation, useProjectListQuery, useCombinedModelCreateMutation, useSimulationCreateMutation, SimulationPlot, useUnitListQuery, useVariableListQuery, useCompoundListQuery } from "../../app/backendApi";
import ProjectRow from "./Project";
import { RootState } from "../../app/store";
import AddIcon from '@mui/icons-material/Add';
import { PublicOutlined } from "@mui/icons-material";
import DropdownButton from "../../components/DropdownButton";
import { api } from "../../app/api";
import SortIcon from '@mui/icons-material/Sort';

enum SortOptions {
  CREATED = "created",
  NAME = "name",
  SPECIES = "species",
  COMPOUND = "compound",
}

const ProjectTable: React.FC = () => {
  const [sortBy, setSortBy] = React.useState<SortOptions>(SortOptions.CREATED);

  const handleSortBy = (option: SortOptions) => {
    setSortBy((prev) => {
      if (prev === option) {
        return SortOptions.CREATED;
      }
      return option;
    });
  };

  const selectedProject = useSelector((state: RootState) => state.main.selectedProject);
  const { data: projectsUnordered, isLoading } = useProjectListQuery()
  const user = useSelector((state: RootState) => state.login.user);
  const { data: compounds, isLoading: compoundsLoading } = useCompoundListQuery();

  let projects = projectsUnordered ? [ ...projectsUnordered ] : undefined;

  const { data: units, isLoading: unitsLoading } = useUnitListQuery({})

  const [addProject] = useProjectCreateMutation()
  const [addCombinedModel] = useCombinedModelCreateMutation()
  const [addCompound] = useCompoundCreateMutation()
  const [addSimulation] = useSimulationCreateMutation()

  if (isLoading || unitsLoading || compoundsLoading) {
    return <div>Loading...</div>;
  }

  const compoundNames = compounds?.reduce((acc: {[key: number]: string}, compound: Compound) => {
    acc[compound.id] = compound.name;
    return acc;
  }, {});

  if (sortBy === SortOptions.CREATED) {
    projects?.sort((a: Project, b: Project) => {
      return (Date.parse(a.created) > Date.parse(b.created)) ? -1 : 1;
    })
  } else if (sortBy === SortOptions.NAME) {
    projects?.sort((a: Project, b: Project) => {
      return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
    })
  } else if (sortBy === SortOptions.SPECIES) {
    projects?.sort((a: Project, b: Project) => {
      const species_a = a.species?.toLowerCase() || '';
      const species_b = b.species?.toLowerCase() || '';
      return (species_a < species_b) ? -1 : 1;
    })
  } else if (sortBy === SortOptions.COMPOUND) {
    projects?.sort((a: Project, b: Project) => {
      if (!compoundNames) {
        return 0;
      }
      const compound_a = compoundNames[a.compound]?.toLowerCase() || '';
      const compound_b = compoundNames[b.compound]?.toLowerCase() || '';
      return (compound_a < compound_b) ? -1 : 1;
    })
  }

  const projectNames = projects?.map((project) => project.name) || [];
  
  
  const handleAddRow = (type: 'SM' | 'LM') => {
    const user_access = [{ id: user?.id || 0, read_only: false, user: user?.id || 0 , project: 0}]
    let new_name = 'new';
    let name_exists = projectNames.includes(new_name);
    let append = 0;
    while (name_exists) {
      append += 1;
      new_name = `new${append}`;
      name_exists = projectNames.includes(new_name);
    }
    let project: Project = { id: 0, name: new_name, description: '', compound: 0, user_access, users: [user?.id || 0], protocols: [], created: '' }
    let compound: Compound | undefined = undefined;
    if (type === 'SM') {
      compound = {id: 0, name: 'new', description: '', compound_type: 'SM', efficacy_experiments: [], dissociation_constant: 500};
    } else if (type === 'LM') {
      compound = {id: 0, name: 'new', description: '', compound_type: 'LM', efficacy_experiments: [], molecular_mass: 150000, fraction_unbound_plasma: 1.0, dissociation_constant: 1};
    }
    if (!compound) {
      return
    }
    addCompound({ compound }).unwrap()
    .then((compound) => {
      project.compound = compound.id || 0
      project.user_access[0].project = project.id
      return addProject({ project })
    })
    .then((project) => {
      if ('data' in project) {
        addCombinedModel({ combinedModel: { id: 0, name: `model for project ${project.data.id}`, project: project.data.id, mappings: [], derived_variables: [], components: '', variables: [], mmt: '', time_unit: 0 }})
        .then((combinedModel) => {
          if ('data' in combinedModel) {
            const defaultXUnit = units?.find((u) => u.symbol === 'h')?.id || combinedModel.data.time_unit;
            const defaultSimultationTime = compound?.compound_type === 'SM' ? 48 : 672;
            const defaultPlot: SimulationPlot = {
              id: 0,
              y_axes: [],
              cx_lines: [],
              index: 0,
              x_unit: defaultXUnit,
              y_unit: null,
              y_unit2: null,
            }
            addSimulation({ simulation: { id: 0, name: `default`, project: project.data.id, sliders: [], plots: [], time_max_unit: defaultXUnit, time_max: defaultSimultationTime }})
          }
        });
      }
    });
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding='checkbox'>Select</TableCell>
            <TableCell>Name <IconButton color={sortBy === SortOptions.NAME ? "success": undefined} onClick={() => handleSortBy(SortOptions.NAME)}><SortIcon /></IconButton></TableCell>
            <TableCell>Species <IconButton color={sortBy === SortOptions.SPECIES? "success": undefined} onClick={() => handleSortBy(SortOptions.SPECIES)}><SortIcon /></IconButton></TableCell>
            <TableCell>Compound <IconButton color={sortBy === SortOptions.COMPOUND? "success": undefined} onClick={() => handleSortBy(SortOptions.COMPOUND)}><SortIcon /></IconButton></TableCell>
            <TableCell>Actions</TableCell>
            <TableCell>
              <Stack direction="row" spacing={2} alignItems={'center'}>
                Modality
                <DropdownButton options={[{label: 'Small Molecule', value: 'SM'}, {label: 'Large Molecule', value: 'LM'}]} onOptionSelected={(value: 'SM' | 'LM') => handleAddRow(value)}>
                  <AddIcon />
                </DropdownButton>
              </Stack>
            </TableCell>
            <TableCell align="right">
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
            <ProjectRow key={project.id} project={project} otherProjectNames={projectNames.slice(0, i).concat(projectNames.slice(i + 1))} isSelected={selectedProject === project.id} />
          ))}
        </TableBody>
      
      </Table>
    </TableContainer>
  );
};

export default ProjectTable;
