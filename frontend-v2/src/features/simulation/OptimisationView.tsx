import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { BiomarkerTypeRead, CombinedModelRead, CompoundRead, OptimiseResponse, SimulationPlot, SubjectGroupRead, UnitRead, VariableRead } from "../../app/backendApi";
import { SubjectBiomarker } from "../../hooks/useDataset";
import { optimisePredictionsToSimulateResponses } from "./utils";
import OptimisationResidualPlots from "./OptimisationResidualPlots";
import OptimisationCovarianceTable from "./OptimisationCovarianceTable";

type OptimisationViewProps = {
  open: boolean;
  onClose: () => void;
  optimiseResult: OptimiseResponse | null;
  variables: VariableRead[];
  units: UnitRead[];
  groups: SubjectGroupRead[] | undefined;
  biomarkerTypes: BiomarkerTypeRead[];
  subjectBiomarkers: SubjectBiomarker[][] | undefined;
  model: CombinedModelRead;
  compound: CompoundRead;
  visibleGroups: string[];
  plots: SimulationPlot[];
};

function formatNum(x: number): string {
  const abs = Math.abs(x);
  if (abs === 0) return "0";
  const e = Math.floor(Math.log10(abs));
  return e > 4 || e < -4 ? x.toExponential(3) : String(parseFloat(x.toPrecision(4)));
}

function isNearBound(optimal: number, lower: number, upper: number): boolean {
  const range = upper - lower;
  if (range === 0) return false;
  const frac = (optimal - lower) / range;
  return frac < 0.001 || frac > 0.999;
}

function conditionNumberColour(cn: number): string {
  if (cn < 100) return "success.main";
  if (cn < 1000) return "warning.main";
  return "error.main";
}

