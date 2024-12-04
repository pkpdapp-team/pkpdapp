import {
  Box,
  Modal,
  Typography,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { TableHeader } from "../../components/TableHeader";

export const CodeModal = ({ isOpen, onClose, code }: { isOpen: boolean, onClose: () => void, code: string }) => {
  return (
    <Modal onClose={onClose} open={isOpen}>
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>

          <TableHeader label="Code" />
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
            </Box>
          <Typography
            sx={{
              whiteSpace: "pre-wrap",
              maxHeight: "50vh",
              overflow: "auto",
              marginTop: '1rem',
              backgroundColor: 'WhiteSmoke',
              padding: '6px',
              border: '1px solid dimgray'
            }}
          >
            {code}
          </Typography>
        </Box>
      </Box>
    </Modal>
  );
};
