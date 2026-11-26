import { FC, useEffect, useState } from "react";
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
  Chip,
} from "@mui/material";
import {
  ProjectAccess,
  ProjectRead,
  UserRead,
  useUserListQuery,
  useUserPlaceholderCreateMutation,
  useUserSearchQuery,
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
  id: number | null;
  username: string;
  firstName: string;
  lastName: string;
  isPlaceholder: boolean;
}

const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 300;

const PlaceholderChip: FC = () => (
  <Chip
    size="small"
    label="not yet logged in"
    sx={{ marginLeft: "0.5rem" }}
  />
);

const fullName = (firstName?: string, lastName?: string) =>
  `${firstName || ""} ${lastName || ""}`.trim();

const optionLabel = (option: UserOption) => {
  const name = fullName(option.firstName, option.lastName);
  return name ? `${option.username} (${name})` : option.username;
};

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
  const [debouncedQuery, setDebouncedQuery] = useState("");
  // users created as placeholders in this session (not yet in the cached list)
  const [addedUsers, setAddedUsers] = useState<UserRead[]>([]);
  const [createPlaceholder] = useUserPlaceholderCreateMutation();

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedQuery(inputValue.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data: searchResults, isFetching } = useUserSearchQuery(
    { q: debouncedQuery },
    { skip: debouncedQuery.length < MIN_SEARCH_LENGTH },
  );

  const tooShort = inputValue.trim().length < MIN_SEARCH_LENGTH;

  // create map from user id to user object
  const userMap = new Map<number, UserRead>();
  users?.forEach((user) => {
    userMap.set(user.id, user);
  });
  addedUsers.forEach((user) => {
    userMap.set(user.id, user);
  });

  const addUser = (id: number) => {
    append({ user: id, read_only: true });
  };

  const selectOption = async (option: UserOption) => {
    let id = option.id;
    if (id === null) {
      // user is in the directory but has never logged in: create a placeholder
      try {
        const created = await createPlaceholder({
          username: option.username,
        }).unwrap();
        setAddedUsers((prev) => [...prev, created]);
        id = created.id;
      } catch {
        return;
      }
    }
    addUser(id);
  };

  const deleteAccess = (access: ProjectAccess, index: number) => () => {
    remove(index);
  };

  const currentUser = useSelector(selectCurrentUser);
  const myUserId = currentUser?.id || 0;
  const sharedUsers = userAccess.map(({ user }) => user);

  // create list of user options for the autocomplete
  const userOptions: UserOption[] =
    tooShort
      ? []
      : (searchResults || [])
          .filter(
            (user) =>
              user.id !== myUserId &&
              (user.id === null || !sharedUsers.includes(user.id)),
          )
          .map((user) => ({
            id: user.id,
            username: user.username,
            firstName: user.first_name || "",
            lastName: user.last_name || "",
            isPlaceholder: user.is_placeholder,
          }));

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
                    <TableCell>
                      {userName}
                      {userData?.profile?.is_placeholder && (
                        <PlaceholderChip />
                      )}
                    </TableCell>
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
            isOptionEqualToValue={(option, value) =>
              option.username === value.username
            }
            // results are already filtered server side
            filterOptions={(options) => options}
            loading={isFetching}
            renderOption={(props, option) => (
              <li {...props} key={option.username}>
                {optionLabel(option)}
                {option.isPlaceholder && (
                  <PlaceholderChip />
                )}
              </li>
            )}
            noOptionsText={
              tooShort
                ? `Type at least ${MIN_SEARCH_LENGTH} characters to search`
                : isFetching
                  ? "Searching..."
                  : "No users found"
            }
            onChange={(_event, newValue) => {
              if (newValue) {
                selectOption(newValue);
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
