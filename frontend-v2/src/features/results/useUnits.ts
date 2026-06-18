import { useMemo } from "react";
import { useSelector } from "react-redux";

import { RootState } from "../../app/store";
import {
  useCompoundRetrieveQuery,
  useProjectRetrieveQuery,
  useUnitListQuery,
} from "../../app/backendApi";
import {
  computeCompatibleUnits,
  UnitReadWithCompatible,
} from "../../shared/unitConversion";

/**
 * Returns the project's units, each augmented with the list of units it can be
 * converted to and the conversion factors (compatible_units). This data used to
 * be computed by the backend; it is now derived on the frontend from the raw
 * units plus the project compound's molecular masses (see
 * shared/unitConversion.ts).
 */
export function useUnits(): UnitReadWithCompatible[] {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project } = useProjectRetrieveQuery(
    { id: projectIdOrZero },
    { skip: !projectId },
  );
  const { data: units } = useUnitListQuery({}, { skip: !project });
  const { data: compound } = useCompoundRetrieveQuery(
    { id: project?.compound || 0 },
    { skip: !project?.compound },
  );

  return useMemo(
    () => computeCompatibleUnits(units || [], compound),
    [units, compound],
  );
}
