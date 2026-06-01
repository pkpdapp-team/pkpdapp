import { useCallback, useMemo } from "react";
import {
  DatasetRead,
  BiomarkerTypeListApiResponse,
  SubjectGroupListApiResponse,
  useCombinedModelListQuery,
  useDatasetRetrieveQuery,
  useDatasetCreateMutation,
  useProjectRetrieveQuery,
  useSubjectListQuery,
  useUnitListQuery,
  useBiomarkerTypeListQuery,
  UnitRead,
  useVariableListQuery,
  useProtocolListQuery,
} from "../app/backendApi";
import useSubjectGroups from "./useSubjectGroups";

export type SubjectBiomarker = {
  id: number;
  subjectId: number;
  subjectDatasetId: number | undefined;
  time: number;
  timeUnit: UnitRead | undefined;
  value: number;
  unit: UnitRead | undefined;
  qname: string | undefined;
  label: string;
};
const DEFAULT_GROUPS: SubjectGroupListApiResponse = [];
const DEFAULT_BIOMARKERS: BiomarkerTypeListApiResponse = [];

export default function useDataset(selectedProject: number | null) {
  const selectedProjectOrZero = selectedProject || 0;
  const { data: project } = useProjectRetrieveQuery(
    { id: selectedProjectOrZero },
    { skip: !selectedProject },
  );
  const { data: models } = useCombinedModelListQuery(
    { projectId: selectedProjectOrZero },
    { skip: !selectedProject },
  );
  const model = useMemo(() => {
    return models?.[0] || undefined;
  }, [models]);
  const { data: units } = useUnitListQuery(
    { compoundId: project?.compound || 0 },
    { skip: !project?.compound },
  );
  const datasetIdOrZero = project?.datasets[0] || 0;

  const { data: dataset, refetch } = useDatasetRetrieveQuery(
    { id: datasetIdOrZero },
    { skip: !datasetIdOrZero },
  );
  const { data: subjects, refetch: refetchSubjects } = useSubjectListQuery(
    { datasetId: datasetIdOrZero },
    { skip: !datasetIdOrZero },
  );
  const { groups, refetchGroups } = useSubjectGroups();
  const datasetGroupData = groups?.filter(
    (group) => group.dataset === datasetIdOrZero,
  );
  const subjectGroups = datasetGroupData || DEFAULT_GROUPS;
  const { data: biomarkerTypeData, refetch: refetchBiomarkerTypes } =
    useBiomarkerTypeListQuery(
      { datasetId: datasetIdOrZero },
      { skip: !datasetIdOrZero },
    );
  const biomarkerTypes = biomarkerTypeData || DEFAULT_BIOMARKERS;

  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );

  const { refetch: refetchProtocols } = useProtocolListQuery(
    { projectId: selectedProjectOrZero },
    { skip: !selectedProject },
  );

  const [createDataset] = useDatasetCreateMutation();

  async function addDataset(projectId: number) {
    const response = await createDataset({
      dataset: {
        name: "New Dataset",
        project: projectId,
      },
    });
    console.log("created a new dataset");
    return response;
  }

  const updateDataset = useCallback(
    (newDataset: DatasetRead) => {
      console.log("updating dataset", newDataset);
      refetch();
      refetchSubjects();
      refetchProtocols();
      refetchGroups();
      refetchBiomarkerTypes();
    },
    [
      refetch,
      refetchSubjects,
      refetchProtocols,
      refetchGroups,
      refetchBiomarkerTypes,
    ],
  );

  const subjectBiomarkers: SubjectBiomarker[][] = biomarkerTypes
    .filter((b) => b.is_continuous)
    .map((b) => {
      const timeUnit = units?.find((u) => u.id === b.display_time_unit);
      const unit = units?.find((u) => u.id === b.display_unit);
      const qname = variables?.find((v) => v.id === b.variable)?.qname;
      const label = b.name;
      return (
        b.data?.subjects
          .map((subjectId, index) => ({
            subjectId,
            subjectDatasetId: subjects?.find((s) => s.id === subjectId)
              ?.id_in_dataset,
            time: b.data?.times[index],
            timeUnit,
            value: b.data?.values[index],
            unit,
            qname,
            label,
          }))
          .sort((a, b) => a.subjectId - b.subjectId)
          .map((row, index) => ({ id: index + 1, ...row })) || []
      );
    });

  return {
    dataset,
    groups: subjectGroups,
    subjectBiomarkers: subjectBiomarkers,
    addDataset,
    updateDataset,
  };
}
