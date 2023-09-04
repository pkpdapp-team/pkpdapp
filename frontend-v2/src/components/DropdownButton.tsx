import { Button, IconButton, ListItem, ListItemButton, ListItemText, Popover } from '@mui/material';
import React, { useState } from 'react';

type Option = {
  label: string;
  value: any;
};

type Props = {
  options: Option[];
  onOptionSelected: (value: any) => void;
  children?: React.ReactNode;
  disabled?: boolean;
  data_cy?: string;
  useIcon?: boolean;
};

const DropdownButton: React.FC<Props> = ({ data_cy, options, onOptionSelected, children, disabled, useIcon }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  if (useIcon === undefined) {
    useIcon = true;
  }

  const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
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
    <div data-cy={data_cy}>
      {useIcon ? (
        <IconButton onClick={handleButtonClick} disabled={isDisabled}>
          {children}
        </IconButton>
      ) : (
        <Button variant='contained' onClick={handleButtonClick} disabled={isDisabled}>
          {children}
        </Button>
      )}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        data-cy={`dropdown-button-popover`}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {options.map((option, index) => (
          <ListItemButton key={index} onClick={() => handleOptionSelected(option)} data-cy={`${data_cy}-option-${option.label}`}>
            <ListItemText primary={option.label} />
          </ListItemButton>
        ))}
      </Popover>
    </div>
  );
};

export default DropdownButton;