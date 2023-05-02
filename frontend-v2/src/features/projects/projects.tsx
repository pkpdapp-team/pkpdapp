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
  TextField,
  IconButton,
  Select,
  MenuItem,
} from "@mui/material";
import { Delete, Save } from "@mui/icons-material";
import { api } from "../../app/api";
import { Project, useDestroyProjectMutation, useListProjectsQuery, useUpdateProjectMutation } from "../../app/backendApi";

const ProjectTable: React.FC = () => {
  const dispatch = useDispatch();
  const { data: projects, error, isLoading } = useListProjectsQuery()

  const [
    updateProject, // This is the mutation trigger
    { isLoading: isUpdating }, // This is the destructured mutation result
  ] = useUpdateProjectMutation()

  const [
    destroyProject, // This is the mutation trigger
    { isLoading: isDestroying }, // This is the destructured mutation result
  ] = useDestroyProjectMutation()
  

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Compound</TableCell>
            <TableCell>Actions</TableCell>
            <TableCell>Modality</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {projects?.map((project) => {
            const { register, handleSubmit, control } = useForm<Project>({
              defaultValues: project,
            });

            const handleSave = (project: Project) => {
              updateProject({ id: `${project.id}`, project });
            };

            const handleDelete = () => {
              destroyProject({id: `${project.id}`});
            };

            return (
              <TableRow key={project.id}>
                <form onSubmit={handleSubmit(handleSave)}>
                  <TableCell>
                    <TextField
                      {...register("name", { required: true })}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      {...register("description", { required: true })}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      {...register("compound", { required: true })}
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton type="submit">
                      <Save />
                    </IconButton>
                    <IconButton onClick={handleDelete}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Controller
                      name="modality"
                      control={control}
                      render={({ field }) => (
                        <Select {...field} fullWidth>
                          <MenuItem value="LM">LM</MenuItem>
                          <MenuItem value="SM">SM</MenuItem>
                        </Select>
                      )}
                    />
                  </TableCell>
                </form>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProjectTable;
