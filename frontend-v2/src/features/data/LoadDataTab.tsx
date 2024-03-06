import { useState } from 'react';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import LoadDataStepper from './LoadDataStepper';
import { DialogContent } from '@mui/material';

export interface LoadDataDialogProps {
  open: boolean;
  onClose: () => void;
}

function LoadDataDialog(props: LoadDataDialogProps) {
  const { onClose, open } = props;

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog onClose={handleClose} open={open} maxWidth='lg' fullWidth>
      <DialogTitle>Upload New Dataset</DialogTitle>
      <DialogContent>
        <LoadDataStepper /> 
      </DialogContent>
    </Dialog>
  );
}

export default function LoadDataTab() {
  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <Button variant="outlined" onClick={handleClickOpen}>
        Upload New Dataset
      </Button>
      <LoadDataDialog
        open={open}
        onClose={handleClose}
      />
    </div>
  );
}