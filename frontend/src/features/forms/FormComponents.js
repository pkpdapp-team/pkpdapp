import React from "react";
import TextField from '@material-ui/core/TextField';
import { makeStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import Tooltip from '@material-ui/core/Tooltip';
import MenuItem from '@material-ui/core/MenuItem';
import Typography from '@material-ui/core/Typography';
import FormControl from '@material-ui/core/FormControl';
import Slider from '@material-ui/core/Slider';
import ListSubheader from '@material-ui/core/ListSubheader';
import Button from '@material-ui/core/Button';
import Select from '@material-ui/core/Select';
import { Controller  } from "react-hook-form";
import { DateTimePicker } from '@material-ui/pickers';
import Chip from '@material-ui/core/Chip';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Box from "@material-ui/core/Box";

const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
    height: '100%',
  },
  formInput: {
    margin: theme.spacing(1),
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  chip: {
    margin: 2,
  },
  fileFieldBox: {
    margin: theme.spacing(1),
    width: '200pt',
    display: 'inline-block'
  },
  fileFieldField: {
    "& .MuiFormLabel-root.Mui-disabled": {
      color: theme.palette.text.secondary,
    },
  },
  fileFieldButton: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
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
        render={({
            field: { onChange, onBlur, value, name, ref },
            fieldState: { invalid, isTouched, isDirty, error },
            formState,
          }) => (
          <FormControlLabel
            control={
              <Checkbox
                onBlur={onBlur}
                onChange={(e, v) => {
                  onChange(e)
                }}
                checked={value}
                inputRef={ref}
                {...rest} 
              />
            }
            label={label}
          />
        )}
    />
  </div>
  )
}

export function FormSliderField({control, name, defaultValue, min, max, label, tooltip}) {
  const classes = useStyles();
  const roundNumber = (x) => {
    if (x === 0 || x === 0.0) {
      return x
    }
    else if ((Math.abs(x) < 0.01) || (Math.abs(x) >= 1000.0)) {
      const [coefficient, exponent] = x 
        .toExponential()
        .split('e')
        .map((item) => Number(item));
      return `${Math.round(coefficient)}e^${exponent}`;
    } else if (Math.abs(x) >= 100.0) {
      return x.toFixed(0)
    } else if (Math.abs(x) >= 10.0) {
      return x.toFixed(1)
    } else {
      return x.toFixed(2)
    }
  }

  const marks = [
    {
      value: min,
    },
    {
      value: max,
    },
  ];
  return (
  <div className={classes.formInput}>
    {label && 
    <Tooltip title={tooltip} placement="top">
    <Typography id={`input-slider-${name}`} gutterBottom>
      {label}
    </Typography>
    </Tooltip>
    }
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
            valueLabelFormat={roundNumber}
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


export function FormFileField({control, name, defaultValue, label, clearErrors, ...rest}) {
  const classes = useStyles();
 
  return (
    <Controller
        control={control}
        defaultValue={defaultValue}
        name={name}
        render={({ 
          field: { onChange, onBlur, value, name, ref },
          fieldState: { invalid, isTouched, isDirty, error },
          formState,
        }) => {
          const handleChange = (event) => {
            clearErrors(name)
            const files = Array.from(event.target.files);
            const [file] = files;
            if (!!onChange) onChange({ target: { value: file } });
          };
          return (
           
        <Box
          className={classes.fileFieldBox}
          component="span"
          position="relative"
          height={58}
        >
        <Box position="absolute" top={-16} bottom={0} left={0} right={0} mx={2}>
          <TextField
            className={classes.fileFieldField}
            margin="normal"
            fullWidth
            disabled
            label={label}
            value={value?.name || ""}
            error={!!error}
            helperText={error?.message || " "}
          />
        </Box>
        <Button
          className={classes.fileFieldButton}
          component="label"
        >
          <input
            type="file"
            hidden
            onChange={handleChange}
            {...rest}
          />
        </Button>
        </Box>
        )
        }}
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
              {selected.map((value) => {
                const option_list = options.filter(x => x.value === value)
                let option = {
                  key: 'user not found',
                  value: 0
                }
                if (option_list.length > 0) {
                  option = option_list[0]
                }
                return (
                <Chip key={option.value} label={option.key} 
                      className={classes.chip} />
                )
              })}
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

export function FormSelectField({control, name, defaultValue, label, options, useGroups, onChangeUser, ...rest}) {
  const classes = useStyles();
  let groups = {}
  if (useGroups) {
    for (const option of options) {
      if (!(option.group in groups)) {
        groups[option.group] = []
      }
      groups[option.group].push(option)
    }
  }
  return (
    <FormControl className={classes.formInput}>
    <InputLabel id={name.concat('-select-label')}>
      {label}
    </InputLabel>
    <Controller
        control={control}
        defaultValue={defaultValue}
        name={name}
        render={({
          field: { onChange, onBlur, value, name, ref },
          fieldState: { invalid, isTouched, isDirty, error },
          formState,
        }) => (
        <Select
          labelId={name.concat('-select-label')}
          value={value}
          error={error}
          onBlur={onBlur}
          checked={value}
          inputRef={ref}
          onChange={(value) => {
            if (onChangeUser) {
              onChangeUser(value);
            }
            return onChange(value)
          }}
          {...rest}
        >
          {useGroups ? Object.keys(groups).map((group, i) => (
            [
              <ListSubheader>{group}</ListSubheader>,
              groups[group].map((option, j) => {
                return (
                  <MenuItem key={`${i}_${j}`} value={option.value}>
                    {option.key}
                  </MenuItem>
                )
              })
            ]
          ))
          : options.map((option, i) => (
              <MenuItem key={i} value={option.value}>{option.key}</MenuItem>
          ))}
        </Select>
        )}
      />
      </FormControl>
  )
}
