import {
  TableRow,
  TableCell,
  Tooltip,
  Radio,
  Typography,
  Stack,
  IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import Delete from "@mui/icons-material/Delete";

import FloatField from "../../components/FloatField";
import SelectField from "../../components/SelectField";
import TextField from "../../components/TextField";
import {
  EfficacyExperimentRead,
  ProjectRead,
  UnitListApiResponse,
  useEfficacyExperimentUpdateMutation,
} from "../../app/backendApi";
import { useForm, useFormState } from "react-hook-form";
import { useCallback } from "react";
import { RootState } from "../../app/store";
import { useSelector } from "react-redux";
import { selectIsProjectShared } from "../login/loginSlice";

interface Props {
  efficacyExperiment: EfficacyExperimentRead;
  project: ProjectRead;
  units: UnitListApiResponse;
  isSelected: boolean;
  isEditing: boolean;
  disabled: boolean;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  onCancel: () => void;
}

export function EfficacyExperimentForm({
  efficacyExperiment,
  project,
  units,
  isSelected,
  isEditing,
  disabled,
  onSelect,
  onDelete,
  onEdit,
  onCancel,
}: Props) {
  const experimentId = efficacyExperiment?.id;
  const [updateEfficacyExperiment] = useEfficacyExperimentUpdateMutation();
  const { reset, handleSubmit, control, getValues } =
    useForm<EfficacyExperimentRead>({
      defaultValues: efficacyExperiment,
    });
  const { defaultValues } = useFormState({ control });
  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );

  const submitForm = useCallback(
    (data: EfficacyExperimentRead) => {
      const newEfficacyExperiment = {
        ...defaultValues,
        ...data,
      };
      reset(newEfficacyExperiment);
      updateEfficacyExperiment({
        id: efficacyExperiment.id,
        efficacyExperiment: newEfficacyExperiment,
      });
    },
    [defaultValues, efficacyExperiment.id, reset, updateEfficacyExperiment],
  );

  const saveEfficacyExperiment = () => {
    const submit = handleSubmit(submitForm);
    submit();
  };

  const defaultProps = { disabled: isSharedWithMe };

  const c50Unit = units.find((u) => u.symbol === "pmol/L");
  const c50Units = c50Unit?.compatible_units.filter((unit) =>
    [
      "pmol/L",
      "nmol/L",
      "µmol/L",
      "pg/mL",
      "ng/mL",
      "µg/mL",
      "ng/L",
      "µg/L",
      "mg/L",
    ].includes(unit.symbol),
  );
  const c50UnitOpt = c50Units
    ? c50Units.map((unit: { [key: string]: string }) => {
        return { value: unit.id, label: unit.symbol };
      })
    : [];

  return (
    <TableRow key={`efficacy-experiment-${experimentId}`}>
      <TableCell width="5rem" size="small">
        <Tooltip
          arrow
          placement={"top-end"}
          title="Use this efficacy-safety data"
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <Radio
              checked={isSelected}
              onClick={() => onSelect(experimentId)}
              disabled={isSharedWithMe}
              id={`efficacy_experiment-${experimentId}`}
            />
          </div>
        </Tooltip>
      </TableCell>
      <TableCell size="small">
        {isEditing ? (
          <TextField
            size="small"
            sx={{ flex: "1", minWidth: "10rem" }}
            label="Name"
            name={`name`}
            control={control}
            textFieldProps={defaultProps}
          />
        ) : (
          <label htmlFor={`efficacy_experiment-${experimentId}`}>
            <Typography>{getValues("name") || "-"}</Typography>
          </label>
        )}
      </TableCell>
      <TableCell size="small">
        {isEditing ? (
          <FloatField
            size="small"
            sx={{ flex: "1", minWidth: "5rem" }}
            label="C50"
            name={`c50`}
            control={control}
            textFieldProps={defaultProps}
          />
        ) : (
          <Typography>{getValues("c50") || "-"}</Typography>
        )}
      </TableCell>
      <TableCell size="small">
        {isEditing ? (
          <SelectField
            size="small"
            label={"Unit"}
            name={`c50_unit`}
            options={c50UnitOpt}
            control={control}
            selectProps={defaultProps}
          />
        ) : (
          <Typography>
            {units.find((u) => u.id === getValues("c50_unit"))?.symbol || "-"}
          </Typography>
        )}
      </TableCell>
      <TableCell size="small">
        {isEditing ? (
          <FloatField
            size="small"
            sx={{ minWidth: "5rem" }}
            label="Hill-coefficient"
            name={`hill_coefficient`}
            control={control}
            textFieldProps={defaultProps}
          />
        ) : (
          <Typography>{getValues("hill_coefficient") || "-"}</Typography>
        )}
      </TableCell>
      <TableCell width="5rem" size="small">
        {isEditing ? (
          <Stack
            sx={{ justifyContent: "center" }}
            component="span"
            direction="row"
            spacing={0.0}
          >
            <Tooltip arrow title="Save changes">
              <IconButton
                onClick={() => {
                  onCancel();
                  saveEfficacyExperiment();
                }}
              >
                <CheckIcon titleAccess="Save" />
              </IconButton>
            </Tooltip>
            <Tooltip arrow title="Discard changes">
              <IconButton
                onClick={() => {
                  onCancel();
                  reset();
                }}
              >
                <CloseIcon titleAccess="Discard changes" />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Stack component="span" direction="row" spacing={0.0}>
            <Tooltip
              arrow
              title={
                disabled
                  ? "Finish editing efficacy-safety data"
                  : "Edit efficacy-safety data"
              }
            >
              <span>
                <IconButton
                  disabled={disabled}
                  onClick={() => {
                    onEdit(experimentId);
                  }}
                >
                  <EditIcon titleAccess="Edit" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip
              arrow
              title={
                disabled
                  ? "Finish editing efficacy-safety data"
                  : "Delete efficacy-safety data"
              }
            >
              <span>
                <IconButton
                  disabled={disabled}
                  onClick={() => onDelete(experimentId)}
                >
                  <Delete titleAccess="Delete" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        )}
      </TableCell>
    </TableRow>
  );
}
