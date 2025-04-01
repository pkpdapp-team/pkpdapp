import { useSelector } from "react-redux";

import { RootState } from "../../app/store";
import {
  useProjectRetrieveQuery,
  useUnitListQuery,
} from "../../app/backendApi";

export function useUnits() {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project } = useProjectRetrieveQuery(
    { id: projectIdOrZero },
    { skip: !projectId },
  );
  const { data: units } = useUnitListQuery(
    { compoundId: project?.compound },
    { skip: !project || !project.compound },
  );
  return units || [];
}
