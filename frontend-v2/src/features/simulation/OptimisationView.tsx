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
import HelpButton from "../../components/HelpButton";

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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" PaperProps={{ sx: { maxHeight: "calc(100vh - 128px)", mt: "64px" } }}>
      <DialogTitle sx={{ fontWeight: "bold" }}>Last Optimisation Result</DialogTitle>
      <DialogContent dividers>
        {!optimiseResult ? (
          <Typography>No optimisation has been run yet.</Typography>
        ) : (
          <Stack spacing={3} sx={{ marginTop: ".5rem" }}>
            {/* Summary */}
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center">
                <Typography variant="subtitle1" fontWeight="bold">Summary</Typography>
                <HelpButton title="Summary">
                  <p>
                    <strong>Loss:</strong> The minimised negative log-likelihood (NLL)
                    value at the optimal parameters. Lower is better.
                  </p>
                  <p>
                    <strong>Reason:</strong> Why the optimiser stopped — either
                    convergence was achieved or the maximum number of iterations was
                    reached.
                  </p>
                </HelpButton>
              </Stack>
              <Typography>Loss: {formatNum(optimiseResult.loss)}</Typography>
              <Typography>Reason: {optimiseResult.reason}</Typography>
            </Stack>

            <Divider />

            {/* Optimisation inputs */}
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center">
                <Typography variant="subtitle1" fontWeight="bold">Optimisation Inputs</Typography>
                <HelpButton title="Optimisation Inputs">
                  <p>
                    Shows the parameters that were optimised, their starting values,
                    bounds, and the optimal values found by the optimiser.
                  </p>
                  <p>
                    Parameters whose optimal value is at or very near a bound
                    (&lt;0.1% from the edge) are highlighted in <strong style={{ color: "#d32f2f" }}>red</strong>,
                    indicating the true optimum may lie outside the specified range.
                  </p>
                  <p>
                    <strong>Log sigma</strong> is the log of the noise standard deviation
                    parameter (σ = exp(log_sigma)) that is jointly optimised with the
                    model parameters.
                  </p>
                </HelpButton>
              </Stack>
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
                  <Stack direction="row" alignItems="center">
                    <Typography variant="subtitle1" fontWeight="bold">
                      Residual Diagnostics
                    </Typography>
                    <HelpButton title="Residual Diagnostics">
                      <p>
                        Residuals are the normalised differences between model predictions
                        and observed data, divided by the estimated σ.
                      </p>
                      <p>
                        For <strong>additive noise</strong>: residual = (prediction − observed) / σ
                      </p>
                      <p>
                        For <strong>multiplicative noise</strong>: residual = (log(prediction) − log(observed)) / σ
                      </p>
                      <p>
                        Well-fitted models should show residuals randomly scattered around
                        zero with no systematic patterns. Look for:
                      </p>
                      <ul style={{ margin: "0.25rem 0", paddingLeft: "1.5rem" }}>
                        <li>Trends over time suggesting model misspecification</li>
                        <li>Increasing spread suggesting heteroscedasticity</li>
                        <li>Clusters of large residuals suggesting outliers</li>
                      </ul>
                    </HelpButton>
                  </Stack>
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
                  <Stack direction="row" alignItems="center">
                    <Typography variant="subtitle1" fontWeight="bold">
                      Parameter Uncertainty
                    </Typography>
                    <HelpButton title="Parameter Uncertainty" maxWidth="500px">
                      <p>
                        The covariance matrix is estimated from the Jacobian (J) of
                        residuals at the optimum:
                      </p>
                      <p style={{ fontFamily: "monospace", margin: "0.5rem 0" }}>
                        Cov = σ² · (JᵀJ)⁻¹
                      </p>
                      <p>
                        The <strong>correlation matrix</strong> is derived from the covariance
                        matrix by normalising each entry by the standard deviations of the
                        corresponding parameters:
                      </p>
                      <p style={{ fontFamily: "monospace", margin: "0.5rem 0" }}>
                        Corr[i,j] = Cov[i,j] / (√Cov[i,i] · √Cov[j,j])
                      </p>
                      <p>
                        Values range from −1 to +1. A correlation near ±1 between two
                        parameters means they are difficult to distinguish from the data
                        (structurally or practically non-identifiable).
                      </p>
                      <p><strong>Diagonal (%RSE):</strong> Percent relative standard error
                        = 100 × √(Cov[i,i]) / |optimal[i]|. Colour coding:</p>
                      <ul style={{ margin: "0.25rem 0", paddingLeft: "1.5rem" }}>
                        <li><span style={{ color: "#2e7d32" }}>Green</span>: &lt;20% (well determined)</li>
                        <li><span style={{ color: "#ed6c02" }}>Amber</span>: 20–50% (moderate uncertainty)</li>
                        <li><span style={{ color: "#d32f2f" }}>Red</span>: &gt;50% (poorly determined)</li>
                      </ul>
                      <p><strong>Off-diagonal (correlation):</strong> Pearson correlation
                        between parameters. Colour coding:</p>
                      <ul style={{ margin: "0.25rem 0", paddingLeft: "1.5rem" }}>
                        <li><span style={{ color: "#2e7d32" }}>Green</span>: |r| &lt; 0.5</li>
                        <li><span style={{ color: "#ed6c02" }}>Amber</span>: 0.5 ≤ |r| &lt; 0.9</li>
                        <li><span style={{ color: "#d32f2f" }}>Red</span>: |r| ≥ 0.9 (highly correlated)</li>
                      </ul>
                      <p><strong>Condition number:</strong> Computed from the SVD of the
                        correlation matrix as the ratio of the largest to smallest singular
                        value (κ = s_max / s_min). Indicates how
                        well-identified the parameters are:</p>
                      <ul style={{ margin: "0.25rem 0", paddingLeft: "1.5rem" }}>
                        <li><span style={{ color: "#2e7d32" }}>Green</span>: &lt;100 (well-conditioned)</li>
                        <li><span style={{ color: "#ed6c02" }}>Amber</span>: 100–1000 (moderate)</li>
                        <li><span style={{ color: "#d32f2f" }}>Red</span>: &gt;1000 (ill-conditioned, parameters may not be identifiable)</li>
                      </ul>
                    </HelpButton>
                  </Stack>
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
