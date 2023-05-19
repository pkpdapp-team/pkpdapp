// src/components/ProjectTable.tsx
import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useSelector, useDispatch } from "react-redux";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import FloatField from "../../components/FloatField";
import { Delete, Save } from "@mui/icons-material";
import { api } from "../../app/api";
import { Compound, Project, ProjectAccess, useCompoundCreateMutation, useProjectCreateMutation, useProjectDestroyMutation, useProjectListQuery, useCompoundRetrieveQuery, useCompoundUpdateMutation, useProjectUpdateMutation, useCombinedModelCreateMutation } from "../../app/backendApi";
import SelectField from "../../components/SelectField";
import ProjectRow from "./Project";
import { RootState } from "../../app/store";

const ProjectTable: React.FC = () => {
  const selectedProject = useSelector((state: RootState) => state.main.selectedProject);
  const dispatch = useDispatch();
  const { data: projects, error, isLoading } = useProjectListQuery()
  const user = useSelector((state: RootState) => state.login.user);

  const [addProject, { isLoading: isAdding }] = useProjectCreateMutation()
  const [addCombinedModel, { isLoading: isAddingCombinedModel }] = useCombinedModelCreateMutation()
  const [addCompound, { isLoading: isAddingCompound }] = useCompoundCreateMutation()

  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  
  
  const modalityOptions = [
    { value: "SM", label: "Small Molecule" },
    { value: "LM", label: "Large Molecule" },
  ]
  
  const handleAddRow = () => {
    const user_access = [{ id: user?.id || 0, read_only: false, user: user?.id || 0 , project: 0}]
    let project: Project = {id: 0, name: 'new', description: '', compound: 0, user_access, users: [user?.id || 0]}
    const compound: Compound = {id: 0, name: 'new', description: '', compound_type: 'SM', efficacy_experiments: [], molecular_mass: 100, target_molecular_mass: 100}
    addCompound({ compound }).unwrap().then((compound) => {
      project.compound = compound.id || 0
      project.user_access[0].project = project.id
      return addProject({ project })
    }).then((project) => {
      if ('data' in project) {
        addCombinedModel({ combinedModel: { id: 0, name: `model for project ${project.data.id}`, project: project.data.id, mappings: [], components: '', variables: [], mmt: '' }})
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
            <ProjectRow key={project.id} project={project} isSelected={selectedProject == project.id} />
          ))}
        </TableBody>
      
      </Table>
    </TableContainer>
  );
};

export default ProjectTable;
