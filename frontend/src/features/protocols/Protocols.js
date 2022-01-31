import React from "react";
import { useSelector, useDispatch } from "react-redux";

import AccessibilityIcon from "@material-ui/icons/Accessibility";

import ExpandableListItem from "../menu/ExpandableListItem";

import {
  selectWritableProtocols,
  selectAllProtocols,
  toggleProtocol,
  addNewProtocol,
} from "../protocols/protocolsSlice.js";

export default function Protocols({ project, disableSave }) {
  const protocols = useSelector(selectWritableProtocols);
  const dispatch = useDispatch();
  const handleClickItem = (item) => dispatch(toggleProtocol(item));
  const handleNewItem = () => dispatch(addNewProtocol(project));

  return (
    <ExpandableListItem
      items={protocols}
      text="Protocols"
      type="protocol"
      icon={AccessibilityIcon}
      disableSave={disableSave}
      handleClickItem={handleClickItem}
      handleNewItem={handleNewItem}
    />
  );
}
