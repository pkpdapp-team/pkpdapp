import { useSelector } from "react-redux";
import { useSubjectGroupListQuery } from "../app/backendApi";
import { RootState } from "../app/store";

export default function useSubjectGroups() {
  const selectedProject = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const selectedProjectOrZero = selectedProject || 0;
  const {
    data: groups,
    refetch: refetchGroups,
    isLoading,
  } = useSubjectGroupListQuery(
    { projectId: selectedProjectOrZero },
    { skip: !selectedProject },
  );

  // sort groups starting alphabetically, but with those starting with Sim first
  const sortedGroups = groups ? [...groups].sort((a, b) => {
    if (a.name.startsWith("Sim") && !b.name.startsWith("Sim")) {
      return -1;
    }
    if (!a.name.startsWith("Sim") && b.name.startsWith("Sim")) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  }) : [];


  return {
    groups: sortedGroups,
    refetchGroups,
    isLoading,
  };
}
