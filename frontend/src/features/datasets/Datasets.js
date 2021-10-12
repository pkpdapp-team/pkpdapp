import React from "react";
import { useSelector, useDispatch } from 'react-redux'

import TableChartIcon from '@material-ui/icons/TableChart';

import ExpandableListItem from '../menu/ExpandableListItem'

import {
  selectAllDatasets, toggleDataset, addNewDataset
} from '../datasets/datasetsSlice.js'


export default function Datasets({project, disableSave}) {
  const datasets = useSelector(selectAllDatasets);
  const dispatch = useDispatch()
  const handleClickItem = (item) => dispatch(toggleDataset(item))
  const handleNewItem = () => dispatch(addNewDataset(project))

  return (
    <ExpandableListItem 
      items={datasets} 
      text="Datasets" 
      type='dataset'
      icon={TableChartIcon}
      disableSave={disableSave}
      handleClickItem={handleClickItem}
      handleNewItem={handleNewItem}
    />
  )
}
