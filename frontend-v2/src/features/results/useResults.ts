import { useSelector } from "react-redux";

import { RootState } from "../../app/store";
import {
  ResultsTableRead,
  useResultsTableCreateMutation,
  useResultsTableDestroyMutation,
  useResultsTableListQuery,
  useResultsTableUpdateMutation,
} from "../../app/backendApi";

export function useResults() {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: results, refetch } = useResultsTableListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  const [updateResults] = useResultsTableUpdateMutation();
  const [createResults] = useResultsTableCreateMutation();
  const [deleteResults] = useResultsTableDestroyMutation();
  return {
    results: results || [],
    updateResults,
    async createResults({ resultsTable }: { resultsTable: ResultsTableRead }) {
      await createResults({ resultsTable });
      if (projectId) {
        return refetch();
      }
    },
    async deleteResults({ id }: { id: number }) {
      await deleteResults({ id });
      if (projectId) {
        return refetch();
      }
    },
  };
}
