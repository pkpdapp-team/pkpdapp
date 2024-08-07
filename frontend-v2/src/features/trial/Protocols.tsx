// src/components/ProjectTable.tsx
import { ChangeEvent, FC, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
} from "@mui/material";
import Add from "@mui/icons-material/Add";
import Error from "@mui/icons-material/Error";
import {
  useCombinedModelListQuery,
  useSubjectGroupCreateMutation,
  useSubjectGroupDestroyMutation,
  useUnitListQuery,
  useProjectRetrieveQuery,
  useProtocolListQuery,
  useVariableListQuery,
} from "../../app/backendApi";
import { RootState } from "../../app/store";
import Doses from "./Doses";
import HelpButton from "../../components/HelpButton";
import { defaultHeaderSx } from "../../shared/tableHeadersSx";
import useDataset from "../../hooks/useDataset";
import useSubjectGroups from "../../hooks/useSubjectGroups";

const Protocols: FC = () => {
  const [tab, setTab] = useState(0);
  const selectedProject = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const selectedProjectOrZero = selectedProject || 0;
  const { dataset } = useDataset(selectedProject);
  const { groups, refetchGroups } = useSubjectGroups();
  const { data: project, isLoading: isProjectLoading } =
    useProjectRetrieveQuery(
      { id: selectedProjectOrZero },
      { skip: !selectedProject },
    );
  const { data: projectProtocols, isLoading: isProtocolsLoading } =
    useProtocolListQuery(
      { projectId: selectedProjectOrZero },
      { skip: !selectedProject },
    );
  const { data: models, isLoading: isModelsLoading } =
    useCombinedModelListQuery(
      { projectId: selectedProjectOrZero },
      { skip: !selectedProject },
    );
  const model = useMemo(() => {
    return models?.[0] || undefined;
  }, [models]);
  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );
  const { data: units, isLoading: unitsLoading } = useUnitListQuery(
    { compoundId: project?.compound || 0 },
    { skip: !project?.compound },
  );
  const [createSubjectGroup] = useSubjectGroupCreateMutation();
  const [destroySubjectGroup] = useSubjectGroupDestroyMutation();

  const loading = [isProjectLoading, isProtocolsLoading, unitsLoading].some(
    (x) => x,
  );
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!project || !projectProtocols || !units) {
    return <div>Project not found</div>;
  }

  const filteredProtocols = projectProtocols?.filter(
    (protocol) => protocol.variables.length > 0,
  );

  const handleTabChange = async (event: ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
    if (project && groups && newValue === groups.length + 1) {
      const existingNames = groups?.map((g) => g.name);
      let newGroupId = newValue;
      let newGroupName = `Group ${newValue}`;
      while (existingNames?.includes(newGroupName)) {
        newGroupId++;
        newGroupName = `Group ${newGroupId}`;
      }
      await createSubjectGroup({
        subjectGroup: {
          name: newGroupName,
          id_in_dataset: `${newGroupId}`,
          project: project.id,
          protocols: filteredProtocols.map((p) => {
            const { id, project, mapped_qname, ...newProtocol } = p;
            const linkedVariableId = p.variables[0];
            const mappedQName =
              mapped_qname ||
              variables?.find((v) => v.id === linkedVariableId)?.qname;
            return {
              ...newProtocol,
              dataset: null,
              project,
              name: `${newProtocol.name} - Group ${newValue}`,
              mapped_qname: mappedQName,
            };
          }),
        },
      });
      refetchGroups();
    }
  };

  const removeGroup = (groupID: number) => async () => {
    const subjectGroup = groups?.find((g) => g.id === groupID);
    const subjectCount = subjectGroup?.subjects.length || 0;
    if (
      subjectCount === 0 ||
      window?.confirm(
        `Are you sure you want to delete group ${subjectGroup?.name} and all its subjects?`,
      )
    ) {
      setTab(tab - 1);
      await destroySubjectGroup({ id: groupID });
      refetchGroups();
    }
  };

  const onProtocolChange = () => {
    refetchGroups();
  };

  function a11yProps(index: number) {
    return {
      id: `group-tab-${index}`,
      "aria-controls": `group-tabpanel`,
    };
  }

  const subjectGroup = tab === 0 ? null : groups?.[tab - 1];
  const selectedProtocols =
    tab === 0
      ? filteredProtocols
      : subjectGroup
        ? [...subjectGroup.protocols]
        : [];

  // sort protocols alphabetically by name
  selectedProtocols?.sort((a, b) => {
    if (a.name < b.name) {
      return -1;
    } else {
      return 1;
    }
  });

  return (
    <>
      <Tabs value={tab} onChange={handleTabChange}>
        <Tab label={"Project"} {...a11yProps(0)} />
        {groups?.map((group, index) => {
          const selectedDoses = group.protocols?.flatMap((p) => p?.doses) || [];
          return (
            <Tab
              key={group.id}
              label={group.name}
              {...a11yProps(index + 1)}
              icon={
                selectedDoses.length === 0 ? <Error color="error" /> : undefined
              }
              iconPosition="end"
            />
          );
        })}
        <Tab
          label={"New Group"}
          {...a11yProps((dataset?.groups?.length || 0) + 1)}
          icon={<Add />}
          iconPosition="start"
        />
      </Tabs>
      <Box role="tabpanel" id={`group-tabpanel`}>
        <TableContainer sx={{ width: "90%" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <div style={{ ...defaultHeaderSx }}>
                    {" "}
                    Site of Admin
                    <HelpButton title="Site of Admin">
                      Defines the site of drug administration. A1/A1_t/A1_f =
                      IV, Aa = SC or PO. The site of drug administration can be
                      selected under Model/ Map Variables
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
                      Duration of dosing. For IV bolus PO/SC dosing use the
                      default value 0.0833 h
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
                {tab === 0 && (
                  <TableCell align="right">
                    <div style={{ ...defaultHeaderSx }}> Remove </div>
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {projectProtocols?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No protocols found</TableCell>
                </TableRow>
              )}
              {selectedProtocols?.map((protocol) => {
                return protocol ? (
                  <Doses
                    key={protocol.id}
                    onChange={onProtocolChange}
                    project={project}
                    protocol={protocol}
                    units={units}
                  />
                ) : null;
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {subjectGroup?.id && (
          <Box sx={{ display: "flex", justifyContent: "end" }}>
            <Button variant="outlined" onClick={removeGroup(subjectGroup.id)}>
              Remove Group
            </Button>
          </Box>
        )}
      </Box>
    </>
  );
};

export default Protocols;
