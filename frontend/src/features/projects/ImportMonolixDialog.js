import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import CardActions from "@mui/material/CardActions";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import { useForm, useFieldArray } from "react-hook-form";
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import makeStyles from '@mui/styles/makeStyles';
import { selectAllInferences } from "../inference/inferenceSlice";
import Table from '@mui/material/Table';
import TableCell from '@mui/material/TableCell';
import Tooltip from "@mui/material/Tooltip";
import TableContainer from '@mui/material/TableContainer';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';

import Typography from "@mui/material/Typography";
import DialogActions from "@mui/material/DialogActions";

import LinearProgressWithLabel from '../menu/LinearProgressWithLabel'
import { FormSelectField } from "../forms/FormComponents";
import { CardActionArea } from "@mui/material";
import { importMonolix, importMonolixStatus, importMonolixErrors } from "./projectsSlice";

const useStyles = makeStyles((theme) => ({
  fileCard: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  fileCardContent: {
    display: "flex",
    flexDirection: "column",
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: "left",
  },
  controlsRoot: {
    display: "flex",
    alignItems: "center",
  },
  controls: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  dialogPaper: {
    "& > *": {
      margin: theme.spacing(1),
    },
  },
  content: {
    marginTop: theme.spacing(2),
    maxHeight: 100,
    overflow: "auto",
  }
}));

function FileCard({ index, file, control, api_errors, errors, clearErrors }) {
  const classes = useStyles();
  const [content, setContent] = useState(null);
  const filename = file.file.name;
  const filetype = file.type;

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = function() {
      setContent(reader.result);
    };
    reader.onerror = function() {
      setContent("Error: could not read file");
    };
    reader.readAsText(file.file);
  }, [file.file])

  const current_type = file.monolix_type;
  let error = null;
  if (api_errors && api_errors[current_type]) {
    error = api_errors[current_type]
  }

  console.log('errors', errors, 'index', index)

  const handleOnChange = (e) => {
    console.log('e', e)
    clearErrors(`files[${index}].monolix_type`);
    if (e.target.value === 'project_mlxtran') {
      clearErrors('project_mlxtran');
    }
    if (e.target.value === 'model_txt') {
      clearErrors('model_txt');
    }
    if (e.target.value === 'data_csv') {
      clearErrors('data_csv');
    }
    return e;
  }

  return (
    <Card className={classes.fileCard}>
      <CardContent>
        <div className={classes.fileCardContent}>
          <Typography className={classes.title} variant="h6">
            {file.file.name}
          </Typography>
          <Divider />
          <Typography className={classes.content}  variant="body2">
            {content}
          </Typography>
        </div>
        {error && 
          <Typography color="error" variant="body2">{error}</Typography>
        } 
      </CardContent>
      <CardActions>
        <div className={classes.controlsRoot}>
        <FormSelectField
          className={classes.controls}
          control={control}
          name={`files[${index}].monolix_type`}
          onChangeUser={handleOnChange}
          defaultValue={file.monolix_type}
          label="Enter file type"
          rules={{ required: true }}
          options={[
            { value: "project_mlxtran", key: "Project mlxtran file" },
            { value: "model_txt", key: "Structural model file" },
            { value: "data_csv", key: "CSV data file" },
          ]}
        />
        </div>
      </CardActions>
    </Card>
  );
}



