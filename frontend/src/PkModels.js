import React, {useEffect} from "react";
import { useSelector, useDispatch } from 'react-redux'

import AccessibilityIcon from '@material-ui/icons/Accessibility';

import ExpandableListItem from './ExpandableListItem'

import {
  selectAllPkModels, togglePkModel, addNewPkModel, fetchPkModels
} from './features/pkModels/pkModelsSlice.js'

import {
  fetchBasePkModels
} from './features/pkModels/basePkModelsSlice.js'

import {
  fetchProtocols 
} from './features/pkModels/protocolsSlice.js'

export default function PkModels({project}) {
  const pkModels = useSelector(selectAllPkModels);
  const dispatch = useDispatch()
  const handleClickItem = (item) => dispatch(togglePkModel(item))
  const handleNewItem = () => dispatch(addNewPkModel())

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
