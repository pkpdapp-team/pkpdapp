// src/components/ProjectTable.tsx
import { FC, SyntheticEvent, useMemo, useState } from "react";
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
  IconButton,
} from "@mui/material";
import Error from "@mui/icons-material/Error";
import {
  useCombinedModelListQuery,
  useSubjectGroupCreateMutation,
  useSubjectGroupDestroyMutation,
  useUnitListQuery,
  useProjectRetrieveQuery,
  useProtocolListQuery,
  useVariableListQuery,
  ProjectRead,
  ProtocolListApiResponse,
  VariableListApiResponse,
  UnitListApiResponse,
  SubjectGroupRead,
} from "../../app/backendApi";
import { RootState } from "../../app/store";
import Doses from "./Doses";
import HelpButton from "../../components/HelpButton";
import { defaultHeaderSx } from "../../shared/tableHeadersSx";
import useSubjectGroups from "../../hooks/useSubjectGroups";
import { TableHeader } from "../../components/TableHeader";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { getTableHeight } from "../../shared/calculateTableHeights";
import { selectIsProjectShared } from "../login/loginSlice";

const TABLE_BREAKPOINTS = [
  {
    minHeight: 1100,
    tableHeight: "78vh",
  },
  {
    minHeight: 1000,
    tableHeight: "75vh",
  },
  {
    minHeight: 900,
    tableHeight: "72vh",
  },
  {
    minHeight: 800,
    tableHeight: "68vh",
  },
  {
    minHeight: 700,
    tableHeight: "67vh",
  },
  {
    minHeight: 600,
    tableHeight: "60vh",
  },
  {
    minHeight: 500,
    tableHeight: "60vh",
  },
];

