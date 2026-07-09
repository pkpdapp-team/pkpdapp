import {
  Alert,
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
                    <strong>Reason:</strong> Why the optimiser stopped — either
                    convergence was achieved or the maximum number of iterations was
                    reached.
                  </p>
                  <p>
                    <strong>−2·ln(L):</strong> twice the absolute
                    negative log-likelihood. AIC and
                    BIC are built directly from this quantity.
                  </p>
                  <p>
                    <strong>AIC</strong> = 2k − 2·ln(L) and{" "}
                    <strong>BIC</strong> = k·ln(n) − 2·ln(L), where k is the number
                    of free parameters (model inputs plus noise σ) and n is the
                    number of observations. Lower is better; both penalise the
                    number of free parameters (BIC more strongly for larger
                    datasets) and are useful for comparing candidate models fit to
                    the same data.
                  </p>
                </HelpButton>
              </Stack>
              <Typography>Reason: {optimiseResult.reason}</Typography>
              {optimiseResult.neg2ll != null && (
                <Typography>−2·ln(L): {formatNum(optimiseResult.neg2ll)}</Typography>
              )}
              {optimiseResult.aic != null && (
                <Typography>AIC: {formatNum(optimiseResult.aic)}</Typography>
              )}
              {optimiseResult.bic != null && (
                <Typography>BIC: {formatNum(optimiseResult.bic)}</Typography>
              )}
              {optimiseResult.filtered_observations != null &&
                optimiseResult.filtered_observations > 0 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    {optimiseResult.filtered_observations} observation
                    {optimiseResult.filtered_observations === 1 ? "" : "s"} with
                    values at or below the threshold (close to zero) were excluded
                    from this fit. The multiplicative noise model takes the
                    logarithm of each observation, which is undefined near zero.
                  </Alert>
                )}
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
                    model parameters. One σ is fitted per observed output variable, so
                    there is a row for each. The <strong>combined</strong> noise model
                    fits two σ per output — an additive σ_a and a proportional σ_m
                    (variance = σ_a² + σ_m²·prediction²) — shown as separate rows.
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
                  {optimiseResult.sigma_variables != null &&
                    optimiseResult.log_sigma != null &&
                    optimiseResult.sigma_bounds != null &&
                    optimiseResult.sigma != null &&
                    optimiseResult.sigma_variables.map((varId, i) => {
                      const variable = variables.find((v) => v.id === varId);
                      const name = variable?.name ?? String(varId);
                      const isCombined = optimiseResult.noise_model === "combined";
                      const bounds = optimiseResult.sigma_bounds![i];
                      const optimalLogSigma = Math.log(optimiseResult.sigma![i]);
                      const additiveLabel = isCombined
                        ? `Log sigma additive (${name})`
                        : `Log sigma (${name})`;
                      const rows = [
                        <TableRow key={`sigma-${varId}`}>
                          <TableCell>{additiveLabel}</TableCell>
                          <TableCell>{formatNum(optimiseResult.log_sigma![i])}</TableCell>
                          <TableCell>{formatNum(bounds[0])}</TableCell>
                          <TableCell>{formatNum(bounds[1])}</TableCell>
                          <TableCell sx={isNearBound(optimalLogSigma, bounds[0], bounds[1]) ? { color: "error.main", fontWeight: "bold" } : {}}>
                            {formatNum(optimalLogSigma)}
                          </TableCell>
                        </TableRow>,
                      ];
                      if (
                        isCombined &&
                        optimiseResult.sigma_mult != null &&
                        optimiseResult.log_sigma_mult != null &&
                        optimiseResult.sigma_bounds_mult != null
                      ) {
                        const boundsM = optimiseResult.sigma_bounds_mult![i];
                        const optimalLogSigmaM = Math.log(
                          optimiseResult.sigma_mult![i],
                        );
                        rows.push(
                          <TableRow key={`sigma-mult-${varId}`}>
                            <TableCell>Log sigma proportional ({name})</TableCell>
                            <TableCell>{formatNum(optimiseResult.log_sigma_mult![i])}</TableCell>
                            <TableCell>{formatNum(boundsM[0])}</TableCell>
                            <TableCell>{formatNum(boundsM[1])}</TableCell>
                            <TableCell sx={isNearBound(optimalLogSigmaM, boundsM[0], boundsM[1]) ? { color: "error.main", fontWeight: "bold" } : {}}>
                              {formatNum(optimalLogSigmaM)}
                            </TableCell>
                          </TableRow>,
                        );
                      }
                      return rows;
                    })}
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
                  <strong>Noise model:</strong> {optimiseResult.noise_model}
                </Typography>
              </Stack>
              {optimiseResult.biomarker_types && optimiseResult.biomarker_types.length > 0 && (
                <Typography variant="body2">
                  <strong>Observations:</strong>{" "}
                  {optimiseResult.biomarker_types
                    .map((id) => {
                      const bt = biomarkerTypes.find((b) => b.id === id);
                      const variable = variables.find((v) => v.id === bt?.variable);
                      return variable?.description
                        ? `${variable.name} (${variable.description})`
                        : variable?.name || bt?.name || String(id);
                    })
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
                        and observed data, divided by that variable&apos;s estimated σ.
                      </p>
                      <p>
                        For <strong>additive noise</strong>: residual = (prediction − observed) / σ
                      </p>
                      <p>
                        For <strong>multiplicative noise</strong>: residual = (log(prediction) − log(observed)) / σ
                      </p>
                      <p>
                        For <strong>combined noise</strong>: residual = (prediction − observed) / √(σ_a² + σ_m²·prediction²)
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
                      <p>
                        Each residual scatter plot has its own <strong>Log x-axis</strong>{" "}
                        toggle for data spanning several orders of magnitude. The
                        Normal QQ plot is shown only when at least 30 residuals are
                        available, below which it is not informative.
                      </p>
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
                        residuals at the optimum, weighted by each observation&apos;s noise
                        variance (W = diag(1/σ²) per output variable):
                      </p>
                      <p style={{ fontFamily: "monospace", margin: "0.5rem 0" }}>
                        Cov = (Jᵀ W J)⁻¹
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
