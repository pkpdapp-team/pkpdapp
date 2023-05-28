import { Button, ListItem, ListItemButton, ListItemText, Popover } from '@mui/material';
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

  return (
    <div>
      <Button onClick={handleButtonClick} variant='contained'>{children}</Button>
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