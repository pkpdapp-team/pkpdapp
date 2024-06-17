import { useMemo } from "react";
import { useSelector } from "react-redux";
import {
  useProjectRetrieveQuery,
  useSubjectGroupListQuery,
} from "../app/backendApi";
import { RootState } from "../app/store";

export default function useSubjectGroups() {
  const selectedProject = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const selectedProjectOrZero = selectedProject || 0;
  const { data: project } = useProjectRetrieveQuery(
    { id: selectedProjectOrZero },
    { skip: !selectedProject },
  );
  const { data: datasetGroups, refetch: refetchDatasetGroups } =
    useSubjectGroupListQuery(
      { datasetId: project?.datasets[0] || 0 },
      { skip: !project },
    );
  const { data: projectGroups, refetch: refetchProjectGroups } =
    useSubjectGroupListQuery(
      { projectId: selectedProjectOrZero },
      { skip: !selectedProject },
    );
  const groups = useMemo(
    () => datasetGroups?.concat(projectGroups || []),
    [datasetGroups, projectGroups],
  );

  function refetchGroups() {
    refetchDatasetGroups();
    refetchProjectGroups();
  }

  return {
    groups,
    datasetGroups,
    projectGroups,
    refetchGroups,
    refetchDatasetGroups,
    refetchProjectGroups,
  };
}
