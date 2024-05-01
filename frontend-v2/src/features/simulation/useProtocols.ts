import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import useSubjectGroups from "../../hooks/useSubjectGroups";
import {
  ProtocolRead,
  useCompoundRetrieveQuery,
  useProjectRetrieveQuery,
  useProtocolListQuery,
  useSubjectGroupListQuery
} from "../../app/backendApi";

const DEFAULT_PROTOCOLS: ProtocolRead[] = [];

export default function useProtocols() {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project, isLoading: isProjectLoading } =
    useProjectRetrieveQuery(
      { id: projectIdOrZero },
      { skip: !projectId }
  );
  const { data: compound } =
    useCompoundRetrieveQuery(
      { id: project?.compound || 0 },
      { skip: !project?.compound },
    );
  const { data: projectProtocols } = useProtocolListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  const { groups } = useSubjectGroups();

  const protocols = useMemo(() => {
    const datasetProtocols = groups?.flatMap(group => group.protocols) || [];
    if (projectProtocols && datasetProtocols) {
      return [...projectProtocols, ...datasetProtocols];
    }
    return DEFAULT_PROTOCOLS;
  }, [projectProtocols, groups]);

  return {
    project,
    compound,
    protocols,
    isProjectLoading
  }
}