function useApiQueries() {
  const selectedProject = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const selectedProjectOrZero = selectedProject || 0;

  const { data: project, isLoading: isProjectLoading } =
    useProjectRetrieveQuery(
      { id: selectedProjectOrZero },
      { skip: !selectedProject },
    );

  const {
    data: projectProtocols,
    isLoading: isProtocolsLoading,
    refetch: refetchProtocols,
  } = useProtocolListQuery(
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

  const loading = [
    isModelsLoading,
    isProjectLoading,
    isProtocolsLoading,
    unitsLoading,
  ].some((x) => x);

  return {
    project,
    projectProtocols,
    refetchProtocols,
    variables,
    units,
    loading,
  };
}

interface ProtocolsProps {
  project: ProjectRead;
  projectProtocols: ProtocolListApiResponse;
  refetchProtocols: () => void;
  variables?: VariableListApiResponse;
  units: UnitListApiResponse;
  groups: SubjectGroupRead[];
  refetchGroups: () => void;
  isSharedWithMe: boolean;
}

/**
 * Edit dosing protocols for a project.
 */
export const Protocols: FC<ProtocolsProps> = ({
  project,
  projectProtocols,
  refetchProtocols,
  units,
  groups,
  refetchGroups,
  isSharedWithMe,
}) => {
  const [tab, setTab] = useState(0);

  const [createSubjectGroup] = useSubjectGroupCreateMutation();
  const [destroySubjectGroup] = useSubjectGroupDestroyMutation();

  const handleTabChange = (
    event: SyntheticEvent<Element, Event>,
    newValue: number,
  ) => {
    if ((event.target as HTMLButtonElement).name === "remove") {
      return; // Prevent tab change when clicking on the remove icon
    }
    setTab(newValue);
  };

  const filteredProtocols = projectProtocols.filter((p) => p.group === null);

  const handleAddTab = async () => {
    const newValue = (groups?.length || 1) + 1;
    const existingNames = groups?.map((g) => g.name);
    let newGroupId = newValue;
    let newGroupName = `Sim-Group ${newValue}`;
    while (existingNames?.includes(newGroupName)) {
      newGroupId++;
      newGroupName = `Sim-Group ${newGroupId}`;
    }
    await createSubjectGroup({
      subjectGroup: {
        name: newGroupName,
        id_in_dataset: `${newGroupId}`,
        project: project.id,
        protocols: filteredProtocols.map((p) => {
          const { project, ...newProtocol } = p;
          return {
            ...newProtocol,
            dataset: null,
            project,
            name: `${newProtocol.name} - Group ${newValue}`,
          };
        }),
      },
    });
    await refetchGroups();
    await refetchProtocols();
    setTab(groups.length + 1);
  };

  const removeGroup = (groupID: number) => async () => {
    const subjectGroup = groups?.find((g) => g.id === groupID);
    const subjectGroupIndex = groups?.findIndex((g) => g.id === groupID) + 1; // +1 because the first tab is the project
    const subjectCount = subjectGroup?.subjects.length || 0;
    const confirmationMessage =
      subjectCount === 0
        ? `Are you sure you want to delete ${subjectGroup?.name}?`
        : `Are you sure you want to delete group ${subjectGroup?.name} and all its subjects?`;
    if (window?.confirm(confirmationMessage)) {
      await destroySubjectGroup({ id: groupID });
      await refetchGroups();
      if (subjectGroupIndex === tab) {
        setTab(subjectGroupIndex - 1);
      }
      if (tab > subjectGroupIndex) {
        setTab(tab - 1);
      }
    }
  };

  const onProtocolChange = () => {
    console.log("Protocol changed, refetching groups and protocols...");
    refetchGroups();
    refetchProtocols();
  };

  function a11yProps(index: number) {
    return {
      id: `group-tab-${index}`,
      "aria-controls": `group-tabpanel`,
    };
  }

  const subjectGroup = tab === 0 ? null : groups?.[tab - 1];
  const selectedProtocols = projectProtocols.filter((protocol) =>
    subjectGroup ? protocol.group === subjectGroup.id : protocol.group === null,
  );

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
      <TableHeader label="Trial Design" />
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          borderBottom: "1px solid #c2bab5",
        }}
      >
        <Tabs
          variant="scrollable"
          scrollButtons
          allowScrollButtonsMobile
          selectionFollowsFocus
          sx={{ width: "fit-content" }}
          value={tab}
          onChange={handleTabChange}
        >
          <Tab label={"Sim-Group 1"} {...a11yProps(0)} />
          {groups?.map((group, index) => {
            const selectedProtocols = projectProtocols.filter(
              (protocol) => protocol.group === group.id,
            );
            const selectedDoses = selectedProtocols.flatMap(
              (protocol) => protocol.doses || [],
            );
            return (
              <Tab
                key={group.id}
                label={group.name}
                {...a11yProps(index + 1)}
                icon={
                  !groups?.[index] ? undefined : (
                    <IconButton
                      name="remove"
                      onClick={async (e) => {
                        e.stopPropagation();
                        removeGroup(groups?.[index]?.id)();
                      }}
                    >
                      {selectedDoses.length === 0 && (
                        <Error color="error" sx={{ marginRight: ".5rem" }} />
                      )}
                      <RemoveCircleOutlineIcon fontSize="small" />
                    </IconButton>
                  )
                }
                iconPosition="end"
              />
            );
          })}
        </Tabs>
        <Box
          sx={{ display: "flex", width: "fit-content", alignItems: "center" }}
        >
          <Button
            variant="contained"
            sx={{
              marginRight: "1rem",
              width: "fit-content",
              textWrap: "nowrap",
              height: "2rem",
            }}
            onClick={handleAddTab}
            disabled={isSharedWithMe}
          >
            Add Group
          </Button>
        </Box>
      </Box>
      <Box role="tabpanel" id={`group-tabpanel`}>
        <TableContainer
          sx={{
            height: getTableHeight({ steps: TABLE_BREAKPOINTS }),
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  {" "}
                  <div style={{ ...defaultHeaderSx }}>Dose</div>
                </TableCell>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  <div style={{ ...defaultHeaderSx }}> Dose Unit</div>
                </TableCell>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  <div style={{ ...defaultHeaderSx }}>
                    {" "}
                    Per Body Weight (kg)
                    <HelpButton title="Per Body Weight">
                      If checked, the dose is given in amount per body
                    </HelpButton>
                  </div>
                </TableCell>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  {" "}
                  <div style={{ ...defaultHeaderSx }}>Number of Doses</div>
                </TableCell>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  <div style={{ ...defaultHeaderSx }}>
                    {" "}
                    Start Time
                    <HelpButton title="Start Time">
                      Time of the first dose
                    </HelpButton>
                  </div>
                </TableCell>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  <div style={{ ...defaultHeaderSx }}>
                    {" "}
                    Dose Duration
                    <HelpButton title="Dose Duration">
                      Duration of dosing. For IV bolus PO/SC dosing use the
                      default value 0.0833 h
                    </HelpButton>
                  </div>
                </TableCell>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  {" "}
                  <div style={{ ...defaultHeaderSx }}>Dosing Interval</div>
                </TableCell>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  {" "}
                  <div style={{ ...defaultHeaderSx }}>Time Unit</div>
                </TableCell>
                {tab === 0 && (
                  <TableCell
                    align="right"
                    size="small"
                    sx={{ textWrap: "nowrap" }}
                  >
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
      </Box>
    </>
  );
};

const ProtocolsContainer: FC = () => {
  const {
    project,
    projectProtocols,
    refetchProtocols,
    variables,
    units,
    loading,
  } = useApiQueries();
  const { groups, refetchGroups } = useSubjectGroups();
  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );

  const loaded = project && projectProtocols && units && groups;

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!loaded) {
    return <div>Project not found</div>;
  }

  return (
    <Protocols
      project={project}
      projectProtocols={projectProtocols}
      refetchProtocols={refetchProtocols}
      variables={variables}
      units={units}
      groups={groups}
      refetchGroups={refetchGroups}
      isSharedWithMe={isSharedWithMe}
    />
  );
};

export default ProtocolsContainer;
