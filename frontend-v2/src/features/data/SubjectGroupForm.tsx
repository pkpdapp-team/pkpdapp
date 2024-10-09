import { Box, Button, Input, InputLabel, TextField, Typography } from "@mui/material";
import { GridRowSelectionModel } from "@mui/x-data-grid";
import { FC, FormEvent, useRef } from "react";
import { StepperState } from "./LoadDataStepper";

type SubjectGroup = {
  id: string;
  name: string;
  subjects: string[];
};

interface ISubjectGroupForm {
  group: SubjectGroup;
  state: StepperState;
  selected: GridRowSelectionModel;
}

const SubjectGroupForm: FC<ISubjectGroupForm> = ({
  group,
  selected,
  state,
}) => {
  const selectedGroupInput = useRef<HTMLInputElement>(null);
  const idField = state.fields.find(
    (field) => state.normalisedFields.get(field) === "ID",
  );

  function onSubmitGroupIDForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newValue = selectedGroupInput.current?.value || group.id;
    const newData = [...state.data];
    selected.forEach((id) => {
      newData
        .filter((row) => (idField ? row[idField] === id : false))
        .forEach((row) => {
          row["Group"] = newValue;
          row["Group ID"] = newValue;
        });
    });
    state.setData(newData);
  }

  return (
    <Box
      component="form"
      onSubmit={onSubmitGroupIDForm}
      padding="1rem"
      sx={{
        width: "fit-content",
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <Typography variant="caption" sx={{ marginRight: '1rem'}}>
        {selected?.length} rows selected.
      </Typography>
      <Typography sx={{ marginRight: '1rem'}}>
        New Group ID
      </Typography>
      <TextField
        size='small'
        inputRef={selectedGroupInput}
        type="text"
        id="selected-group"
        defaultValue={group.id}
        sx={{
          fontSize: "0.75rem",
        }}
      />{" "}
      <Button
        type="submit"
        variant="contained"
        sx={{
          fontSize: "0.5rem",
          padding: "0.25rem",
          marginLeft: '1rem'
        }}
      >
        change
      </Button>
    </Box>
  );
};

export default SubjectGroupForm;
