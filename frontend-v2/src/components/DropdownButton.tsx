import {
  Button,
  IconButton,
  ListItemButton,
  ListItemText,
  Popover,
  SxProps,
} from "@mui/material";
import { FC, MouseEvent, ReactNode, useState } from "react";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

type Option = {
  label: string;
  value: any;
};

type Props = {
  options: Option[];
  onOptionSelected: (value: any) => void;
  children?: ReactNode;
  disabled?: boolean;
  data_cy?: string;
  useIcon?: boolean;
  sx?: SxProps;
  variant?: "text" | "outlined" | "contained";
};

const DropdownButton: FC<Props> = ({
  data_cy,
  options,
  onOptionSelected,
  children,
  disabled,
  useIcon,
  sx,
  variant = "contained",
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  if (useIcon === undefined) {
    useIcon = true;
  }

  const handleButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleOptionSelected = (option: Option) => {
    setAnchorEl(null);
    onOptionSelected(option.value);
  };

  const open = Boolean(anchorEl);
  const isDisabled = disabled || options.length === 0;

  if (data_cy === undefined) {
    data_cy = `dropdown-button`;
  }

  return (
    <div>
      {useIcon ? (
        <IconButton
          sx={sx}
          onClick={handleButtonClick}
          disabled={isDisabled}
          data-cy={data_cy}
        >
          {children}
        </IconButton>
      ) : (
        <Button
          sx={sx}
          variant={variant}
          onClick={handleButtonClick}
          disabled={isDisabled}
          data-cy={data_cy}
          endIcon={<ArrowDropDownIcon />}
        >
          {children}
        </Button>
      )}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        data-cy={`dropdown-button-popover`}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        style={{ zIndex: 9999 }}
      >
        {options.map((option, index) => (
          <ListItemButton
            key={index}
            onClick={() => handleOptionSelected(option)}
            data-cy={`${data_cy}-option-${option.label}`}
          >
            <ListItemText primary={option.label} />
          </ListItemButton>
        ))}
      </Popover>
    </div>
  );
};

export default DropdownButton;