const OptimisationView = ({
  open,
  onClose,
  optimiseResult,
  variables,
  units,
  groups,
  biomarkerTypes,
  subjectBiomarkers: _subjectBiomarkers,
  model: _model,
  compound: _compound,
  visibleGroups: _visibleGroups,
  plots: _plots,
}: OptimisationViewProps) => {
  const predictions =
    optimiseResult?.predictions
      ? optimisePredictionsToSimulateResponses(
          optimiseResult.predictions as { [key: string]: unknown }[],
          variables,
        )
      : null;

  const residuals =
    optimiseResult?.residuals
      ? optimisePredictionsToSimulateResponses(
          optimiseResult.residuals as { [key: string]: unknown }[],
          variables,
        )
      : null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle sx={{ fontWeight: "bold" }}>Last Optimisation Result</DialogTitle>
      <DialogContent dividers>
        {!optimiseResult ? (
          <Typography>No optimisation has been run yet.</Typography>
        ) : (
          <Stack spacing={3} sx={{ marginTop: ".5rem" }}>
            {/* Summary */}
            <Stack spacing={0.5}>
              <Typography variant="subtitle1" fontWeight="bold">Summary</Typography>
              <Typography>Loss: {formatNum(optimiseResult.loss)}</Typography>
              <Typography>Reason: {optimiseResult.reason}</Typography>
            </Stack>

            <Divider />

            {/* Optimisation inputs */}
            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight="bold">Optimisation Inputs</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Parameter</strong></TableCell>
                    <TableCell><strong>Starting</strong></TableCell>
                    <TableCell><strong>Lower bound</strong></TableCell>
                    <TableCell><strong>Upper bound</strong></TableCell>
                    <TableCell><strong>Optimal</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {optimiseResult.inputs.map((varId, i) => {
                    const variable = variables.find((v) => v.id === varId);
                    const unit = units.find((u) => u.id === variable?.unit);
                    const label = variable
                      ? `${variable.name}${unit?.symbol ? ` (${unit.symbol})` : ""}`
                      : String(varId);
                    return (
                      <TableRow key={varId}>
                        <TableCell>{label}</TableCell>
                        <TableCell>{formatNum(optimiseResult.starting[i])}</TableCell>
                        <TableCell>{formatNum(optimiseResult.bounds[0][i])}</TableCell>
                        <TableCell>{formatNum(optimiseResult.bounds[1][i])}</TableCell>
                        <TableCell sx={isNearBound(optimiseResult.optimal[i], optimiseResult.bounds[0][i], optimiseResult.bounds[1][i]) ? { color: "error.main", fontWeight: "bold" } : {}}>
                          {formatNum(optimiseResult.optimal[i])}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {optimiseResult.log_sigma != null && optimiseResult.sigma_bounds != null && optimiseResult.sigma != null && (
                    <TableRow>
                      <TableCell>Log sigma</TableCell>
                      <TableCell>{formatNum(optimiseResult.log_sigma)}</TableCell>
                      <TableCell>{formatNum(optimiseResult.sigma_bounds[0])}</TableCell>
                      <TableCell>{formatNum(optimiseResult.sigma_bounds[1])}</TableCell>
                      <TableCell sx={isNearBound(Math.log(optimiseResult.sigma), optimiseResult.sigma_bounds[0], optimiseResult.sigma_bounds[1]) ? { color: "error.main", fontWeight: "bold" } : {}}>
                        {formatNum(Math.log(optimiseResult.sigma))}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Stack direction="row" spacing={4} sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Method:</strong> {optimiseResult.method}
                </Typography>
                {optimiseResult.max_iterations != null && (
                  <Typography variant="body2">
                    <strong>Max iterations:</strong> {optimiseResult.max_iterations}
                  </Typography>
                )}
                <Typography variant="body2">
                  <strong>Noise model:</strong> {optimiseResult.use_multiplicative_noise ? "multiplicative" : "additive"}
                </Typography>
              </Stack>
              {optimiseResult.biomarker_types && optimiseResult.biomarker_types.length > 0 && (
                <Typography variant="body2">
                  <strong>Biomarker types:</strong>{" "}
                  {optimiseResult.biomarker_types
                    .map((id) => biomarkerTypes.find((b) => b.id === id)?.name ?? String(id))
                    .join(", ")}
                </Typography>
              )}
              {optimiseResult.subject_groups && optimiseResult.subject_groups.length > 0 && (
                <Typography variant="body2">
                  <strong>Subject groups:</strong>{" "}
                  {optimiseResult.subject_groups
                    .map((id) => groups?.find((g) => g.id === id)?.name ?? String(id))
                    .join(", ")}
                </Typography>
              )}
            </Stack>

            <Divider />
            {predictions && residuals && predictions.length > 0 && residuals.length > 0 && (
              <>
                <Stack spacing={1}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Residual Diagnostics
                  </Typography>
                  <OptimisationResidualPlots
                    predictions={predictions}
                    residuals={residuals}
                    variables={variables}
                    groups={groups}
                  />
                </Stack>
                <Divider />
              </>
            )}

            {/* Covariance / correlation matrix */}
            {optimiseResult.covariance && (
              <>
                <Stack spacing={1}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Parameter Uncertainty
                  </Typography>
                  {optimiseResult.condition_number !== null && (
                    <Typography>
                      Condition number:{" "}
                      <Typography
                        component="span"
                        color={conditionNumberColour(optimiseResult.condition_number)}
                        fontWeight="bold"
                      >
                        {optimiseResult.condition_number.toExponential(3)}
                      </Typography>
                      {optimiseResult.condition_number < 100
                        ? " (well-conditioned)"
                        : optimiseResult.condition_number < 1000
                          ? " (moderate)"
                          : " (ill-conditioned)"}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Diagonal: %RSE (green &lt;20%, amber 20–50%, red &gt;50%).
                    Off-diagonal: correlation (green &lt;0.5, amber 0.5–0.9, red &gt;0.9).
                  </Typography>
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <OptimisationCovarianceTable
                      covariance={optimiseResult.covariance}
                      optimal={optimiseResult.optimal}
                      inputVariableIds={optimiseResult.inputs}
                      variables={variables}
                    />
                  </Box>
                </Stack>
              </>
            )}
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
