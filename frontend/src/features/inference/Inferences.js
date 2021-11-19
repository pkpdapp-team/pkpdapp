import React from "react";
import { useSelector, useDispatch } from 'react-redux'

import TableChartIcon from '@material-ui/icons/TableChart';

import ExpandableListItem from '../menu/ExpandableListItem'

import {
  selectAllInferences, toggleInference, addNewInference
} from '../inference/inferenceSlice.js'


export default function Inferences({project, disableSave}) {
  const inferences = useSelector(selectAllInferences);
  const dispatch = useDispatch()
  const handleClickItem = (item) => dispatch(toggleInference(item))

  return (
    <ExpandableListItem 
      items={inferences} 
      text="Inference" 
      type='inference'
      icon={TableChartIcon}
      disableSave={disableSave}
      handleClickItem={handleClickItem}
    />
  )
}
