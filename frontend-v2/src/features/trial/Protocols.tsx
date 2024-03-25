// src/components/ProjectTable.tsx
import { ChangeEvent, FC, useState } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab
} from "@mui/material";
import {
  useUnitListQuery,
  useProjectRetrieveQuery,
  useProtocolListQuery,
} from "../../app/backendApi";
import { RootState } from "../../app/store";
import Doses from "./Doses";
import DatasetDoses from "./DatasetDoses";
import HelpButton from "../../components/HelpButton";
import { defaultHeaderSx } from "../../shared/tableHeadersSx";
import useDataset from "../../hooks/useDataset";

const Protocols: FC = () => {
  const [tab, setTab] = useState(0);
  const handleTabChange = (event: ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
  };
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
  
  const { dataset } = useDataset(selectedProject);

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

  function a11yProps(index: number) {
    return {
      id: `group-tab-${index}`,
      'aria-controls': `group-tabpanel`,
    };
  }

  const selectedProtocols = tab === 0 ? filteredProtocols : dataset?.groups[tab-1]?.protocols;
  const DosesComponent = tab === 0 ? Doses : DatasetDoses;
  return (
    <>
      <Tabs value={tab} onChange={handleTabChange}>
        <Tab
          label={'Project'}
          {...a11yProps(0)}
        />
        {dataset?.groups.map((group, index) => (
          <Tab
            key={group.id}
            label={group.name}
            {...a11yProps(index+1)}
          />
        ))}
    </Tabs>
    <Box role="tabpanel" id={`group-tabpanel`}>
      <TableContainer sx={{ width: '90%' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>
                  {" "}
                  Site of Admin
                  <HelpButton title="Site of Admin">
                    Defines the site of drug administration. A1/A1_t/A1_f = IV, Aa
                    = SC or PO. The site of drug administration can be selected
                    under Model/ Map Variables
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
                    Time of the first dose
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
              {tab === 0 && 
                <TableCell align="right">
                  <div style={{ ...defaultHeaderSx }}>
                    {" "}
                    Remove{" "}
                  </div>
                </TableCell>
              }
            </TableRow>
          </TableHead>
          <TableBody>
            {protocols?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No protocols found</TableCell>
              </TableRow>
            )}
            {selectedProtocols?.map((protocol) => {
              return protocol ? (
                <DosesComponent
                  key={protocol.id}
                  project={project}
                  protocol={protocol}
                  units={units}
                />
              ) : null;
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  </>
  );
};

export default Protocols;
