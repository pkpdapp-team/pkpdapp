import React, { useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux'

import TableChartIcon from '@material-ui/icons/TableChart';

import ExpandableListItem from './ExpandableListItem'

import {
  fetchDatasets, selectAllDatasets, toggleDataset, addNewDataset
} from './features/datasets/datasetsSlice.js'


export default function Datasets({project}) {
  const datasets = useSelector(selectAllDatasets);
  const dispatch = useDispatch()
  const handleClickItem = (item) => dispatch(toggleDataset(item))
  const handleNewItem = () => dispatch(addNewDataset())

  useEffect(() => {
    console.log(project)
    if (project) {
      dispatch(fetchDatasets(project))
    }
  }, [dispatch, project]);

  return (
    <ExpandableListItem 
      items={datasets} 
      text="Datasets" 
      type='dataset'
      icon={TableChartIcon}
      handleClickItem={handleClickItem}
      handleNewItem={handleNewItem}
    />
  )
}
