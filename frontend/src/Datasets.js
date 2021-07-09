import React from "react";
import { useSelector, useDispatch } from 'react-redux'

import TableChartIcon from '@material-ui/icons/TableChart';

import ExpandableListItem from './ExpandableListItem'

import {
  selectAllDatasets, toggleDataset, addNewDataset
} from './features/datasets/datasetsSlice.js'


export default function Datasets() {
  const datasets = useSelector(selectAllDatasets);
  const dispatch = useDispatch()
  const handleClickItem = (item) => dispatch(toggleDataset(item))

  return (
    <ExpandableListItem 
      items={datasets} 
      text="Datasets" 
      type='dataset'
      icon={TableChartIcon}
      handleClickItem={handleClickItem}
      handleNewItem={addNewDataset}
    />
  )
}
