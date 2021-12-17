import React from "react";
import { useSelector, useDispatch } from "react-redux";

import TableChartIcon from "@material-ui/icons/TableChart";

import ExpandableListItem from "../menu/ExpandableListItem";

import {
  selectAllDraftInferences,
  toggleInference,
  addNewInference,
} from "../inference/inferenceSlice.js";

export default function Inferences({ project, disableSave }) {
  const inferences = useSelector(selectAllDraftInferences);
  const dispatch = useDispatch();
  const handleClickItem = (item) => dispatch(toggleInference(item));
  const handleNewItem = () => dispatch(addNewInference(project));

  return (
    <ExpandableListItem
      items={inferences}
      text="Draft Inference"
      type="inference"
      icon={TableChartIcon}
      disableSave={disableSave}
      handleClickItem={handleClickItem}
      handleNewItem={handleNewItem}
    />
  );
}
