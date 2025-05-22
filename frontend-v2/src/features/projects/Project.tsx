// src/components/ProjectTable.tsx
import { FC, useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import useDataset from "../../hooks/useDataset";
import {
  TableCell,
  TableRow,
  IconButton,
  Radio,
  Typography,
  Tooltip,
  Stack,
  TextField as MaterialTextField,
  Chip,
  FormControl,
  InputLabel,
  Autocomplete,
} from "@mui/material";
import Delete from "@mui/icons-material/Delete";
import PersonAdd from "@mui/icons-material/PersonAdd";
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
  useProjectAccessDestroyMutation,
} from "../../app/backendApi";
import UserAccess from "./UserAccess";
import {
  decrementDirtyCount,
  incrementDirtyCount,
  setProject,
} from "../main/mainSlice";
import TextField from "../../components/TextField";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { selectCurrentUser, selectIsProjectShared } from "../login/loginSlice";
import { RootState } from "../../app/store";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { DescriptionModal } from "./Description";
import { useProjectDescription } from "../../shared/contexts/ProjectDescriptionContext";

interface Props {
  project: ProjectRead;
  isSelected: boolean;
  otherProjectNames: string[];
  isAnyProjectSelected: boolean;
  allTags: string[];
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

const ProjectRow: FC<Props> = ({
  project,
  isSelected,
  isAnyProjectSelected,
  otherProjectNames,
  allTags,
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

  const [projectCopyUpdate] = useProjectCopyUpdateMutation();
  const [isEditMode, setIsEditMode] = useState(false);
  const {
    isDescriptionModalOpen,
    onOpenDescriptionModal,
    onCloseDescriptionModal,
    descriptionProjectId,
  } = useProjectDescription();

  useEffect(() => {
    setIsEditMode(false);
  }, [isSelected]);

  const modalityOptions = [
    { value: "SM", label: "Small Molecule" },
    { value: "LM", label: "Large Molecule" },
  ];

  const { dataset, addDataset } = useDataset(project.id);

  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  const { data: compound, isLoading } = useCompoundRetrieveQuery({
    id: project.compound,
  });
  const defaultCompound: CompoundRead = {
    id: 1,
    name: "",
    description: "",
    compound_type: "SM",
    efficacy_experiments: [],
    molecular_mass: 100,
    target_molecular_mass: 100,
  };
  const formValues = project && compound ? { project, compound } : undefined;
  const { reset, handleSubmit, control, setValue, register } =
    useForm<FormData>({
      defaultValues: { project, compound: defaultCompound },
      values: formValues,
    });

  const [userAccessOpen, setUserAccessOpen] = useState<boolean>(false);

  const {
    fields: userAccess,
    append,
    remove,
  } = useFieldArray<FormData>({
    control,
    name: "project.user_access",
  });

  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );
  const currentUser = useSelector((state: RootState) =>
    selectCurrentUser(state),
  );
  const [projectAccessDestroy] = useProjectAccessDestroyMutation();

  const handleSave = useMemo(
    () =>
      handleSubmit((data: FormData) => {
        if (compound && project) {
          if (JSON.stringify(compound) !== JSON.stringify(data.compound)) {
            dispatch(incrementDirtyCount());
            updateCompound({ id: compound.id, compound: data.compound }).then(
              () => dispatch(decrementDirtyCount()),
            );
          }
          if (JSON.stringify(project) !== JSON.stringify(data.project)) {
            dispatch(incrementDirtyCount());
            updateProject({ id: project.id, project: data.project }).then(() =>
              dispatch(decrementDirtyCount()),
            );
          }
        }
      }),
    [handleSubmit, compound, project, updateCompound, updateProject, dispatch],
  );

  const onCancel = () => {
    setValue("project.description", project.description);
  };

  const onShareCanel = () => {
    setValue("project.user_access", project.user_access);
    setUserAccessOpen(false);
    setIsEditMode(false);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (compound === undefined) {
    return <div>Error: cannot find compound...</div>;
  }

  const handleDeleteProject = () => {
    destroyProject({ id: project.id });
    dispatch(setProject(null));
  };

  const handleRemoveUserAccess = () => {
    const projectAccess = project.user_access.find(
      (access) => access.user === currentUser?.id,
    );
    if (projectAccess) {
      projectAccessDestroy({ id: projectAccess.id });
    }
  };

  const handleDelete = isSharedWithMe
    ? handleRemoveUserAccess
    : handleDeleteProject;

  const userAccessClose = () => {
    setUserAccessOpen(false);
  };

  const handleSelectProject = () => {
    if (dataset === undefined) {
      addDataset(project.id);
    }
    dispatch(setProject(project.id));
  };

  const defaultProps = {
    fullWidth: true,
    disabled: isSharedWithMe,
  };

  const defaultSx = {
    backgroundColor: "white",
  };

  const validateName = (value: string) => {
    if (otherProjectNames.includes(value)) {
      return "Name must be unique";
    }
    return true;
  };

  const tags = project.tags == "" ? [] : project.tags.split(",").map((tag) => tag.trim());

  const copyProject = () => {
    projectCopyUpdate({ id: project.id, project: project });
  };

  const deleteMessage = isSharedWithMe
    ? "This will remove this shared project from your list, the original project will be unaffected, do you wish to proceed?"
    : "Are you sure you want to permanently delete this project? If it is shared with any other users, it will be removed from their list as well";
  const deleteTooltip = isSharedWithMe
    ? "Remove shared project from your list"
    : "Delete Project";

  const getRowNumber = () => {
    if (window.innerHeight < 800) return Math.ceil(window.innerHeight / 100);

    return 15;
  };

  const unusedTags = allTags.filter((tag) => !tags.includes(tag));

  return (
    <>
      <TableRow
        data-cy={`project-${project.id}`}
        style={{ backgroundColor: isSelected ? "#E3E9F8" : "#FFF" }}
      >
        <TableCell sx={{ verticalAlign: "top" }} padding="checkbox">
          <Radio
            sx={{
              marginTop: 2,
              color: isAnyProjectSelected ? "inherit" : "red",
            }}
            checked={isSelected}
            onClick={handleSelectProject}
            size="small"
            id={`project-${project.id}`}
          />
        </TableCell>
        <TableCell>
          {isEditMode ? (
            <TextField
              name="project.name"
              control={control}
              textFieldProps={defaultProps}
              size="small"
              rules={{ required: true, validate: validateName }}
              sx={{ ...defaultSx, minWidth: "10rem" }}
            />
          ) : (
            <label htmlFor={`project-${project.id}`}>
              <Typography>{project?.name}</Typography>
            </label>
          )}
        </TableCell>
        <TableCell>
          {isEditMode ? (
            <TextField
              name="compound.name"
              control={control}
              textFieldProps={defaultProps}
              size="small"
              rules={{ required: true }}
              sx={{ ...defaultSx, minWidth: "10rem" }}
            />
          ) : (
            <Typography>{compound?.name}</Typography>
          )}
        </TableCell>
        <TableCell>
          {
            modalityOptions.find((m) => m.value === compound.compound_type)
              ?.label
          }
        </TableCell>
        <TableCell>
          <Typography component="span">
            {speciesOptions.find((s) => s.value === project.species)?.label}
          </Typography>
        </TableCell>
        <TableCell>
          {isEditMode ? (
            <Autocomplete
              multiple
              freeSolo
              id="tags-standard"
              options={unusedTags}
              getOptionLabel={(option) => option}
              defaultValue={tags}
              onChange={(event, value) => setValue("project.tags", value.join(","))}
              renderInput={(params) => (
                <MaterialTextField
                  {...params}
                  variant="standard"
                />
              )}
            />
          ) : (
            <Stack direction="row" spacing={0.5}>
              {tags.map((tag) => (
                <Chip key={tag} label={tag} />
              ))}
            </Stack>
          )}
        </TableCell>
        <TableCell>
          <Typography component="span">
            {isEditMode ? (
              <Typography
                sx={{ color: "blue", cursor: "pointer" }}
                onClick={() => onOpenDescriptionModal(project.id)}
              >
                {project?.description?.length ? "Read" : "Add"}
              </Typography>
            ) : (
              <Typography
                onClick={() => onOpenDescriptionModal(project.id)}
                sx={{ color: "blue", cursor: "pointer" }}
              >
                {project?.description?.length ? "Read" : ""}
              </Typography>
            )}
          </Typography>
        </TableCell>
        <TableCell>
          {!isEditMode ? (
            <Stack component="span" direction="row" spacing={0.0}>
              <Tooltip title="Edit project">
                <IconButton
                  disabled={isSharedWithMe}
                  onClick={() => setIsEditMode(true)}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <ConfirmationDialog
                open={showConfirmDelete}
                title={deleteTooltip}
                message={deleteMessage}
                onConfirm={handleDelete}
                onCancel={() => setShowConfirmDelete(false)}
              />
              <Tooltip title="Copy Project">
                <IconButton onClick={copyProject}>
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Share Project">
                <IconButton
                  onClick={() => {
                    setIsEditMode(true);
                    setUserAccessOpen(true);
                  }}
                  disabled={isSharedWithMe}
                >
                  <PersonAdd />
                </IconButton>
              </Tooltip>
              <Tooltip title={deleteTooltip}>
                <IconButton onClick={() => setShowConfirmDelete(true)}>
                  <Delete />
                </IconButton>
              </Tooltip>
              {isSharedWithMe && (
                <Tooltip title="This project is shared with me as view-only">
                  <div>
                    <IconButton disabled>
                      <VisibilityIcon />
                    </IconButton>
                  </div>
                </Tooltip>
              )}
            </Stack>
          ) : (
            <Stack
              sx={{ justifyContent: "center" }}
              component="span"
              direction="row"
              spacing={0.0}
            >
              <Tooltip title="Save changes">
                <IconButton
                  onClick={() => {
                    setIsEditMode(false);
                    handleSave();
                  }}
                >
                  <CheckIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Discard changes">
                <IconButton
                  onClick={() => {
                    setIsEditMode(false);
                    reset();
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </TableCell>
      </TableRow>
      <UserAccess
        open={userAccessOpen}
        onClose={userAccessClose}
        onCancel={onShareCanel}
        control={control}
        userAccess={userAccess as ProjectAccess[]}
        append={append}
        remove={remove}
        project={project}
      />
      {isDescriptionModalOpen && descriptionProjectId === project.id && (
        <DescriptionModal
          isOpen={isDescriptionModalOpen}
          handleOpenChange={() => onCloseDescriptionModal()}
          onCancel={onCancel}
          isEditMode={isEditMode}
          compound={compound}
          project={project}
        >
          <MaterialTextField
            {...register("project.description")}
            sx={{ width: "50vw" }}
            disabled={!isEditMode}
            multiline
            rows={getRowNumber()}
          />
        </DescriptionModal>
      )}
    </>
  );
};

export default ProjectRow;
