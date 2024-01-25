// src/components/ProjectTable.tsx
import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  TableCell,
  TableRow,
  IconButton,
  Radio,
  Typography,
  Tooltip,
  Stack,
} from "@mui/material";
import { Delete, PersonAdd } from "@mui/icons-material";
import {
  Compound,
  Project,
  ProjectAccess,
  useProjectDestroyMutation,
  useCompoundRetrieveQuery,
  useCompoundUpdateMutation,
  useProjectUpdateMutation,
  CompoundRead,
  ProjectRead,
  useProjectCopyUpdateMutation,
} from "../../app/backendApi";
import UserAccess from "./UserAccess";
import { setProject } from "../main/mainSlice";
import TextField from "../../components/TextField";
import useDirty from "../../hooks/useDirty";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { selectCurrentUser, selectIsProjectShared } from "../login/loginSlice";
import { RootState } from "../../app/store";

interface Props {
  project: ProjectRead;
  isSelected: boolean;
  otherProjectNames: string[];
  isAnyProjectSelected: Boolean;
}

export interface FormData {
  project: Project;
  compound: Compound;
}

export const speciesOptions = [
  { value: "M", label: "Mouse" },
  { value: "R", label: "Rat" },
  { value: "K", label: "Monkey" },
  { value: "H", label: "Human" },
  { value: "O", label: "Other" },
];

const ProjectRow: React.FC<Props> = ({
  project,
  isSelected,
  isAnyProjectSelected,
  otherProjectNames,
}) => {
  const dispatch = useDispatch();
  const [
    updateProject, // This is the destructured mutation result
  ] = useProjectUpdateMutation();

  const [
    updateCompound, // This is the destructured mutation result
  ] = useCompoundUpdateMutation();

  const [
    destroyProject, // This is the destructured mutation result
  ] = useProjectDestroyMutation();

  const [ projectCopyUpdate ] = useProjectCopyUpdateMutation();

  const modalityOptions = [
    { value: "SM", label: "Small Molecule" },
    { value: "LM", label: "Large Molecule" },
  ];

  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  const {
    data: compound,
    isLoading,
  } = useCompoundRetrieveQuery({ id: project.compound });
  const defaultCompound: CompoundRead = {
    id: 1,
    name: "",
    description: "",
    compound_type: "SM",
    efficacy_experiments: [],
    molecular_mass: 100,
    target_molecular_mass: 100,
  };
  const {
    reset,
    handleSubmit,
    control,
    formState: { isDirty },
  } = useForm<FormData>({
    defaultValues: { project, compound: defaultCompound },
  });
  useDirty(isDirty);

  const [userAccessOpen, setUserAccessOpen] = useState<boolean>(false);

  const {
    fields: userAccess,
    append,
    remove,
  } = useFieldArray<FormData>({
    control,
    name: "project.user_access",
  });

  const isSharedWithMe = useSelector((state: RootState) => selectIsProjectShared(state, project));

  useEffect(() => {
    reset({ project, compound });
  }, [project, compound, reset]);

  const handleSave = handleSubmit((data: FormData) => {
    if (compound && project) {
      if (JSON.stringify(compound) !== JSON.stringify(data.compound)) {
        updateCompound({ id: compound.id, compound: data.compound });
      }
      if (JSON.stringify(project) !== JSON.stringify(data.project)) {
        updateProject({ id: project.id, project: data.project });
      }
    }
  });


  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        handleSave();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [handleSave, isDirty]);

  useEffect(
    () => () => {
      handleSave();
    },
    [],
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (compound === undefined) {
    return <div>Error: cannot find compound...</div>;
  }

  const handleDelete = () => {
    destroyProject({ id: project.id });
    dispatch(setProject(null));
  };

  const userAccessClose = () => {
    setUserAccessOpen(false);
  };

  const handleSelectProject = () => {
    dispatch(setProject(project.id));
  };

  const defaultProps = {
    fullWidth: true,
    disabled: isSharedWithMe,
  };

  const defaultSx = {
    backgroundColor: 'white'
  }

  const validateName = (value: string) => {
    if (otherProjectNames.includes(value)) {
      return "Name must be unique";
    }
    return true;
  };

  const copyProject = () => {
    projectCopyUpdate({ id: project.id, project: project });
  }


  return (
    <React.Fragment>
      <TableRow data-cy={`project-${project.id}`} style={{ backgroundColor: isSelected ? '#E3E9F8' : '#FFF' }}>
        <TableCell
          rowSpan={isSelected ? 2 : 1}
          sx={{ verticalAlign: "top" }}
          padding="checkbox"
        >
          <Radio
            sx={{ marginTop: 4, color: isAnyProjectSelected ? 'inherit' : 'red' }}
            checked={isSelected}
            onClick={handleSelectProject}
          />
        </TableCell>
        <TableCell>
          <TextField
            name="project.name"
            control={control}
            textFieldProps={defaultProps}
            rules={{ required: true, validate: validateName }}
            sx={defaultSx}
          />
        </TableCell>
        <TableCell>
          <Typography>
            {speciesOptions.find((s) => s.value === project.species)?.label}
          </Typography>
        </TableCell>
        <TableCell>
          <TextField
            name="compound.name"
            control={control}
            textFieldProps={defaultProps}
            rules={{ required: true }}
            sx={defaultSx}
          />
        </TableCell>
        <TableCell>
          {
            modalityOptions.find((m) => m.value === compound.compound_type)
              ?.label
          }
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={0.0}>
          { !isSharedWithMe ? (
            <>
              <Tooltip title="Delete Project">
              <IconButton onClick={() => setShowConfirmDelete(true)}>
                <Delete />
              </IconButton>
              </Tooltip>
              <ConfirmationDialog
                open={showConfirmDelete}
                title="Delete Project"
                message="Are you sure you want to permanently delete this project?"
                onConfirm={handleDelete}
                onCancel={() => setShowConfirmDelete(false)}
              />
            </>
          ) : (
            <Tooltip title="This project is shared with me as view-only">
            <div>
            <IconButton disabled>
              <VisibilityIcon />
            </IconButton>
            </div>
            </Tooltip>
          )}

          <Tooltip title="Copy Project">
          <IconButton onClick={copyProject}>
            <ContentCopyIcon />
          </IconButton>
          </Tooltip>

          <Tooltip title="Share Project">
          <IconButton onClick={() => setUserAccessOpen(true)} disabled={isSharedWithMe}>
            <PersonAdd />
          </IconButton>
          </Tooltip>
          <UserAccess
            open={userAccessOpen}
            control={control}
            onClose={userAccessClose}
            userAccess={userAccess as ProjectAccess[]}
            append={append}
            remove={remove}
            project={project}
          />
          </Stack>
        </TableCell>
      </TableRow>
      {isSelected && (
        <TableRow style={{ backgroundColor: '#E3E9F8' }}>
          <TableCell colSpan={4}>
            <TextField
              label="Description"
              name="project.description"
              control={control}
              textFieldProps={{ ...defaultProps, multiline: true }}
              sx={defaultSx}
            />
          </TableCell>
          <TableCell colSpan={1} />
        </TableRow>
      )}
    </React.Fragment>
  );
};

export default ProjectRow;
