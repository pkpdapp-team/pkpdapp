import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Button from "@material-ui/core/Button";
import List from "@material-ui/core/List";
import IconButton from "@material-ui/core/IconButton";
import Grid from "@material-ui/core/Grid";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import Tooltip from "@material-ui/core/Tooltip";
import Avatar from "@material-ui/core/Avatar";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";

import { useForm, useFieldArray } from "react-hook-form";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";

import ComponentForm from "../forms/ComponentForm";
import { FormTextField, FormSelectField } from "../forms/FormComponents";

import { selectAllPkModels } from "../pkModels/pkModelsSlice.js";
import { selectAllPdModels } from "../pdModels/pdModelsSlice.js";

import { 
  selectVariablesByDosedPkModel,
  selectVariablesByPdModel,
} from "../variables/variablesSlice.js";

import { updatePkpdModel, deletePkpdModel } from "../pkpdModels/pkpdModelsSlice.js";

import { userHasReadOnlyAccess } from "../projects/projectsSlice";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
  },
  components: {
    width: "100%",
  },
  formRoot: {
    width: "100%",
    display: "flex",
    '& .MuiFormControl-root': { flex: 1 },
  },
  controls: {
    display: "flex",
    alignItems: "center",
    paddingLeft: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    "& > *": {
      margin: theme.spacing(1),
    },
  },
  avatarPlus: {
    width: theme.spacing(5),
    height: theme.spacing(5),
    backgroundColor: theme.palette.primary.main,
  },
}));

export default function PkpdDetail({ project, pkpd_model }) {
  const classes = useStyles();
  const { control, handleSubmit, reset, watch } = useForm();
  const dispatch = useDispatch();

  const pkModels = useSelector(selectAllPkModels);
  const pk_model_options = pkModels.map((pk_model) => ({
    key: pk_model.name,
    value: pk_model.id,
  }));
  const pdModels = useSelector(selectAllPdModels);
  const pd_model_options = pdModels.map((pd_model) => ({
    key: pd_model.name,
    value: pd_model.id,
  }));

  const watchPkModelId = watch('dosed_pk_model')
  const pkVariables = useSelector((state) => {
    if (watchPkModelId) {
        return selectVariablesByDosedPkModel(state, watchPkModelId);
    }
  });
  const pkVariablesOptions = pkVariables?.map(v => ({
    key: v.qname, value: v.id
  }))
  const watchPdModelId = watch('pd_model')
  const pdVariables = useSelector((state) => {
    if (watchPdModelId) {
        return selectVariablesByPdModel(state, watchPdModelId);
    }
  });
  const pdVariablesOptions = pdVariables?.map(v => ({
    key: v.qname, value: v.id
  }))

  const {
    fields: mappings,
    append: mappingsAppend,
    remove: mappingsRemove,
  } = useFieldArray({
    control,
    name: `mappings`,
  });

  useEffect(() => {
    reset(pkpd_model);
  }, [reset, pkpd_model]);

  const handleNewMapping = () => mappingsAppend(
    { pkpd_model: pkpd_model.id, pk_variable: '', pd_variable: '' } 
  )

  const handlePkpdDelete = () => {
    dispatch(deletePkpdModel(pkpd_model.id));
  };

  const onSubmit = (values) => {
    dispatch(updatePkpdModel(values));
  };

  const disableSave = userHasReadOnlyAccess(project);

  return (
    <div className={classes.root}>
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <Grid container spacing={1}>
      <Grid item xs={12}>
      <FormTextField
        control={control}
        defaultValue={pkpd_model.name}
        name="name"
        label="Name"
      />
      </Grid>

      <Grid item xs={6}>
      <FormSelectField
        control={control}
        defaultValue={pkpd_model.dosed_pk_model}
        options={pk_model_options}
        name="dosed_pk_model"
        label="Pharmacokinetic Model"
      />
      </Grid>
      <Grid item xs={6}>
      <FormSelectField
        control={control}
        defaultValue={pkpd_model.pd_model}
        options={pd_model_options}
        name="pd_model"
        label="Pharmacodynamic Model"
      />
      </Grid>

      <Grid item xs={12}>
      <Typography>Mapping variables</Typography>
      </Grid>
      {mappings.map((mapping, i) => {
        return (
          <React.Fragment key={i}>
          <Grid item xs={2}>
          </Grid>
          <Grid item xs={4}>
          <FormSelectField
            control={control}
            defaultValue={mapping.pk_variable}
            options={pkVariablesOptions}
            name={`mappings[${i}].pk_variable`}
            label="Pharmacokinetic Variable"
          />
          </Grid>
          <Grid item xs={4}>
          <FormSelectField
            control={control}
            defaultValue={mapping.pd_variable}
            options={pdVariablesOptions}
            name={`mappings[${i}].pd_variable`}
            label="Pharmacodynamic Variable"
          />
          </Grid>
          <Grid item xs={2}>
          <IconButton size="small" onClick={() => mappingsRemove(i)}>
            <DeleteIcon />
          </IconButton>
          </Grid>
          </React.Fragment>
        )
      })}
        <IconButton size="small" onClick={handleNewMapping}>
          <AddIcon />
         </IconButton>

      <Grid item xs={12}>
      <Typography>Components</Typography>
      <List>
        {pkpd_model.components.map((component, index) => {
          return (
            <ListItem key={index} role={undefined} dense>
              <div className={classes.components}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography className={classes.heading}>
                      {component.name === "myokit" ? "root" : component.name}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <ComponentForm
                      control={control}
                      component={component}
                      disableSave={disableSave}
                    />
                  </AccordionDetails>
                </Accordion>
              </div>
            </ListItem>
          );
        })}
      </List>
      </Grid>
      </Grid>
      <div className={classes.controls}>
        <Button type="submit" variant="contained" disabled={disableSave}>
          Save
        </Button>
        <Button
          variant="contained"
          onClick={handlePkpdDelete}
          disabled={disableSave}
        >
          Delete
        </Button>
      </div>
    </form>
    </div>
  );
}
