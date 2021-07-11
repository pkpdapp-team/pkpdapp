import React, {useEffect} from "react";
import { useSelector, useDispatch } from 'react-redux'

import FunctionsIcon from '@material-ui/icons/Functions';

import ExpandableListItem from '../menu/ExpandableListItem'

import {
  selectAllPdModels, togglePdModel, addNewPdModel, fetchPdModels
} from '../pdModels/pdModelsSlice.js'


export default function PdModels({project}) {
  const pdModels = useSelector(selectAllPdModels);
  const dispatch = useDispatch()
  const handleClickItem = (item) => dispatch(togglePdModel(item))
  const handleNewItem = () => dispatch(addNewPdModel(project))

  useEffect(() => {
    console.log(project)
    if (project) {
      dispatch(fetchPdModels(project))
    }
  }, [dispatch, project]);


  return (
    <ExpandableListItem 
      items={pdModels} 
      text="PD Models" 
      type='pd_model'
      icon={FunctionsIcon}
      handleClickItem={handleClickItem}
      handleNewItem={handleNewItem}
    />
  )
}
