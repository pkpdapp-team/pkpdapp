import { useSelector } from "react-redux";
import { useSubjectGroupListQuery } from "../app/backendApi";
import { RootState } from "../app/store";

export default function useSubjectGroups() {
  const selectedProject = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const selectedProjectOrZero = selectedProject || 0;
  const { data: groups, refetch: refetchGroups } = useSubjectGroupListQuery(
    { projectId: selectedProjectOrZero },
    { skip: !selectedProject },
  );

  return {
    groups,
    refetchGroups,
  };
}
