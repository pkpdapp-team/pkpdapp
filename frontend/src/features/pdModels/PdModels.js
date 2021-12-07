import React from "react";
import { useSelector, useDispatch } from 'react-redux'

import FunctionsIcon from '@material-ui/icons/Functions';

import ExpandableListItem from '../menu/ExpandableListItem'

import {
  selectWritablePdModels, togglePdModel, addNewPdModel,
} from '../pdModels/pdModelsSlice.js'


export default function PdModels({project, disableSave}) {
  const pdModels = useSelector(selectWritablePdModels);
  const dispatch = useDispatch()
  const handleClickItem = (item) => dispatch(togglePdModel(item))
  const handleNewItem = () => dispatch(addNewPdModel(project))

    return (
    <ExpandableListItem 
      items={pdModels} 
      text="PD Models" 
      type='pd_model'
      icon={FunctionsIcon}
      disableSave={disableSave}
      handleClickItem={handleClickItem}
      handleNewItem={handleNewItem}
    />
  )
}
