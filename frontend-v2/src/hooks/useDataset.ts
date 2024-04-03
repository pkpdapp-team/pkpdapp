import { useCallback, useEffect, useState } from 'react';
import {
  DatasetRead,
  useDatasetListQuery,
  useDatasetCreateMutation,
  useProjectRetrieveQuery,
  useProtocolListQuery,
  useUnitListQuery
} from '../app/backendApi';

// assume only one dataset per project for the time being.
let appDataset: DatasetRead | null = null;

export default function useDataset(selectedProject: number | null) {
  const [dataset, setDataset] = useState<null | DatasetRead>(appDataset);
  const selectedProjectOrZero = selectedProject || 0;
  const { data: project } =
    useProjectRetrieveQuery({ id: selectedProjectOrZero }, { skip: !selectedProject }
  );
  const { data: units } = useUnitListQuery(
    { compoundId: project?.compound || 0 },
    { skip: !project?.compound },
  );
  const { data: datasets = [], isLoading: isDatasetLoading } = useDatasetListQuery(
    { projectId: selectedProjectOrZero },
    { skip: !selectedProject },
  );
  const { data: datasetProtocols } = useProtocolListQuery(
    { datasetId: dataset?.id},
    { skip: !dataset?.id },
  );
  const [
    createDataset
  ] = useDatasetCreateMutation();

  if (dataset !== appDataset) {
    setDataset(appDataset);
  }

  useEffect(function onDataLoad() {
    async function addDataset() {
      let [newDataset] = datasets;
      if (!newDataset) {
        const response = await createDataset({
          dataset: {
            name: 'New Dataset',
            project: selectedProjectOrZero,
          }
        });
        if ('data' in response && response.data) {
          newDataset = response.data;
        }
      }
      appDataset = newDataset;
      setDataset(appDataset);
    }
    if (selectedProjectOrZero && !isDatasetLoading) {
      addDataset();
    }
  }, [datasets, createDataset, isDatasetLoading, selectedProjectOrZero]);

  const updateDataset = useCallback((newDataset: DatasetRead) => {
    appDataset = newDataset;
    setDataset(appDataset);
  }, []);

  const subjectBiomarkers = dataset?.biomarkers
    .filter(b => b.is_continuous)
    .map(b => {
      const timeUnit = units?.find(u => u.id === b.display_time_unit);
      const unit = units?.find(u => u.id === b.display_unit);
      const qname = b.mapped_qname;
      const label = b.name;
      return b.data?.subjects
        .map((subjectId, index) => ({
          subjectId,
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
    protocols: datasetProtocols || [],
    subjectBiomarkers,
    updateDataset
  };
}
