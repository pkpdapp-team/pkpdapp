import React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

export default function CreateProjectDialog({open, handleClose}) {

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Create New</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Fill in this form and you will create something new!
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="Name"
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleClose} color="primary">
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}
