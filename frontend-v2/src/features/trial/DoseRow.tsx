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
  useDoseRetrieveQuery,
  useDoseUpdateMutation,
} from "../../app/backendApi";
import { Control, useForm, useFormState } from "react-hook-form";
import useDirty from "../../hooks/useDirty";

type Props = {
  baseUnit?: UnitRead;
  control: Control<Protocol>;
  disabled: boolean;
  doseId: number;
  index: number;
  isPreclinical: boolean;
  minStartTime: number;
  onChange: () => void;
  selectedAmountLabel: string;
  timeUnit?: UnitRead;
  version_greater_than_2?: boolean;
};

const DoseRow: FC<Props> = ({
  baseUnit,
  control,
  disabled,
  doseId,
  index,
  isPreclinical,
  minStartTime,
  onChange,
  selectedAmountLabel,
  timeUnit,
  version_greater_than_2 = false,
}) => {
  const { data: dose, refetch: refetchDose } = useDoseRetrieveQuery(
    { id: doseId },
    { skip: !doseId },
  );
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
        await updateDose({ id: doseId, dose: data });
        refetchDose();
        onChange();
      }
    },
    [dose, doseId, refetchDose, updateDose, onChange, reset],
  );

  useEffect(() => {
    if (isDirty && !isSubmitting) {
      const handleSave = handleSubmit(handleFormData);
      handleSave();
    }
  }, [handleSubmit, handleFormData, isDirty, isSubmitting]);

  const defaultProps = {
    disabled,
  };

  const handleDeleteRow = async () => {
    await destroyDose({ id: doseId });
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
            isPreclinicalPerKg={isPreclinical}
            selectProps={defaultProps}
            version_greater_than_2={version_greater_than_2}
          />
        ) : (
          <Typography>{selectedAmountLabel}</Typography>
        )}
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
