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
import { useUnitListQuery, useProjectRetrieveQuery, useDoseCreateMutation, useProtocolListQuery } from "../../app/backendApi";
import { RootState } from "../../app/store";
import { useFieldArray, useForm } from "react-hook-form";
import Doses from "./Doses";


const Protocols: React.FC = () => {
  const selectedProject = useSelector((state: RootState) => state.main.selectedProject);
  const { data: project, error: projectError, isLoading: isProjectLoading } = useProjectRetrieveQuery({id: selectedProject || 0}, { skip: !selectedProject })
  const { data: protocols, error: protocolsError, isLoading: isProtocolsLoading } = useProtocolListQuery({projectId: selectedProject || 0}, { skip: !selectedProject })
  const { data: units, isLoading: unitsLoading } = useUnitListQuery({ compoundId: project?.compound || 0}, { skip: !project?.compound})

  if (isProjectLoading || isProtocolsLoading || unitsLoading) {
    return <div>Loading...</div>;
  }

  if (!project || !protocols || !units) {
    return <div>Project not found</div>;
  }

  const filteredProtocols = protocols?.filter((protocol) => protocol.variables.length > 0);

  
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Site of Admin</TableCell>
            <TableCell>Dose</TableCell>
            <TableCell>Dose Unit</TableCell>
            <TableCell>Number of Doses</TableCell>
            <TableCell>Start Time</TableCell>
            <TableCell>Dose Duration</TableCell>
            <TableCell>Dosing Interval</TableCell>
            <TableCell>Time Unit</TableCell>
            <TableCell align="right">
              Add Dose
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
            <Doses key={protocol.id} project={project} protocol={protocol} units={units} />
          ))}
        </TableBody>
      
      </Table>
    </TableContainer>
  );
};

export default Protocols;
