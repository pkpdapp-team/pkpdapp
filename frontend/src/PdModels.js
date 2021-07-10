import React, {useEffect} from "react";
import { useSelector, useDispatch } from 'react-redux'

import FunctionsIcon from '@material-ui/icons/Functions';

import ExpandableListItem from './ExpandableListItem'

import {
  selectAllPdModels, togglePdModel, addNewPdModel, fetchPdModels
} from './features/pdModels/pdModelsSlice.js'


export default function PdModels({project}) {
  const pdModels = useSelector(selectAllPdModels);
  const dispatch = useDispatch()
  const handleClickItem = (item) => dispatch(togglePdModel(item))
  const handleNewItem = () => dispatch(addNewPdModel())

  useEffect(() => {
    console.log(project)
    if (project) {
      dispatch(fetchPdModels(project))
    }
  }, [dispatch, project]);


  return (
    <ExpandableListItem 
      items={pdModels} 
      text="PK Models" 
      type='pk_model'
      icon={FunctionsIcon}
      handleClickItem={handleClickItem}
      handleNewItem={handleNewItem}
    />
  )
}
