import { FC } from "react";
import { TableCell, TableRow, Typography } from "@mui/material";
import {
  ProjectRead,
  ProtocolRead,
  UnitRead
} from "../../app/backendApi";

interface Props {
  project: ProjectRead;
  protocol: ProtocolRead;
  units: UnitRead[];
}

const DatasetDoses: FC<Props> = ({ protocol, units }) => {
  return (
    <>
      {protocol.doses.map((dose) => (
        <TableRow key={dose.id}>
          <TableCell>{protocol?.mapped_qname || ''}</TableCell>
          <TableCell>
            {dose.amount}
          </TableCell>
          <TableCell>
            {protocol.amount_unit && (
              <Typography>
                {units.find((u) => u.id === protocol.amount_unit)?.symbol}
              </Typography>
            )}
          </TableCell>
          <TableCell>
            {dose.repeats}
          </TableCell>
          <TableCell>
            {dose.start_time}
          </TableCell>
          <TableCell>
            {dose.duration}
          </TableCell>
          <TableCell>
            {dose.repeat_interval}
          </TableCell>
          <TableCell>
            {protocol.time_unit && (
              <Typography>
                {units.find((u) => u.id === protocol.time_unit)?.symbol}
              </Typography>
            )}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

export default DatasetDoses;
