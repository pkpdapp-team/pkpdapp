// src/components/ProjectTable.tsx
import { FC, SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
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
  TextField,
} from "@mui/material";
import Error from "@mui/icons-material/Error";
import IconNonButton from "../../components/IconNonButton";
import {
  useCombinedModelListQuery,
  useSubjectGroupCreateMutation,
  useSubjectGroupDestroyMutation,
  useSubjectGroupPartialUpdateMutation,
  useUnitListQuery,
  useProjectRetrieveQuery,
  useProtocolListQuery,
  useVariableListQuery,
  ProjectRead,
  ProtocolListApiResponse,
  VariableListApiResponse,
  SubjectGroupRead,
} from "../../app/backendApi";
import { useUnits } from "../results/useUnits";
import { UnitReadWithCompatible } from "../../shared/unitConversion";
import { RootState } from "../../app/store";
import Doses from "./Doses";
import GroupPopulation from "./GroupPopulation";
import HelpButton from "../../components/HelpButton";
import { defaultHeaderSx } from "../../shared/tableHeadersSx";
import useSubjectGroups from "../../hooks/useSubjectGroups";
import { TableHeader } from "../../components/TableHeader";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { getTableHeight } from "../../shared/calculateTableHeights";
import { selectIsProjectShared } from "../login/loginSlice";

