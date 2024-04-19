import { useCallback, useEffect } from 'react';
import {
  DatasetRead,
  useDatasetListQuery,
  useDatasetCreateMutation,
  useProjectRetrieveQuery,
  useSubjectGroupListQuery,
  useSubjectListQuery,
  useUnitListQuery,
  useBiomarkerTypeListQuery
} from '../app/backendApi';

export default function useDataset(selectedProject: number | null) {
  const selectedProjectOrZero = selectedProject || 0;
  const { data: project } =
    useProjectRetrieveQuery({ id: selectedProjectOrZero }, { skip: !selectedProject }
  );
  const { data: units } = useUnitListQuery(
    { compoundId: project?.compound || 0 },
    { skip: !project?.compound },
  );
  const { data: datasets = [], refetch } = useDatasetListQuery(
    { projectId: selectedProjectOrZero },
    { skip: !selectedProject },
  );
  const [dataset] = datasets;
  const { data: subjects } = useSubjectListQuery(
    { datasetId: dataset?.id || 0 },
    { skip: !dataset }
  );
  const { data: subjectGroups, refetch: refetchSubjectGroups } = useSubjectGroupListQuery(
    { datasetId: dataset?.id || 0 },
    { skip: !dataset }
  );
  const { data: biomarkerTypes, refetch: refetchBiomarkerTypes } = useBiomarkerTypeListQuery(
    { datasetId: dataset?.id || 0 },
    { skip: !dataset }
  );

  const [
    createDataset
  ] = useDatasetCreateMutation();

  useEffect(() => {
    if (dataset?.id) {
      console.log('refetching groups and observations')
      refetchSubjectGroups();
      refetchBiomarkerTypes();
    }
  }, [dataset, refetchBiomarkerTypes, refetchSubjectGroups]);

  
  async function addDataset(projectId: number) {
    const response = await createDataset({
      dataset: {
        name: 'New Dataset',
        project: projectId,
      }
    });
    console.log('created a new dataset')
    return response;
  }

  const updateDataset = useCallback((newDataset: DatasetRead) => {
    console.log('updating dataset', newDataset)
    refetch();
  }, [refetch]);

  const subjectBiomarkers = biomarkerTypes?.filter(b => b.is_continuous)
    .map(b => {
      const timeUnit = units?.find(u => u.id === b.display_time_unit);
      const unit = units?.find(u => u.id === b.display_unit);
      const qname = b.mapped_qname;
      const label = b.name;
      return b.data?.subjects
        .map((subjectId, index) => ({
          subjectId,
          subjectDatasetId: subjects?.find(s => s.id === subjectId)?.id_in_dataset,
          time: b.data?.times[index],
          timeUnit,
          value: b.data?.values[index],
          unit,
          qname,
          label
        }))
        .sort((a, b) => a.subjectId - b.subjectId)
        .map((row, index) => ({ id: index + 1, ...row })) || [];
    });

  return {
    dataset,
    groups: subjectGroups || [],
    subjectBiomarkers: subjectBiomarkers || [],
    addDataset,
    updateDataset
  };
}
