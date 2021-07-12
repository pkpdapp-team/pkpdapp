import React from "react";
import TextField from '@material-ui/core/TextField';
import { makeStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Typography from '@material-ui/core/Typography';
import FormControl from '@material-ui/core/FormControl';
import Grid from '@material-ui/core/Grid';
import Input from '@material-ui/core/Input';
import Slider from '@material-ui/core/Slider';
import Select from '@material-ui/core/Select';
import { Controller  } from "react-hook-form";
import DateFnsUtils from '@date-io/date-fns'; // choose your lib
import { DateTimePicker } from '@material-ui/pickers';
import Chip from '@material-ui/core/Chip';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';

const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
    height: '100%',
  },
  formInput: {
    margin: theme.spacing(1),
    width: '200pt',
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  chip: {
    margin: 2,
  },
}));

export function FormCheckboxField({control, name, defaultValue, label, ...rest}) {
  const classes = useStyles();
  return (
  <div className={classes.formInput}>
    <Controller
        control={control}
        defaultValue={defaultValue}
        name={name}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Checkbox
                {...rest} 
                {...field} 
                label={label}
              />
            }
            label={label}
          />
        )}
    />
  </div>
  )
}

export function FormSliderField({control, name, defaultValue, min, max, label}) {
  const classes = useStyles();

  const marks = [
    {
      value: min,
      label: min,
    },
    {
      value: max,
      label: max,
    },
  ];
  return (
  <div className={classes.formInput}>
    <Typography id={`input-slider-${name}`} gutterBottom>
      {label}
    </Typography>
    <Controller
        control={control}
        defaultValue={defaultValue}
        name={name}
      render={({ 
        field: { onChange, onBlur, value, name, ref },
        fieldState: { invalid, isTouched, isDirty, error },
        formState,
      }) => {
          return (
          <Slider
            valueLabelDisplay="auto"
            value={value}
            step={(max-min)/100.0}
            min={min}
            max={max}
            marks={marks}
            onChange={(e, v) => {
              e.target.name = name;
              e.target.value = v;
              onChange(e)
            }}
            onBlur={(e, v) => {
              e.target.name = name;
              e.target.value = v;
              onBlur(e)
            }}
            aria-labelledby={`input-slider-${name}`}
          />
        )}}
      />
    </div>
  )
}

export function FormDateTimeField({control, name, defaultValue, label, ...rest}) {
  const classes = useStyles();
  return (
    <Controller
        control={control}
        defaultValue={defaultValue}
        name={name}
        render={({ field }) => (
          <DateTimePicker
            className={classes.formInput} 
            format="dd/MM/yyyy HH:mm"
            {...rest} 
            {...field} 
            label={label}
          />
        )}
      />
  )
}

export function FormTextField({control, name, defaultValue, label, ...rest}) {
  const classes = useStyles();
  return (
    <Controller
        control={control}
        defaultValue={defaultValue}
        name={name}
        render={({ field }) => (
          <TextField 
            className={classes.formInput} 
            {...rest} 
            {...field} 
            label={label}
          />
        )}
      />
  )
}

export function FormMultiSelectField({control, name, defaultValue, label, options, ...rest}) {
  const classes = useStyles();
  return (
    <FormControl className={classes.formInput}>
    <InputLabel id={name.concat('-select-label')}>
      {label}
    </InputLabel>
    <Controller
        control={control}
        defaultValue={defaultValue}
        name={name}
        render={({ field }) => (
        <Select
          labelId={name.concat('-select-label')}
          multiple
          renderValue={(selected) => (
            <div className={classes.chips}>
              {selected.map((value, index) => (
                <Chip key={value} label={options[index].key} 
                      className={classes.chip} />
              ))}
            </div>
          )}
          {...rest}
          {...field}
        >
          {options.map(option => {
            return (
              <MenuItem key={option.value} value={option.value}>{option.key}</MenuItem>
            )
          })}
        </Select>
        )}
      />
      </FormControl>
  )
}

export function FormSelectField({control, name, defaultValue, label, options, ...rest}) {
  const classes = useStyles();
  return (
    <FormControl className={classes.formInput}>
    <InputLabel id={name.concat('-select-label')}>
      {label}
    </InputLabel>
    <Controller
        control={control}
        defaultValue={defaultValue}
        name={name}
        render={({ field }) => (
        <Select
          labelId={name.concat('-select-label')}
          {...rest}
          {...field}
        >
          {options.map(option => {
            return (
              <MenuItem key={option.value} value={option.value}>{option.key}</MenuItem>
            )
          })}
        </Select>
        )}
      />
      </FormControl>
  )
}