// Refetching a query throws "Cannot refetch a query that has not been started
// yet" when the component unmounts before an awaited mutation settles (the query
// subscription is already gone). Swallow that case so it doesn't surface as an
// unhandled rejection.
async function safeRefetch(refetch: () => unknown) {
  try {
    await refetch();
  } catch {
    // Query is no longer active; nothing to refresh.
  }
}

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
  const units = useUnits();
  const { isLoading: unitsLoading } = useUnitListQuery(
    {},
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
  units: UnitReadWithCompatible[];
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
  // the selected tab is always a group id 
  // (or false when the project has no groups at all).
  const [tab, setTab] = useState<number | false>(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus the inline editor when a group enters edit mode.
  useEffect(() => {
    if (editingGroupId !== null) {
      editInputRef.current?.focus();
    }
  }, [editingGroupId]);

  // Keep the selected tab valid: default to the first group (the base group,
  // since groups are sorted Sim-first) and recover if the current tab is gone.
  useEffect(() => {
    const ids = groups?.map((g) => g.id) ?? [];
    if (tab === false || !ids.includes(tab)) {
      setTab(ids.length > 0 ? ids[0] : false);
    }
  }, [groups, tab]);

  const [createSubjectGroup] = useSubjectGroupCreateMutation();
  const [destroySubjectGroup] = useSubjectGroupDestroyMutation();
  const [updateSubjectGroup] = useSubjectGroupPartialUpdateMutation();

  const handleTabChange = (
    event: SyntheticEvent<Element, Event>,
    newValue: number,
  ) => {
    if ((event.target as HTMLButtonElement).name === "remove") {
      return; // Prevent tab change when clicking on the remove icon
    }
    setTab(newValue);
  };

  const startEditing = (group: SubjectGroupRead) => {
    if (isSharedWithMe) {
      return; // Read-only viewers cannot rename groups
    }
    setEditingGroupId(group.id);
    setEditValue(group.name);
  };

  const cancelEditing = () => {
    setEditingGroupId(null);
    setEditValue("");
  };

  const commitEditing = async (group: SubjectGroupRead) => {
    const trimmed = editValue.trim();
    if (trimmed === "" || trimmed === group.name) {
      cancelEditing();
      return;
    }
    await updateSubjectGroup({
      id: group.id,
      patchedSubjectGroup: { name: trimmed },
    });
    await safeRefetch(refetchGroups);
    cancelEditing();
  };

  // Seed a new group from the base group's protocols (base is the first group).
  const baseGroupId = groups?.[0]?.id;
  const filteredProtocols = projectProtocols.filter(
    (p) => p.group === baseGroupId,
  );

  const handleAddTab = async () => {
    const existingSimGroupNames =
      groups?.filter((g) => g.name.startsWith("Sim-Group")) ?? [];
    const existingNames = groups?.map((g) => g.name) || [];
    const newGroupId = (groups?.length || 1) + 1;
    let nextSimGroupValue = existingSimGroupNames.length + 1;
    let newGroupName = `Sim-Group ${nextSimGroupValue}`;
    while (existingNames?.includes(newGroupName)) {
      nextSimGroupValue++;
      newGroupName = `Sim-Group ${nextSimGroupValue}`;
    }
    const newGroup = await createSubjectGroup({
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
            name: `${newProtocol.name} - ${newGroupName}`,
          };
        }),
      },
    }).unwrap();
    await safeRefetch(refetchGroups);
    await safeRefetch(refetchProtocols);
    setTab(newGroup.id);
  };

  const removeGroup = (groupID: number) => async () => {
    const subjectGroup = groups?.find((g) => g.id === groupID);
    const subjectCount = subjectGroup?.subjects.length || 0;
    const confirmationMessage =
      subjectCount === 0
        ? `Are you sure you want to delete ${subjectGroup?.name}?`
        : `Are you sure you want to delete group ${subjectGroup?.name} and all its subjects?`;
    if (window?.confirm(confirmationMessage)) {
      await destroySubjectGroup({ id: groupID });
      await safeRefetch(refetchGroups);
      if (groupID === tab) {
        // fall back to the first remaining group (or none if all were deleted)
        const remaining = groups?.filter((g) => g.id !== groupID) ?? [];
        setTab(remaining.length > 0 ? remaining[0].id : false);
      }
    }
  };

  const onProtocolChange = () => {
    safeRefetch(refetchGroups);
    safeRefetch(refetchProtocols);
  };

  function a11yProps(index: number) {
    return {
      id: `group-tab-${index}`,
      "aria-controls": `group-tabpanel`,
    };
  }

  const subjectGroup = groups?.find((g) => g.id === tab) ?? null;
  const selectedProtocols = projectProtocols.filter(
    (protocol) => protocol.group === subjectGroup?.id,
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
                value={group.id}
                label={
                  editingGroupId === group.id ? (
                    <TextField
                      variant="standard"
                      size="small"
                      inputRef={editInputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") {
                          commitEditing(group);
                        } else if (e.key === "Escape") {
                          cancelEditing();
                        }
                      }}
                      onBlur={() => commitEditing(group)}
                    />
                  ) : (
                    <span onDoubleClick={() => startEditing(group)}>
                      {group.name}
                    </span>
                  )
                }
                {...a11yProps(index)}
                icon={
                  !groups?.[index] ? undefined : (
                    <IconNonButton
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
                    </IconNonButton>
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
            maxHeight: getTableHeight({ steps: TABLE_BREAKPOINTS }),
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  <div style={{ ...defaultHeaderSx }}>Dose</div>
                </TableCell>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  <div style={{ ...defaultHeaderSx }}> Dose Unit</div>
                </TableCell>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  <div style={{ ...defaultHeaderSx }}>
                    Per Body Weight (kg)
                    <HelpButton title="Per Body Weight">
                      If checked, the dose is given in amount per body
                    </HelpButton>
                  </div>
                </TableCell>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  <div style={{ ...defaultHeaderSx }}>Number of Doses</div>
                </TableCell>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  <div style={{ ...defaultHeaderSx }}>
                    Start Time
                    <HelpButton title="Start Time">
                      Time of the first dose
                    </HelpButton>
                  </div>
                </TableCell>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  <div style={{ ...defaultHeaderSx }}>
                    Dose Duration
                    <HelpButton title="Dose Duration">
                      Duration of dosing. For IV bolus PO/SC dosing use the
                      default value 0.0833 h
                    </HelpButton>
                  </div>
                </TableCell>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  <div style={{ ...defaultHeaderSx }}>Dosing Interval</div>
                </TableCell>
                <TableCell size="small" sx={{ textWrap: "nowrap" }}>
                  <div style={{ ...defaultHeaderSx }}>Time Unit</div>
                </TableCell>
                <TableCell
                  align="right"
                  size="small"
                  sx={{ textWrap: "nowrap" }}
                >
                  <div style={{ ...defaultHeaderSx }}> Remove </div>
                </TableCell>
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
        {subjectGroup && (
          <GroupPopulation
            key={subjectGroup.id}
            group={subjectGroup}
            project={project}
            disabled={isSharedWithMe}
          />
        )}
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
