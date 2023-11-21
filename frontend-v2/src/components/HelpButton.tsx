import React, { useState } from 'react';
import { HelpOutline } from '@mui/icons-material';
import HelpDialog from './HelpDialog';
import { IconButton } from '@mui/material';

interface HelpButtonProps {
  title: string;
  children: React.ReactNode;
}

const HelpButton: React.FC<HelpButtonProps> = ({ title, children }) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <IconButton onClick={handleOpen}>
        <HelpOutline />
      </IconButton>
      <HelpDialog open={open} title={title} onClose={handleClose}>
        {children}
      </HelpDialog>
    </>
  );
};

export default HelpButton;