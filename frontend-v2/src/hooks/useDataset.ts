import { useCallback, useEffect, useState } from 'react';
import {
  DatasetRead,
  useDatasetListQuery,
  useDatasetCreateMutation
} from '../app/backendApi';

// assume only one dataset per project for the time being.
let appDataset: DatasetRead | null = null;

export default function useDataset(selectedProject: number | null) {
  const [dataset, setDataset] = useState<null | DatasetRead>(appDataset);
  const selectedProjectOrZero = selectedProject || 0;
  const { data: datasets = [], isLoading: isDatasetLoading } = useDatasetListQuery(
    { projectId: selectedProjectOrZero },
    { skip: !selectedProject },
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

  return {
    dataset,
    updateDataset
  };
}
