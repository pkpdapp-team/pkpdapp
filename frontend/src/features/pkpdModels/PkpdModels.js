import React from "react";
import { useSelector, useDispatch } from "react-redux";

import AccessibilityIcon from "@material-ui/icons/Accessibility";

import ExpandableListItem from "../menu/ExpandableListItem";

import {
  selectWritablePkpdModels,
  togglePkpdModel,
  addNewPkpdModel,
} from "../pkpdModels/pkpdModelsSlice.js";

export default function PkpdModels({ project, disableSave }) {
  const pkpdModels = useSelector(selectWritablePkpdModels);
  const dispatch = useDispatch();
  const handleClickItem = (item) => dispatch(togglePkpdModel(item));
  const handleNewItem = () => dispatch(addNewPkpdModel(project));

  return (
    <ExpandableListItem
      items={pkpdModels}
      text="PKPD Models"
      type="pkpd_model"
      icon={AccessibilityIcon}
      handleClickItem={handleClickItem}
      disableSave={disableSave}
      handleNewItem={handleNewItem}
    />
  );
}
