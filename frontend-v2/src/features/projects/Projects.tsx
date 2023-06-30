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
} from "@mui/material";
import { Compound, Project, useCompoundCreateMutation, useProjectCreateMutation, useProjectListQuery, useCombinedModelCreateMutation, useSimulationCreateMutation, SimulationPlot, useUnitListQuery, useVariableListQuery } from "../../app/backendApi";
import ProjectRow from "./Project";
import { RootState } from "../../app/store";
import AddIcon from '@mui/icons-material/Add';
import { PublicOutlined } from "@mui/icons-material";
import DropdownButton from "../../components/DropdownButton";
import { api } from "../../app/api";

const ProjectTable: React.FC = () => {
  const selectedProject = useSelector((state: RootState) => state.main.selectedProject);
  const { data: projects, isLoading } = useProjectListQuery()
  const user = useSelector((state: RootState) => state.login.user);

  const { data: units, isLoading: unitsLoading } = useUnitListQuery({})

  const [addProject] = useProjectCreateMutation()
  const [addCombinedModel] = useCombinedModelCreateMutation()
  const [addCompound] = useCompoundCreateMutation()
  const [addSimulation] = useSimulationCreateMutation()

  if (isLoading || unitsLoading) {
    return <div>Loading...</div>;
  }
  
  
  const handleAddRow = (type: 'SM' | 'LM') => {
    const user_access = [{ id: user?.id || 0, read_only: false, user: user?.id || 0 , project: 0}]
    let project: Project = { id: 0, name: 'new', description: '', compound: 0, user_access, users: [user?.id || 0], protocols: [] }
    let compound: Compound | undefined = undefined;
    if (type === 'SM') {
      compound = {id: 0, name: 'new', description: '', compound_type: 'SM', efficacy_experiments: []};
    } else if (type === 'LM') {
      compound = {id: 0, name: 'new', description: '', compound_type: 'LM', efficacy_experiments: [], molecular_mass: 150000, fraction_unbound_plasma: 1.0, target_concentration: 1.0};
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
        addCombinedModel({ combinedModel: { id: 0, name: `model for project ${project.data.id}`, project: project.data.id, mappings: [], receptor_occupancies: [], components: '', variables: [], mmt: '', time_unit: 0 }})
        .then((combinedModel) => {
          if ('data' in combinedModel) {
            const defaultXUnit = combinedModel.data.time_unit
            const defaultPlot: SimulationPlot = {
              id: 0,
              y_axes: [],
              cx_lines: [],
              index: 0,
              x_unit: defaultXUnit,
              y_unit: null,
              y_unit2: null,
            }
            addSimulation({ simulation: { id: 0, name: `default`, project: project.data.id, sliders: [], plots: [], time_max_unit: defaultXUnit }})
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
            <TableCell>Name</TableCell>
            <TableCell>Species</TableCell>
            <TableCell>Compound</TableCell>
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
          {projects?.map((project) => (
            <ProjectRow key={project.id} project={project} isSelected={selectedProject === project.id} />
          ))}
        </TableBody>
      
      </Table>
    </TableContainer>
  );
};

export default ProjectTable;
