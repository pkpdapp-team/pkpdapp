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
} from "@mui/material";
import { Compound, Project, useCompoundCreateMutation, useProjectCreateMutation, useProjectListQuery, useCombinedModelCreateMutation, useSimulationCreateMutation, SimulationPlot, useUnitListQuery } from "../../app/backendApi";
import ProjectRow from "./Project";
import { RootState } from "../../app/store";

const ProjectTable: React.FC = () => {
  const selectedProject = useSelector((state: RootState) => state.main.selectedProject);
  const { data: projects, isLoading } = useProjectListQuery()
  const user = useSelector((state: RootState) => state.login.user);

  const { data: units, isLoading: unitsLoading } = useUnitListQuery()

  const [addProject] = useProjectCreateMutation()
  const [addCombinedModel] = useCombinedModelCreateMutation()
  const [addCompound] = useCompoundCreateMutation()
  const [addSimulation] = useSimulationCreateMutation()

  if (isLoading || unitsLoading) {
    return <div>Loading...</div>;
  }
  
  
  const handleAddRow = () => {
    const user_access = [{ id: user?.id || 0, read_only: false, user: user?.id || 0 , project: 0}]
    let project: Project = { id: 0, name: 'new', description: '', compound: 0, user_access, users: [user?.id || 0], protocols: [] }
    const compound: Compound = {id: 0, name: 'new', description: '', compound_type: 'SM', efficacy_experiments: [], molecular_mass: 100, target_molecular_mass: 100}
    addCompound({ compound }).unwrap()
    .then((compound) => {
      project.compound = compound.id || 0
      project.user_access[0].project = project.id
      return addProject({ project })
    })
    .then((project) => {
      if ('data' in project) {
        addCombinedModel({ combinedModel: { id: 0, name: `model for project ${project.data.id}`, project: project.data.id, mappings: [], receptor_occupancies: [], components: '', variables: [], mmt: '' }})
        const defaultXUnit = units?.find((unit) => unit.symbol === 'h')?.id || 0
        const defaultPlot: SimulationPlot = {
          id: 0,
          y_axes: [],
          cx_lines: [],
          index: 0,
          x_unit: defaultXUnit,
          y_unit: null,
          y_unit2: null,
        }
        addSimulation({ simulation: { id: 0, name: `default`, project: project.data.id, sliders: [], plots: [] }})
      }
    });
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Selected</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Species</TableCell>
            <TableCell>Compound</TableCell>
            <TableCell>Actions</TableCell>
            <TableCell>Modality</TableCell>
            <TableCell align="right">
              <Button variant="contained" color="primary" onClick={handleAddRow}>Add Project</Button>
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
