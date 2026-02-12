import { TableCell, TextField } from "@mui/material";
import { ChangeEvent, FC } from "react";

type NumericTableCellProps = {
  id: string;
  disabled: boolean;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string | number | null | undefined;
};
export const NumericTableCell: FC<NumericTableCellProps> = ({
  id,
  disabled,
  label,
  onChange,
  value,
}) => {
  return (
    <TableCell sx={{ width: "10rem" }}>
      <TextField
        id={id}
        disabled={disabled}
        label={label}
        value={value}
        onChange={onChange}
        type="number"
        size="small"
        margin="dense"
        slotProps={{
          inputLabel: {
            shrink: true,
          },
        }}
      />
    </TableCell>
  );
};
