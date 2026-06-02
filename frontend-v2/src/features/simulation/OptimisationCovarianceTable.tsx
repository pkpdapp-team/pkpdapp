import { FC } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import { VariableRead } from "../../app/backendApi";

interface OptimisationCovarianceTableProps {
  covariance: number[][];
  optimal: number[];
  inputVariableIds: number[];
  variables: VariableRead[];
}

/** Return a MUI sx background colour based on the absolute value of a metric. */
function cellColour(value: number, isDiagonal: boolean): string {
  const abs = Math.abs(value);
  if (isDiagonal) {
    // %RSE thresholds: green < 20, amber 20–50, red > 50
    if (abs < 20) return "#c8e6c9"; // green-100
    if (abs < 50) return "#fff9c4"; // yellow-100
    return "#ffcdd2"; // red-100
  } else {
    // |correlation| thresholds: green < 0.5, amber 0.5–0.9, red > 0.9
    if (abs < 0.5) return "#c8e6c9";
    if (abs < 0.9) return "#fff9c4";
    return "#ffcdd2";
  }
}

/**
 * Dense MUI table showing the covariance matrix.
 *
 * Diagonal cells: %RSE = 100 * sqrt(C_ii) / |p_i|
 * Off-diagonal cells: correlation = C_ij / sqrt(C_ii * C_jj)
 *
 * Cells are coloured green / amber / red according to the value.
 */
const OptimisationCovarianceTable: FC<OptimisationCovarianceTableProps> = ({
  covariance,
  optimal,
  inputVariableIds,
  variables,
}) => {
  const n = covariance.length;
  const cellSize = 80; // px — drives 1:1 aspect ratio
  const tableWidth = cellSize * (n + 1);

  const paramNames = inputVariableIds.map((id) => {
    const v = variables.find((v) => v.id === id);
    return v?.name ?? v?.qname ?? String(id);
  });

  // Precompute diagonal standard errors
  const se = covariance.map((row, i) => Math.sqrt(Math.max(0, row[i])));

  return (
    <Table size="small" sx={{ tableLayout: "fixed", width: tableWidth }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: "bold", width: cellSize }} />
          {paramNames.map((name, i) => (
            <TableCell
              key={i}
              align="center"
              sx={{ fontWeight: "bold", fontSize: "0.75rem", wordBreak: "break-word", width: cellSize }}
            >
              {name}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {covariance.map((row, i) => (
          <TableRow key={i}>
            <TableCell sx={{ fontWeight: "bold", fontSize: "0.75rem", wordBreak: "break-word", width: cellSize }}>
              {paramNames[i]}
            </TableCell>
            {row.map((cellValue, j) => {
              const isDiagonal = i === j;
              let displayValue: number;
              let tooltipText: string;

              if (isDiagonal) {
                const pi = optimal[i];
                displayValue = pi !== 0 ? (100 * se[i]) / Math.abs(pi) : NaN;
                tooltipText = `%RSE = 100 × SE / |p| = 100 × ${se[i].toExponential(3)} / ${Math.abs(pi).toExponential(3)}`;
              } else {
                const denom = se[i] * se[j];
                displayValue = denom > 0 ? cellValue / denom : NaN;
                tooltipText = `Correlation = C_ij / (SE_i × SE_j) = ${cellValue.toExponential(3)} / (${se[i].toExponential(3)} × ${se[j].toExponential(3)})`;
              }

              const bg = isNaN(displayValue) ? "#f5f5f5" : cellColour(displayValue, isDiagonal);

              return (
                <Tooltip key={j} title={tooltipText} arrow>
                  <TableCell
                    align="center"
                    sx={{
                      backgroundColor: bg,
                      fontSize: "0.75rem",
                      padding: 0,
                      width: cellSize,
                      height: cellSize,
                      cursor: "default",
                    }}
                  >
                    {isNaN(displayValue) ? "—" : displayValue.toFixed(isDiagonal ? 1 : 3)}
                    {isDiagonal && !isNaN(displayValue) ? "%" : ""}
                  </TableCell>
                </Tooltip>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default OptimisationCovarianceTable;
