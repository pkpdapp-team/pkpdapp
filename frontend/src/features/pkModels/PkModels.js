import React from "react";
import { useSelector, useDispatch } from "react-redux";

import AccessibilityIcon from "@material-ui/icons/Accessibility";

import ExpandableListItem from "../menu/ExpandableListItem";

import {
  selectWritablePkModels,
  togglePkModel,
  addNewPkModel,
} from "../pkModels/pkModelsSlice.js";

export default function PkModels({ project, disableSave }) {
  const pkModels = useSelector(selectWritablePkModels);
  const dispatch = useDispatch();
  const handleClickItem = (item) => dispatch(togglePkModel(item));
  const handleNewItem = () => dispatch(addNewPkModel(project));

  return (
    <ExpandableListItem
      items={pkModels}
      text="PK Models"
      type="pk_model"
      icon={AccessibilityIcon}
      handleClickItem={handleClickItem}
      disableSave={disableSave}
      handleNewItem={handleNewItem}
    />
  );
}
