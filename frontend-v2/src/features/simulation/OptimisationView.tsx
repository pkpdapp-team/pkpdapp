import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { OptimiseResponse } from "../../app/backendApi";

type OptimisationViewProps = {
  open: boolean;
  onClose: () => void;
  optimiseResult: OptimiseResponse | null;
};

const OptimisationView = ({
  open,
  onClose,
  optimiseResult,
}: OptimisationViewProps) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: "bold" }}>Last Optimisation Result</DialogTitle>
      <DialogContent>
        {!optimiseResult ? (
          <Typography>No optimisation has been run yet.</Typography>
        ) : (
          <Stack spacing={1} sx={{ marginTop: ".5rem" }}>
            <Typography>Loss: {optimiseResult.loss.toFixed(4)}</Typography>
            <Typography>Reason: {optimiseResult.reason}</Typography>
            <Typography>
              Optimal values: {optimiseResult.optimal.map((value) => value.toFixed(4)).join(", ")}
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default OptimisationView;
