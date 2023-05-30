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
};

const DropdownButton: React.FC<Props> = ({ options, onOptionSelected, children }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);


  const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleOptionSelected = (option: Option) => {
    setAnchorEl(null);
    onOptionSelected(option.value);
  };

  const open = Boolean(anchorEl);
  const disabled = options.length === 0;

  return (
    <div>
      <IconButton onClick={handleButtonClick} disabled={disabled}>{children}</IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {options.map((option, index) => (
          <ListItemButton key={index} onClick={() => handleOptionSelected(option)}>
            <ListItemText primary={option.label} />
          </ListItemButton>
        ))}
      </Popover>
    </div>
  );
};

export default DropdownButton;