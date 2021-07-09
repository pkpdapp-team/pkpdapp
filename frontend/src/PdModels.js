import React from "react";
import { useSelector, useDispatch } from 'react-redux'

import FunctionsIcon from '@material-ui/icons/Functions';

import ExpandableListItem from './ExpandableListItem'

import {
  selectAllPdModels, togglePdModel, addNewPdModel
} from './features/pdModels/pdModelsSlice.js'


export default function PdModels() {
  const pdModels = useSelector(selectAllPdModels);
  const dispatch = useDispatch()
  const handleClickItem = (item) => dispatch(togglePdModel(item))

  return (
    <ExpandableListItem 
      items={pdModels} 
      text="PK Models" 
      type='pk_model'
      icon={FunctionsIcon}
      handleClickItem={handleClickItem}
      handleNewItem={addNewPdModel}
    />
  )
}