export default function ImportMonolixDialog({ project, onClose, open }) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const [fileList, setFileList] = useState(null);
  const uploadStatus = useSelector(state => importMonolixStatus(state, project));
  const uploadErrors = useSelector(state => importMonolixErrors(state, project));
  const { handleSubmit, control, register, reset, setError, formState: { errors }, clearErrors, watch } = useForm();
  const { fields, append, prepend, remove, swap, move, insert, replace } = useFieldArray({
    control,
    name: "files",
  });
  console.log('errors', errors);

  const handleFileChange = (e) => {
    const fileList = e.target.files;
    const files = fileList ? [...fileList] : [];
    const files_with_type = files.map(file => {
      if (file.name.endsWith('.mlxtran')) {
        return { file, monolix_type: 'project_mlxtran'}
      } else if (file.name.endsWith('.csv')) {
        return { file, monolix_type: 'data_csv'}
      } else if (file.name.endsWith('.txt')) {
        return { file, monolix_type: 'model_txt' }
      } else {
        return { file, monolix_type: ''}
      }
    });
    reset({ files: files_with_type });
  };

  useEffect(() => {
    validateFiles(fields);
  }, [JSON.stringify(fields)]);

  const validateFiles = (files) => {
    console.log('validateFiles', files)
    if (!files) {
      return;
    }
    const project_indices = files.map(
      (file, index) => ({index, type: file.monolix_type})
    ).filter(({index, type}) => type === 'project_mlxtran')
    .map(({index, type}) => index);
    const data_indices = files.map(
      (file, index) => ({index, type: file.monolix_type})
    ).filter(({index, type}) => type === 'data_csv')
    .map(({index, type}) => index);
    const model_indices = files.map(
      (file, index) => ({index, type: file.monolix_type})
    ).filter(({index, type}) => type === 'model_txt')
    .map(({index, type}) => index);

    let errored = false;
    if (project_indices.length !== 1) {
      if (project_indices.length === 0) {
        setError(`project_mlxtran`, { type: 'custom', message: 'A project file is required' });
      }
      for (const index of project_indices) {
        setError(`files[ ${index}].monolix_type`, { type: 'custom', message: 'Only one project file is allowed' });
      }
      errored = true;
    }
    if (data_indices.length !== 1) {
      if (data_indices.length === 0) {
        setError(`data_csv`, { type: 'custom', message: 'A data file is required' });
      }
      for (const index of data_indices) {
        setError(`files[${index}].monolix_type`, { type: 'custom', message: 'Only one data file is allowed' });
      }
      errored = true;
    }
    console.log('model_indices', model_indices)
    if (model_indices.length !== 1) {
      if (model_indices.length === 0) {
        setError(`model_txt`, { type: 'custom', message: 'A model file is required' });
      }
      console.log('XXmodel_indices', model_indices)
      for (const index of model_indices) {
        setError(`files[${index}].monolix_type`, { type: 'custom', message: 'Only one model file is allowed' });
      }
      errored = true;
    }
    if (!errored) {
      clearErrors();
    }
    return errored;
  };

  const onSubmit = (files) => {
    console.log('uploading files', files.files)
    const errored = validateFiles(files.files);
    if (errored) {
      return;
    }
    const data = {
      id: project.id,
      project_mlxtran: files.files.filter(file => file.monolix_type === 'project_mlxtran')[0].file,
      model_txt: files.files.filter(file => file.monolix_type === 'model_txt')[0].file,
      data_csv: files.files.filter(file => file.monolix_type === 'data_csv')[0].file,
    }

    dispatch(importMonolix(data));
  };

  const files = fileList ? [...fileList] : [];

  const handleClose = () => {
    reset({ files: [] });
    onClose();
  };


  let uploadButtonColor = 'primary'
  if (uploadStatus === 'loading') {
    uploadButtonColor = 'secondary'
  } else if (uploadStatus === 'success') {
    uploadButtonColor = 'succeeded'
  } else if (uploadStatus === 'failed') {
    uploadButtonColor = 'error'
  }

  return (
    <form autoComplete="off">
    <Dialog open={open} onClose={handleClose} maxWidth='md' fullWidth>
    <DialogContent className={classes.dialogPaper}>
    <Typography variant="h5">
      Upload project, model and data files
    </Typography>
    <Typography>
      Choose the project, model and data files to upload.
    </Typography>
    <input type="file" onChange={handleFileChange} multiple />
    <ul>
      {fields.map((file, i) => (
        <FileCard 
          key={i} index={i} 
          file={file} control={control} 
          api_errors={uploadErrors} errors={errors?.['files']?.[i]} 
          clearErrors={clearErrors}
        />
      ))}
    </ul>

    { errors?.['project_mlxtran'] && <Typography color='error'>{errors?.['project_mlxtran'].message}</Typography> }
    { errors?.['model_txt'] && <Typography color='error'>{errors?.['model_txt'].message}</Typography> }
    { errors?.['data_csv'] && <Typography color='error'>{errors?.['data_csv'].message}</Typography> }
    { uploadStatus === 'failed' && <Typography color='error'>{uploadErrors}</Typography> }
    { uploadStatus === 'succeeded' && <Typography color='success'>Upload successful</Typography>}
    { uploadStatus === 'loading' && <Typography color='secondary'>Uploading...</Typography>}
    </DialogContent>
    <DialogActions>
    <Button 
      onClick={handleSubmit(onSubmit)}
      color = {uploadButtonColor}
    >Upload</Button>
    <Button onClick={handleClose}>Close</Button>
    </DialogActions>
    </Dialog>
    </form>
  );
}
