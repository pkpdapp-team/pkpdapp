import * as React from "react";
import {
  CombinedModelRead,
  CompoundRead,
  ProjectRead,
  UnitRead,
  VariableRead,
  useCombinedModelSetParamsToDefaultsUpdateMutation,
} from "../../app/backendApi";
import { Control } from "react-hook-form";
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
} from "@mui/material";
import ParameterRow from "./ParameterRow";
import HelpButton from "../../components/HelpButton";
import {
  getConstVariables,
  getNoReset,
} from "./resetToSpeciesDefaults";
import { FormData } from "./Model";
import { defaultHeaderSx } from "../../shared/tableHeadersSx";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectIsProjectShared } from "../login/loginSlice";

interface Props {
  model: CombinedModelRead;
  project: ProjectRead;
  control: Control<FormData>;
  variables: VariableRead[];
  compound: CompoundRead;
  units: UnitRead[];
}

const ParametersTab: React.FC<Props> = ({
  model,
  project,
  control,
  variables,
  compound,
  units,
}) => {
  const [setParamsToDefault] =
    useCombinedModelSetParamsToDefaultsUpdateMutation();

  const isSharedWithMe = useSelector((state: RootState) => selectIsProjectShared(state, project));

  let constVariables = getConstVariables(variables, model);
  const noReset = getNoReset(project);

  const myResetToSpeciesDefaults = () => {
    setParamsToDefault({ id: model.id, combinedModel: model });
  };

  return (
    <Stack spacing={2}>
      {noReset ? (
        <Tooltip title='No default parameters as "Other" has been selected as species (in "Projects")'>
          <span>
            <Button
              variant="contained"
              color="primary"
              onClick={myResetToSpeciesDefaults}
              disabled={noReset || isSharedWithMe}
              sx={{ width: 270 }}
            >
              Reset to Species Defaults
            </Button>
          </span>
        </Tooltip>
      ) : (
        <Button
          variant="contained"
          color="primary"
          onClick={myResetToSpeciesDefaults}
          disabled={noReset || isSharedWithMe}
          sx={{ width: 270 }}
        >
          Reset to Species Defaults
        </Button>
      )}
      <TableContainer sx={{ width: "90%" }}>
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
                key={variable.id}
                variable={variable}
                model={model}
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
