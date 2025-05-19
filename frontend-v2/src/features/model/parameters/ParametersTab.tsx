import { FC } from "react";
import { Control } from "react-hook-form";
import {
  CombinedModelRead,
  ProjectRead,
  UnitRead,
  VariableRead,
  useCombinedModelSetParamsToDefaultsUpdateMutation,
} from "../../../app/backendApi";
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Button,
  Tooltip,
  Box,
} from "@mui/material";
import ParameterRow from "./ParameterRow";
import HelpButton from "../../../components/HelpButton";
import { getConstVariables, getNoReset } from "./resetToSpeciesDefaults";
import { defaultHeaderSx } from "../../../shared/tableHeadersSx";
import { useSelector } from "react-redux";
import { FormData } from "./Model";
import { RootState } from "../../app/store";
import { selectIsProjectShared } from "../login/loginSlice";
import {
  getTableHeight,
  SINGLE_TABLE_BREAKPOINTS,
} from "../../../shared/calculateTableHeights";
import { TableHeader } from "../../../components/TableHeader";

interface Props {
  model: CombinedModelRead;
  project: ProjectRead;
  variables: VariableRead[];
  control: Control<FormData>;
  units: UnitRead[];
}

const ParametersTab: FC<Props> = ({ model, project, variables, units, control }) => {
  const [setParamsToDefault] =
    useCombinedModelSetParamsToDefaultsUpdateMutation();

  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );

  const constVariables = getConstVariables(variables, model);
  const noReset = getNoReset(project);

  const myResetToSpeciesDefaults = () => {
    setParamsToDefault({ id: model.id, combinedModel: model });
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex" }}>
        <TableHeader variant="h5" label="Set Parameters" />
        {noReset ? (
          <Tooltip title='No default parameters as "Other" has been selected as species (in "Projects")'>
            <span>
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={myResetToSpeciesDefaults}
                disabled={noReset || isSharedWithMe}
                sx={{ marginLeft: "1rem" }}
              >
                Reset to Species Defaults
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={myResetToSpeciesDefaults}
            disabled={noReset || isSharedWithMe}
            sx={{ marginLeft: "1rem" }}
          >
            Reset to Species Defaults
          </Button>
        )}
      </Box>

      <TableContainer
        sx={{
          width: "90%",
          maxHeight: getTableHeight({ steps: SINGLE_TABLE_BREAKPOINTS }),
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>Name</div>
              </TableCell>
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>Type</div>
              </TableCell>
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>Lower Bound</div>
              </TableCell>
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>Value</div>
              </TableCell>
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>Upper Bound</div>
              </TableCell>
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>
                  {" "}
                  Unit{" "}
                  <HelpButton title="Unit Column">
                    Changing the units does not automatically update the PKPD
                    parameter values. The user is responsible for the
                    correctness of the PKPD parameter values and units.
                  </HelpButton>{" "}
                </div>
              </TableCell>
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>Nonlinearity</div>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {constVariables.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No variables found</TableCell>
              </TableRow>
            )}
            {constVariables.map((variable) => (
              <ParameterRow
                model={model}
                variables={variables}
                modelControl={control}
                key={variable.id}
                variable={variable}
                project={project}
                units={units}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

export default ParametersTab;
