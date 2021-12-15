import React from "react";
import { useSelector, useDispatch } from 'react-redux'

import AccessibilityIcon from '@material-ui/icons/Accessibility';

import ExpandableListItem from '../menu/ExpandableListItem'

import {
  selectWritableProtocols, toggleProtocol, addNewProtocol
} from '../protocols/protocolsSlice.js'


export default function Protocols({project, disableSave}) {
  const pkModels = useSelector(selectWritableProtocols);
  const dispatch = useDispatch()
  const handleClickItem = (item) => dispatch(toggleProtocol(item))
  const handleNewItem = () => dispatch(addNewProtocol(project))

  return (
    <ExpandableListItem 
      items={pkModels} 
      text="Protocols" 
      type='protocol'
      icon={AccessibilityIcon}
      disableSave={disableSave}
      handleClickItem={handleClickItem}
      handleNewItem={handleNewItem}
    />
  )
}
