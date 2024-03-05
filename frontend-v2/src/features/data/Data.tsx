import { FC, useState } from "react";
import { Button } from "@mui/material";
import LoadDataStepper from "./LoadDataStepper";

const Data:FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  function handleNewUpload() {
    setIsLoading(true);
  }
  function onUploadComplete() {
    setIsLoading(false);
  }

  return isLoading ?
    <LoadDataStepper onFinish={onUploadComplete}  /> :
    <Button variant="outlined" onClick={handleNewUpload}>
      Upload new dataset
    </Button>;
}

export default Data;
