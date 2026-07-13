import { FC, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  IconButton,
  Stack,
  Box,
  Typography,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import {
  CombinedModelRead,
  CorrelationRead,
  ProjectRead,
  VariableRead,
  useCorrelationListQuery,
  useCorrelationCreateMutation,
  useCorrelationUpdateMutation,
  useCorrelationDestroyMutation,
} from "../../../app/backendApi";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { selectIsProjectShared } from "../../login/loginSlice";
import { defaultHeaderSx } from "../../../shared/tableHeadersSx";
import { TableHeader } from "../../../components/TableHeader";
import HelpButton from "../../../components/HelpButton";
import parameterDisplayName from "./parameterDisplayName";
import paramPriority from "./paramPriority";

interface Props {
  model: CombinedModelRead;
  project: ProjectRead;
  variables: VariableRead[];
}

// square cell size, so the matrix keeps a 1:1 aspect ratio
const CELL_SIZE = "6.5rem";

// find the correlation row for a distribution pair, regardless of stored order
function findCorrelation(
  correlations: CorrelationRead[],
  distributionA: number,
  distributionB: number,
): CorrelationRead | undefined {
  return correlations.find(
    (c) =>
      (c.distribution_1 === distributionA &&
        c.distribution_2 === distributionB) ||
      (c.distribution_1 === distributionB &&
        c.distribution_2 === distributionA),
  );
}

interface CellProps {
  distributionA: number;
  distributionB: number;
  correlation?: CorrelationRead;
  disabled: boolean;
  onChanged: () => void;
}

// one upper-triangle cell: a coefficient text field with an integrated clear
// (cross) button. Typing a value creates (or updates) the correlation; the clear
// button removes it, so an empty cell means the pair is uncorrelated.
const CorrelationCell: FC<CellProps> = ({
  distributionA,
  distributionB,
  correlation,
  disabled,
  onChanged,
}) => {
  const [createCorrelation] = useCorrelationCreateMutation();
  const [updateCorrelation] = useCorrelationUpdateMutation();
  const [deleteCorrelation] = useCorrelationDestroyMutation();
  const [value, setValue] = useState<string>(
    correlation ? `${correlation.coefficient ?? 0}` : "",
  );

  // keep the local field in sync when the server value changes
  useEffect(() => {
    setValue(correlation ? `${correlation.coefficient ?? 0}` : "");
  }, [correlation]);

  const handleClear = async () => {
    setValue("");
    if (correlation) {
      await deleteCorrelation({ id: correlation.id });
      onChanged();
    }
  };

  const commitValue = async () => {
    const trimmed = value.trim();
    // an emptied field removes the correlation (same as the clear button)
    if (trimmed === "") {
      if (correlation) {
        await handleClear();
      }
      return;
    }
    const coefficient = parseFloat(trimmed);
    // 0 is rejected: to turn a correlation off the user must clear the field
    if (
      isNaN(coefficient) ||
      coefficient < -1 ||
      coefficient > 1 ||
      coefficient === 0
    ) {
      return;
    }
    if (correlation) {
      if (coefficient === correlation.coefficient) {
        return;
      }
      await updateCorrelation({
        id: correlation.id,
        correlation: {
          distribution_1: correlation.distribution_1,
          distribution_2: correlation.distribution_2,
          coefficient,
        },
      });
    } else {
      await createCorrelation({
        correlation: {
          distribution_1: distributionA,
          distribution_2: distributionB,
          coefficient,
        },
      });
    }
    onChanged();
  };

  const coefficient = parseFloat(value);
  const hasValue = value.trim() !== "";
  const outOfRange =
    hasValue && (isNaN(coefficient) || coefficient < -1 || coefficient > 1);
  const isZero = hasValue && coefficient === 0;
  const errorMessage = outOfRange
    ? "Enter a value between -1 and 1"
    : isZero
      ? "Use the clear (×) button to remove a correlation"
      : "";
  // show the clear button whenever there is something to clear: an existing
  // correlation, or text the user has typed (including an invalid entry)
  const showClear = hasValue || !!correlation;

  return (
    <TextField
      size="small"
      type="number"
      value={value}
      disabled={disabled}
      error={!!errorMessage}
      helperText={errorMessage}
      placeholder="0"
      onChange={(event) => setValue(event.target.value)}
      onBlur={commitValue}
      sx={{ width: "100%" }}
      slotProps={{
        htmlInput: {
          step: 0.1,
          min: -1,
          max: 1,
          "aria-label": "Correlation coefficient",
        },
        // constrain the helper text to the field width so it wraps instead of
        // widening the column
        formHelperText: {
          sx: { mx: 0, whiteSpace: "normal" },
        },
        input: {
          endAdornment: showClear ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                edge="end"
                aria-label="Clear correlation"
                disabled={disabled}
                onClick={handleClear}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        },
      }}
    />
  );
};

const CorrelationMatrix: FC<Props> = ({ model, project, variables }) => {
  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );

  // population parameters are the constant variables that carry a saved
  // distribution (one with an id), sorted like the parameters table
  const populationVariables = variables
    .filter((v) => v.constant && v.distribution && v.distribution.id != null)
    .sort((a, b) => {
      const priority = paramPriority(a) - paramPriority(b);
      return priority !== 0 ? priority : a.name.localeCompare(b.name);
    });

  const { data: correlations = [], refetch } = useCorrelationListQuery({
    dosedPkModelId: model.id,
  });

  // correlations are only meaningful between two population parameters
  if (populationVariables.length < 2) {
    return null;
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <TableHeader variant="h5" label="Population Correlation Matrix" />
        <HelpButton title="Population Correlation Matrix">
          Enter a coefficient (between -1 and 1) in a cell to correlate the
          random effects (ETAs) of two population parameters, and use the clear
          (cross) button to remove it. The matrix is symmetric, so only the
          upper triangle is editable. Any empty cell is uncorrelated.
          <br />
          <br />
          The covariance matrix used for sampling is <b>Σ = D R D</b>, where{" "}
          <b>R</b> is this correlation matrix and <b>D</b> is the diagonal matrix
          of the parameter standard deviations (the square roots of the
          variances).
          <br />
          <br />
          If the entered correlations do not form a valid (positive
          semi-definite) matrix, it is automatically clipped to the nearest
          valid one.
        </HelpButton>
      </Box>
      <TableContainer sx={{ width: "fit-content", maxWidth: "100%" }}>
        <Table
          size="small"
          sx={{
            width: "auto",
            // vertical lines separating each column
            "& td, & th": { borderRight: 1, borderColor: "divider" },
            "& td:last-of-type, & th:last-of-type": { borderRight: 0 },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell />
              {populationVariables.map((variable) => (
                <TableCell
                  key={variable.id}
                  align="center"
                  sx={{ width: CELL_SIZE }}
                >
                  <div style={{ ...defaultHeaderSx }}>
                    {parameterDisplayName(variable, model)}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {populationVariables.map((rowVariable, rowIndex) => (
              <TableRow key={rowVariable.id}>
                <TableCell>
                  <div style={{ ...defaultHeaderSx }}>
                    {parameterDisplayName(rowVariable, model)}
                  </div>
                </TableCell>
                {populationVariables.map((colVariable, colIndex) => {
                  // keep every data cell square for a 1:1 matrix aspect ratio
                  const cellSx = {
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    p: 0.5,
                  };
                  if (colIndex === rowIndex) {
                    return (
                      <TableCell key={colVariable.id} align="center" sx={cellSx}>
                        <Typography>1</Typography>
                      </TableCell>
                    );
                  }
                  // only the upper triangle is editable (symmetric matrix)
                  if (colIndex < rowIndex) {
                    return (
                      <TableCell key={colVariable.id} sx={cellSx} />
                    );
                  }
                  const distributionA = rowVariable.distribution!.id;
                  const distributionB = colVariable.distribution!.id;
                  return (
                    <TableCell key={colVariable.id} align="center" sx={cellSx}>
                      <CorrelationCell
                        distributionA={distributionA}
                        distributionB={distributionB}
                        correlation={findCorrelation(
                          correlations,
                          distributionA,
                          distributionB,
                        )}
                        disabled={isSharedWithMe}
                        onChanged={refetch}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

export default CorrelationMatrix;
