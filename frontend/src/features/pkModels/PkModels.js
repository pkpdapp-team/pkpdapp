import React, {useEffect} from "react";
import { useSelector, useDispatch } from 'react-redux'

import AccessibilityIcon from '@material-ui/icons/Accessibility';

import ExpandableListItem from '../menu/ExpandableListItem'

import {
  selectAllPkModels, togglePkModel, addNewPkModel, fetchPkModels
} from '../pkModels/pkModelsSlice.js'

import {
  fetchBasePkModels
} from '../pkModels/basePkModelsSlice.js'

import {
  fetchProtocols 
} from '../pkModels/protocolsSlice.js'

export default function PkModels({project}) {
  const pkModels = useSelector(selectAllPkModels);
  const dispatch = useDispatch()
  const handleClickItem = (item) => dispatch(togglePkModel(item))
  const handleNewItem = () => dispatch(addNewPkModel(project))

  useEffect(() => {
    console.log(project)
    if (project) {
      dispatch(fetchPkModels(project))
      dispatch(fetchBasePkModels(project))
      dispatch(fetchProtocols(project))
    }
  }, [dispatch, project]);

  return (
    <ExpandableListItem 
      items={pkModels} 
      text="PK Models" 
      type='pk_model'
      icon={AccessibilityIcon}
      handleClickItem={handleClickItem}
      handleNewItem={handleNewItem}
    />
  )
}
