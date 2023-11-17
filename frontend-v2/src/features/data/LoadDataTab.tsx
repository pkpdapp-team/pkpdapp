import * as React from 'react';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import Typography from '@mui/material/Typography';
import { blue } from '@mui/material/colors';
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
  const [open, setOpen] = React.useState(false);

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