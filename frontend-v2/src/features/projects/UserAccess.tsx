import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, FormControl, InputLabel, Select, MenuItem, DialogContentText, useTheme } from '@mui/material';
import { Project, ProjectAccess, ProjectRead, useUserListQuery } from '../../app/backendApi';
import { Control } from 'react-hook-form';
import { FormData } from './Project';
import SelectField from '../../components/SelectField';


interface Props {
  open: boolean;
  project: ProjectRead;
  userAccess: ProjectAccess[];
  append: (value: ProjectAccess) => void;
  remove: (index: number) => void;
  control: Control<FormData>;
  onClose: () => void;
}

const UserAccess: React.FC<Props> = ({ open, userAccess, append, remove, control, onClose, project }) => {
  const theme = useTheme();

  const { data: users, error, isLoading } = useUserListQuery()

  // create map from user id to user object
  const userMap = new Map()
  users?.forEach((user) => {
    userMap.set(user.id, user)
  })

  // create list of user options for select
  let userOptions = users?.map((user) => {
    return { value: user.id, label: user.username }
  })
  userOptions?.push({ value: 0, label: "Add User" })

  // user access level options
  const accessLevelOptions = [
    { value: false, label: "Editor" },
    { value: true, label: "Viewer" },
  ]

  const addUser = (id: number) => {
    append({ user: id, read_only: false })
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>User Access</DialogTitle>
      <DialogContent>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Access Level</TableCell>
                <TableCell>
                  <FormControl fullWidth>
                    <Select value={0} onChange={(e) => addUser(e.target.value as number)}>
                      {userOptions?.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userAccess.map((user, i) => (
                <TableRow key={user.user}>
                  <TableCell>{userMap.get(user.user)?.username}</TableCell>
                  <TableCell>
                    <SelectField label="Access" name={`project.user_access.${i}.read_only`} control={control} options={accessLevelOptions} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
    </Dialog>
  );
};

export default UserAccess;