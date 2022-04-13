import React from "react";
import { useSelector, useDispatch } from "react-redux";

import TableChartIcon from "@material-ui/icons/TableChart";

import ExpandableListItem from "../menu/ExpandableListItem";

import InferenceDialog from "./InferenceDialog";

import {
  selectAllRunningInferences,
  toggleInference,
} from "../inference/inferenceSlice.js";

export default function Inferences({ project, disableSave }) {
  const [open, setOpen] = React.useState(false);
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
  };

  const inferences = useSelector(selectAllRunningInferences);
  const dispatch = useDispatch();
  const handleClickItem = (item) => dispatch(toggleInference(item));

  return (
    <React.Fragment>
    <ExpandableListItem
      items={inferences}
      text="Inference"
      type="inference"
      icon={TableChartIcon}
      disableSave={disableSave}
      handleClickItem={handleClickItem}
      handleNewItem={handleClickOpen}
    />
    <InferenceDialog 
      open={open}
      handleCloseDialog={handleCloseDialog}
      project={project}
    />
    </React.Fragment>
  );
}
