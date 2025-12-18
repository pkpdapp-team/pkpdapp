import { useSelector } from "react-redux";

import { RootState } from "../../app/store";
import {
  useCombinedModelListQuery,
  useVariableListQuery,
} from "../../app/backendApi";

export function useVariables() {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: models } = useCombinedModelListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  const model = models?.[0] || null;
  const { data: variables } = useVariableListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  return variables || [];
}
