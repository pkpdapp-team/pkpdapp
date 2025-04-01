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
  IconButton,
  Box,
  Button,
  Typography,
} from "@mui/material";
import {
  ProjectAccess,
  ProjectRead,
  useUserListQuery,
} from "../../app/backendApi";
import { Control } from "react-hook-form";
import { FormData } from "./Project";
import Delete from "@mui/icons-material/Delete";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../login/loginSlice";
import DropdownButton from "../../components/DropdownButton";

interface Props {
  open: boolean;
  project: ProjectRead;
  userAccess: ProjectAccess[];
  append: (value: ProjectAccess) => void;
  remove: (index: number) => void;
  onCancel: () => void;
  control: Control<FormData>;
  onClose: () => void;
}

const UserAccess: FC<Props> = ({
  open,
  userAccess,
  append,
  remove,
  onCancel,
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
  };

  const currentUser = useSelector(selectCurrentUser);
  const myUserId = currentUser?.id || 0;
  const sharedUsers = userAccess.map(({ user }) => user)

  // create list of user options for select
  const userOptions = users
    ?.filter((user) => user.id !== myUserId && !sharedUsers.includes(user.id))
    .map((user) => {
      return { value: user.id, label: user.username };
    }) || [];

  return (
    <Dialog maxWidth="lg" open={open} onClose={onClose}>
      <DialogTitle>
        <Typography variant="h4">Share Project</Typography>
      </DialogTitle>
      <DialogContent sx={{ width: "50vw" }}>
        <TableContainer>
          <Typography sx={{ fontWeight: "bold" }}>Shared with:</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Remove Access</TableCell>
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
                          <Delete fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <DropdownButton
            useIcon={false}
            data_cy="add-y-axis"
            options={userOptions}
            onOptionSelected={addUser}
            sx={{ marginTop: '1rem'}}
          >
            Add user
          </DropdownButton>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              margin: ".5rem",
            }}
          >
            <Button
              variant="outlined"
              sx={{ marginLeft: "1rem" }}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              sx={{ marginLeft: "1rem" }}
              onClick={onClose}
            >
              OK
            </Button>
          </Box>
        </TableContainer>
      </DialogContent>
    </Dialog>
  );
};

export default UserAccess;
