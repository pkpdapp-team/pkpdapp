import { FC, useState } from "react";
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
  Autocomplete,
  TextField,
  createFilterOptions,
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

interface UserOption {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
}

const MIN_SEARCH_LENGTH = 3;

const fullName = (firstName?: string, lastName?: string) =>
  `${firstName || ""} ${lastName || ""}`.trim();

const optionLabel = (option: UserOption) => {
  const name = fullName(option.firstName, option.lastName);
  return name ? `${option.username} (${name})` : option.username;
};

const defaultFilter = createFilterOptions<UserOption>();

const UserAccess: FC<Props> = ({
  open,
  userAccess,
  append,
  remove,
  onCancel,
  onClose,
}) => {
  const { data: users } = useUserListQuery();
  const [inputValue, setInputValue] = useState("");

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
  const sharedUsers = userAccess.map(({ user }) => user);

  // create list of user options for the autocomplete
  const userOptions: UserOption[] =
    users
      ?.filter((user) => user.id !== myUserId && !sharedUsers.includes(user.id))
      .map((user) => ({
        id: user.id,
        username: user.username,
        firstName: user.first_name || "",
        lastName: user.last_name || "",
      })) || [];

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
                <TableCell>Name</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Remove Access</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userAccess.map((user, i) => {
                const isMe = user.user === myUserId;
                const userData = userMap.get(user.user);
                const userName = userData?.username;
                const name =
                  fullName(userData?.first_name, userData?.last_name) || "—";
                const department = userData?.profile?.department || "—";
                return (
                  <TableRow key={user.user}>
                    <TableCell>{userName}</TableCell>
                    <TableCell>{name}</TableCell>
                    <TableCell>{department}</TableCell>
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
          <Autocomplete
            sx={{ marginTop: "1rem" }}
            options={userOptions}
            value={null}
            inputValue={inputValue}
            onInputChange={(_event, newInputValue) =>
              setInputValue(newInputValue)
            }
            blurOnSelect
            clearOnBlur
            getOptionLabel={optionLabel}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(options, state) =>
              state.inputValue.length < MIN_SEARCH_LENGTH
                ? []
                : defaultFilter(options, state)
            }
            noOptionsText={
              inputValue.length < MIN_SEARCH_LENGTH
                ? `Type at least ${MIN_SEARCH_LENGTH} characters to search`
                : "No users found"
            }
            onChange={(_event, newValue) => {
              if (newValue) {
                addUser(newValue.id);
                setInputValue("");
              }
            }}
            renderInput={(params) => (
              <TextField {...params} label="Add user" data-cy="add-user" />
            )}
          />

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
