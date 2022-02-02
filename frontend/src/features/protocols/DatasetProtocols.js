import React from "react";
import { useSelector, useDispatch } from "react-redux";

import AccessibilityIcon from "@material-ui/icons/Accessibility";

import ExpandableListItem from "../menu/ExpandableListItem";

import {
  addNewProtocol,
} from "../protocols/protocolsSlice.js";


import {
  selectAllProtocols,
  toggleProtocol,
} from "../datasets/datasetsSlice.js";


export default function DatasetProtocols({ project, disableSave }) {
  const protocols = useSelector(selectAllProtocols);
  const dispatch = useDispatch();
  const handleClickItem = (item) => dispatch(toggleProtocol(item));
  const handleNewItem = () => dispatch(addNewProtocol(project));

  return (
    <ExpandableListItem
      items={protocols}
      text="Data Protocols"
      type="datasetProtocol"
      icon={AccessibilityIcon}
      disableSave={true}
      handleClickItem={handleClickItem}
      handleNewItem={handleNewItem}
    />
  );
}
