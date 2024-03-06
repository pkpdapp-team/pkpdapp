import { FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import {
  ProjectAccess,
  ProjectRead,
  useUserListQuery,
} from "../../app/backendApi";
import { Control } from "react-hook-form";
import { FormData } from "./Project";
import { Delete } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../login/loginSlice";

interface Props {
  open: boolean;
  project: ProjectRead;
  userAccess: ProjectAccess[];
  append: (value: ProjectAccess) => void;
  remove: (index: number) => void;
  control: Control<FormData>;
  onClose: () => void;
}

const UserAccess: FC<Props> = ({
  open,
  userAccess,
  append,
  remove,
  control,
  onClose,
}) => {

  const { data: users } = useUserListQuery();

  // create map from user id to user object
  const userMap = new Map();
  users?.forEach((user) => {
    userMap.set(user.id, user);
  });

  

  const addUser = (id: number) => {
    append({ user: id, read_only: true });
  };

  const deleteAccess = (access: ProjectAccess, index: number) => () => {
    remove(index);
  }

  const currentUser = useSelector(selectCurrentUser);
  const myUserId = currentUser?.id || 0;

  // create list of user options for select
  const userOptions = users?.filter(user => user.id !== myUserId).map((user) => {
    return { value: user.id, label: user.username };
  });
  userOptions?.push({ value: 0, label: "Add User" });

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>User Access</DialogTitle>
      <DialogContent>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Remove Access</TableCell>
                <TableCell>
                  <FormControl fullWidth>
                    <Select
                      value={0}
                      onChange={(e) => addUser(e.target.value as number)}
                    >
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
              {userAccess.map((user, i) => {
                const isMe = user.user === myUserId;
                const userName = userMap.get(user.user)?.username;
                return (
                  <TableRow key={user.user}>
                    <TableCell>{userName}</TableCell>
                    <TableCell>
                    {!isMe && (
                      <IconButton onClick={deleteAccess(user, i)}>
                        <Delete />
                      </IconButton>
                    )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
    </Dialog>
  );
};

export default UserAccess;
