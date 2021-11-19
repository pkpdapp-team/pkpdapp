import React from "react";
import { useSelector, useDispatch } from 'react-redux'

import TableChartIcon from '@material-ui/icons/TableChart';

import ExpandableListItem from '../menu/ExpandableListItem'

import {
  selectAllDraftInferences, toggleDraftInference, addNewDraftInference
} from '../inference/draftInferenceSlice.js'


export default function Inferences({project, disableSave}) {
  const inferences = useSelector(selectAllDraftInferences);
  const dispatch = useDispatch()
  const handleClickItem = (item) => dispatch(toggleDraftInference(item))
  const handleNewItem = () => dispatch(addNewDraftInference(project))

  return (
    <ExpandableListItem 
      items={inferences} 
      text="Inference" 
      type='inference'
      icon={TableChartIcon}
      disableSave={disableSave}
      handleClickItem={handleClickItem}
      handleNewItem={handleNewItem}
    />
  )
}
