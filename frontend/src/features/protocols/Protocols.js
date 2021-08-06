import React from "react";
import { useSelector, useDispatch } from 'react-redux'

import AccessibilityIcon from '@material-ui/icons/Accessibility';

import ExpandableListItem from '../menu/ExpandableListItem'

import {
  selectAllProtocols, toggleProtocol, addNewProtocol
} from '../protocols/protocolsSlice.js'


export default function PkModels({project}) {
  const pkModels = useSelector(selectAllProtocols);
  const dispatch = useDispatch()
  const handleClickItem = (item) => dispatch(toggleProtocol(item))
  const handleNewItem = () => dispatch(addNewProtocol(project))

  return (
    <ExpandableListItem 
      items={pkModels} 
      text="Protocols" 
      type='protocol'
      icon={AccessibilityIcon}
      handleClickItem={handleClickItem}
      handleNewItem={handleNewItem}
    />
  )
}