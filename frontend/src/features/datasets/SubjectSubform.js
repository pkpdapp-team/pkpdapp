import React,{ useEffect }  from "react";
import { useSelector, useDispatch } from "react-redux";
import IconButton from "@material-ui/core/IconButton";
import { useForm, useFormState } from "react-hook-form";
import SaveIcon from "@material-ui/icons/Save";
import AddIcon from "@material-ui/icons/Add";
import DoneIcon from "@material-ui/icons/Done";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";

import { FormCheckboxField, FormTextField } from "../forms/FormComponents";
import { selectSubjectById, updateSubject } from "./subjectsSlice";
import { selectDatasetProtocolById } from "../protocols/DatasetProtocols";

export default function SubjectSubform({ subject, disableSave, groups, dataset }) {
  const dispatch = useDispatch();

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      id: subject.id,
      display: subject.display,
      name: subject.name,
      shape: subject.shape,
    },
  });

  const hasGroup = groups.reduce((sum, group) => {
    sum[group] = subject.groups.find(g => g.name === group) !== undefined
    return sum
  }, {})

  const { isDirty } = useFormState({ control });

  const onSubmit = (values) => {
    console.log("submit subject", values);
    dispatch(updateSubject(values));
  };

  useEffect(() => {
    reset(subject);
  }, [reset, subject]);

  const protocol = dataset.protocols.find(p => p.id === subject.protocol)

  return (
    <TableRow>
      <TableCell>
        {subject.id_in_dataset}
      </TableCell>
      {groups.map((group) => (
        <TableCell>
          {hasGroup[group] && <DoneIcon/>}
        </TableCell>
      ))}
      <TableCell>
        {protocol?.name}
      </TableCell>
      <TableCell>
        <FormCheckboxField
          control={control}
          name={"display"}
          defaultValue={subject.display}
          label={subject.id_in_dataset}
        />
      </TableCell>
      <TableCell>
        <FormTextField
          control={control}
          name={"shape"}
          label={"Shape"}
          type="number"
        />
      </TableCell>
      <TableCell>
      {isDirty && (
        <IconButton
          onClick={handleSubmit(onSubmit)}
          disabled={disableSave}
          size="small"
        >
          <SaveIcon />
        </IconButton>
      )}
      </TableCell>
    </TableRow>
  );
}
