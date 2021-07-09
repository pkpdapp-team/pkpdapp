import React from "react";
import { useSelector, useDispatch } from 'react-redux'

import AccessibilityIcon from '@material-ui/icons/Accessibility';

import ExpandableListItem from './ExpandableListItem'

import {
  selectAllPkModels, togglePkModel, addNewPkModel
} from './features/pkModels/pkModelsSlice.js'


export default function PkModels() {
  const pkModels = useSelector(selectAllPkModels);
  const dispatch = useDispatch()
  const handleClickItem = (item) => dispatch(togglePkModel(item))

  return (
    <ExpandableListItem 
      items={pkModels} 
      text="PK Models" 
      type='pk_model'
      icon={AccessibilityIcon}
      handleClickItem={handleClickItem}
      handleNewItem={addNewPkModel}
    />
  )
}
