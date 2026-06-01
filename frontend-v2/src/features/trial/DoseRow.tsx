import Delete from "@mui/icons-material/Delete";
import { IconButton, TableCell, TableRow, Typography } from "@mui/material";
import { FC, useCallback, useEffect } from "react";
import FloatField from "../../components/FloatField";
import IntegerField from "../../components/IntegerField";
import UnitField from "../../components/UnitField";
import {
  DoseRead,
  Protocol,
  UnitRead,
  useDoseDestroyMutation,
  useDoseUpdateMutation,
} from "../../app/backendApi";
import { Control, useForm, useFormState } from "react-hook-form";
import useDirty from "../../hooks/useDirty";
import Checkbox from "../../components/Checkbox";

type Props = {
  baseUnit?: UnitRead;
  control: Control<Protocol>;
  disabled: boolean;
  dose: DoseRead;
  index: number;
  minStartTime: number;
  onChange: () => void;
  selectedAmountLabel: string;
  timeUnit?: UnitRead;
};

const DoseRow: FC<Props> = ({
  baseUnit,
  control,
  disabled,
  dose,
  index,
  minStartTime,
  onChange,
  selectedAmountLabel,
  timeUnit,
}) => {
  const {
    control: doseControl,
    handleSubmit,
    reset,
  } = useForm<DoseRead>({
    defaultValues: dose,
    values: dose,
  });
  const { isDirty, isSubmitting } = useFormState({ control: doseControl });
  useDirty(isDirty);

  const [updateDose] = useDoseUpdateMutation();
  const [destroyDose] = useDoseDestroyMutation();

  const handleFormData = useCallback(
    async (data: DoseRead) => {
      if (JSON.stringify(data) !== JSON.stringify(dose)) {
        reset(data);
        await updateDose({ id: dose.id, dose: data });
        onChange();
      }
    },
    [dose, updateDose, reset, onChange],
  );

  useEffect(() => {
    if (isDirty && !isSubmitting) {
      console.log("Saving dose changes...", isDirty, isSubmitting);
      const handleSave = handleSubmit(handleFormData);
      handleSave();
    }
  }, [handleSubmit, handleFormData, isDirty, isSubmitting]);

  const defaultProps = {
    disabled,
  };

  const handleDeleteRow = async () => {
    await destroyDose({ id: dose.id });
    onChange();
  };

  return (
    <TableRow>
      <TableCell>
        <FloatField
          sx={{ minWidth: "6rem" }}
          size="small"
          label={"Dose"}
          name={`amount`}
          control={doseControl}
          rules={{
            required: true,
            min: { value: 0, message: "Must be greater or equal to 0" },
          }}
          textFieldProps={defaultProps}
        />
      </TableCell>
      <TableCell>
        {baseUnit && index === 0 ? (
          <UnitField
            size="small"
            label={"Unit"}
            name={`amount_unit`}
            control={control}
            baseUnit={baseUnit}
            selectProps={defaultProps}
          />
        ) : (
          <Typography>{selectedAmountLabel}</Typography>
        )}
      </TableCell>
      <TableCell>
        <Checkbox
          label=""
          name={`amount_per_body_weight`}
          control={control}
          checkboxFieldProps={{
            ...defaultProps,
            disabled: index !== 0 || disabled,
          }}
        />
      </TableCell>
      <TableCell>
        <IntegerField
          size="small"
          label={"Number of Doses"}
          name={`repeats`}
          control={doseControl}
          rules={{
            required: true,
            min: { value: 1, message: "One or more required" },
          }}
          textFieldProps={defaultProps}
        />
      </TableCell>
      <TableCell>
        <FloatField
          size="small"
          label="Start Time"
          name={`start_time`}
          control={doseControl}
          rules={{
            required: true,
            min: {
              value: minStartTime,
              message: "value > prev. dose or 0",
            },
          }}
          textFieldProps={defaultProps}
        />
      </TableCell>
      <TableCell>
        <FloatField
          size="small"
          label={"Dosing Duration"}
          name={`duration`}
          control={doseControl}
          rules={{
            required: true,
            min: {
              value: Number.EPSILON,
              message: "Must be greater than 0",
            },
          }}
          textFieldProps={defaultProps}
        />
      </TableCell>
      <TableCell>
        <FloatField
          size="small"
          label={"Dosing Interval"}
          name={`repeat_interval`}
          control={doseControl}
          rules={{
            required: true,
            min: {
              value: Number.EPSILON,
              message: "Must be greater than 0",
            },
          }}
          textFieldProps={defaultProps}
        />
      </TableCell>
      <TableCell>
        <Typography>{timeUnit?.symbol}</Typography>
      </TableCell>
      <TableCell align="center">
        {index !== 0 && (
          <IconButton onClick={handleDeleteRow} disabled={disabled}>
            <Delete titleAccess="Remove dose" />
          </IconButton>
        )}
      </TableCell>
    </TableRow>
  );
};

export default DoseRow;
