import {
  Box,
  Modal,
  Typography,
  Stack,
  Divider,
  IconButton,
  Button,
} from "@mui/material";
import { speciesOptions } from "./Project";
import CloseIcon from "@mui/icons-material/Close";
import { Compound, Project } from "../../app/backendApi";

const modalityOptions = [
  { value: "SM", label: "Small Molecule" },
  { value: "LM", label: "Large Molecule" },
];

export const DescriptionModal = ({
  isOpen,
  project,
  compound,
  handleOpenChange,
  isEditMode,
  onCancel,
  children,
}: {
  isOpen: boolean;
  project: Project;
  compound: Compound;
  handleOpenChange: () => void;
  isEditMode: boolean;
  onCancel: () => void;
  children: React.ReactNode;
}) => {
  const species = speciesOptions.find(
    ({ value }) => project?.species === value,
  )?.label;
  const compoundName = compound?.name;
  const modality = modalityOptions.find(
    (m) => m.value === compound?.compound_type,
  )?.label;

  return (
    <Modal onClose={handleOpenChange} open={isOpen}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            width: "50wh",
            backgroundColor: "white",
            display: "flex",
            flexDirection: "column",
            padding: "1rem",
            justifyItems: "center",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h4">{project?.name}</Typography>
            <IconButton onClick={handleOpenChange}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h5">Description</Typography>
          </Box>
          <Stack component="span" direction="row" sx={{ alignItems: "center" }}>
            <Typography sx={{ marginRight: ".5rem" }}>Species:</Typography>
            <Typography sx={{ fontWeight: "bold" }}>{species}</Typography>{" "}
            <Divider
              sx={{
                height: "1.5rem",
                marginLeft: ".5rem",
                marginRight: ".5rem",
              }}
              flexItem
              orientation="vertical"
              variant="middle"
            />
            <Typography sx={{ marginRight: ".5rem" }}>Compound:</Typography>
            <Typography sx={{ fontWeight: "bold" }}>{compoundName}</Typography>
            <Divider
              sx={{
                height: "1.5rem",
                marginLeft: ".5rem",
                marginRight: ".5rem",
              }}
              flexItem
              orientation="vertical"
              variant="middle"
            />
            <Typography sx={{ marginRight: ".5rem" }}>Modality:</Typography>
            <Typography sx={{ fontWeight: "bold" }}>{modality}</Typography>
          </Stack>
          {children}
          {isEditMode && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                margin: ".5rem",
              }}
            >
              <Button
                variant="outlined"
                onClick={() => {
                  onCancel();
                  handleOpenChange();
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                sx={{ marginLeft: "1rem" }}
                onClick={handleOpenChange}
              >
                OK
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Modal>
  );
};
