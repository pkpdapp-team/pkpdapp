// src/components/ProjectTable.tsx
import React from "react";
import { useSelector } from "react-redux";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  useUnitListQuery,
  useProjectRetrieveQuery,
  useProtocolListQuery,
} from "../../app/backendApi";
import { RootState } from "../../app/store";
import Doses from "./Doses";
import HelpButton from "../../components/HelpButton";
import { defaultHeaderSx } from "../../shared/tableHeadersSx";

const Protocols: React.FC = () => {
  const selectedProject = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const selectedProjectOrZero = selectedProject || 0;
  const { data: project, isLoading: isProjectLoading } =
    useProjectRetrieveQuery(
      { id: selectedProjectOrZero },
      { skip: !selectedProject },
    );
  const { data: protocols, isLoading: isProtocolsLoading } =
    useProtocolListQuery(
      { projectId: selectedProjectOrZero },
      { skip: !selectedProject },
    );
  const { data: units, isLoading: unitsLoading } = useUnitListQuery(
    { compoundId: project?.compound || 0 },
    { skip: !project?.compound },
  );

  const loading = [isProjectLoading, isProtocolsLoading, unitsLoading].some(
    (x) => x,
  );
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!project || !protocols || !units) {
    return <div>Project not found</div>;
  }

  const filteredProtocols = protocols?.filter(
    (protocol) => protocol.variables.length > 0,
  );

  // sort protocols alphabetically by name
  filteredProtocols?.sort((a, b) => {
    if (a.name < b.name) {
      return -1;
    } else {
      return 1;
    }
  });

  return (
    <TableContainer sx={{ width: '90%' }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <div style={{ ...defaultHeaderSx }}>
                {" "}
                Site of Admin
                <HelpButton title="Site of Admin">
                  Defined in Model/Map Variables
                </HelpButton>
              </div>
            </TableCell>
            <TableCell>
              {" "}
              <div style={{ ...defaultHeaderSx }}>Dose</div>
            </TableCell>
            <TableCell>
              <div style={{ ...defaultHeaderSx }}>
                {" "}
                Dose Unit
                <HelpButton title="Dose Unit">
                  Default selection: mg/kg for preclinical, mg for clinical
                </HelpButton>
              </div>
            </TableCell>
            <TableCell>
              {" "}
              <div style={{ ...defaultHeaderSx }}>Number of Doses</div>
            </TableCell>
            <TableCell>
              <div style={{ ...defaultHeaderSx }}>
                {" "}
                Start Time
                <HelpButton title="Start Time">
                  Start time of the first dose
                </HelpButton>
              </div>
            </TableCell>
            <TableCell>
              <div style={{ ...defaultHeaderSx }}>
                {" "}
                Dose Duration
                <HelpButton title="Dose Duration">
                  Duration of dosing. For IV bolus PO/SC dosing use the default
                  value 0.0833 h
                </HelpButton>
              </div>
            </TableCell>
            <TableCell>
              {" "}
              <div style={{ ...defaultHeaderSx }}>Dosing Interval</div>
            </TableCell>
            <TableCell>
              {" "}
              <div style={{ ...defaultHeaderSx }}>Time Unit</div>
            </TableCell>
            <TableCell align="right">
              <div style={{ ...defaultHeaderSx }}>
                {" "}
                Remove{" "}
              </div>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {protocols?.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>No protocols found</TableCell>
            </TableRow>
          )}
          {filteredProtocols?.map((protocol) => (
            <Doses
              key={protocol.id}
              project={project}
              protocol={protocol}
              units={units}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default Protocols;
