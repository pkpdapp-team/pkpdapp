import React from "react";
import TextField from "@mui/material/TextField";

import makeStyles from '@mui/styles/makeStyles';
import InputLabel from "@mui/material/InputLabel";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import Slider from "@mui/material/Slider";
import ListSubheader from "@mui/material/ListSubheader";
import Button from "@mui/material/Button";
import Select from "@mui/material/Select";
import { Controller } from "react-hook-form";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";

import OutlinedInput from "@mui/material/OutlinedInput";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Box from "@mui/material/Box";

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
    height: "100%",
  },
  formInput: {
    display: "flex",
    margin: theme.spacing(1),
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
  },
  chip: {
    margin: 2,
  },
  fileFieldBox: {
    margin: theme.spacing(1),
    width: "200pt",
    display: "inline-block",
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

export function FormCheckboxField({
  control,
  name,
  defaultValue,
  label,
  ...rest
}) {
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
                  onChange(e);
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
  );
}

export function FormSliderField({
  control,
  name,
  defaultValue,
  min,
  label_min,
  label_max,
  max,
  log,
  label,
  tooltip,
}) {
  const classes = useStyles();
  const roundNumber = (x) => {
    if (x === 0 || x === 0.0) {
      return x;
    } else if (Math.abs(x) < 0.01 || Math.abs(x) >= 1000.0) {
      const [coefficient, exponent] = x
        .toExponential()
        .split("e")
        .map((item) => Number(item));
      return `${Math.round(coefficient)}e^${exponent}`;
    } else if (Math.abs(x) >= 100.0) {
      return x.toFixed(0);
    } else if (Math.abs(x) >= 10.0) {
      return x.toFixed(1);
    } else {
      return x.toFixed(2);
    }
  };


  let calculateValue = (value) => value;
  if (log) {
    calculateValue = (value) => Math.exp(value);
  } 

  const marks = [
      label_min ? {
        value: min,
        label: label_min,
      } : 
      {
        value: min,
      },
      label_max ? {
        value: max,
        label: label_max,
      } : 
      {
        value: max,
      },

  ]

  const internalMin = log ? Math.log(min) : min;
  const internalMax = log ? Math.log(max) : max;
  const internalStep = log ? (Math.log(max) - Math.log(min)) / 100.0 : (max - min) / 100.0;

  return (
    <div className={classes.formInput}>
      {label && (
        <Tooltip title={tooltip} placement="top">
          <Typography id={`input-slider-${name}`} gutterBottom>
            {label}
          </Typography>
        </Tooltip>
      )}
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
              step={internalStep}
              min={internalMin}
              max={internalMax}
              scale={calculateValue}
              marks={marks}
              onChange={(e, v) => {
                e.target.name = name;
                e.target.value = v;
                onChange(e);
              }}
              onBlur={(e, v) => {
                e.target.name = name;
                e.target.value = v;
                onBlur(e);
              }}
              aria-labelledby={`input-slider-${name}`}
            />
          );
        }}
      />
    </div>
  );
}

export function FormDateTimeField({
  control,
  name,
  defaultValue,
  label,
  ...rest
}) {
  const classes = useStyles();
  return (
    <Controller
      control={control}
      defaultValue={defaultValue}
      name={name}
      render={({ 
        field,
      }) => (
        <DateTimePicker
          className={classes.formInput}
          {...rest}
          {...field}
          value={dayjs.utc(field.value)}
          label={label}
        />
      )}
    />
  );
}

export function FormFileField({
  control,
  name,
  defaultValue,
  label,
  clearErrors,
  ...rest
}) {
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
          clearErrors(name);
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
            <Box
              position="absolute"
              top={-16}
              bottom={0}
              left={0}
              right={0}
              mx={2}
            >
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
            <Button className={classes.fileFieldButton} component="label">
              <input type="file" hidden onChange={handleChange} {...rest} />
            </Button>
          </Box>
        );
      }}
    />
  );
}

export function FormTextField({ control, name, defaultValue, label, ...rest }) {
  return (
    <Controller
      control={control}
      defaultValue={defaultValue}
      name={name}
      render={({ field }) => (
        <TextField
          {...rest}
          {...field}
          label={label}
        />
      )}
    />
  );
}

export function FormMultiSelectField({
  control,
  name,
  defaultValue,
  label,
  options,
  ...rest
}) {
  const classes = useStyles();
  return (
    <div>
    <FormControl fullWidth>
      <InputLabel id={name.concat("-select-label")}>{label}</InputLabel>
      <Controller
        control={control}
        defaultValue={defaultValue}
        name={name}
        render={({ field }) => (
          <Select
            labelId={name.concat("-select-label")}
            id={name.concat("-select")}
            multiple
            input={<OutlinedInput label="Name" />}
            renderValue={(selected) => (
              <Stack direction="row" spacing={1}>
                {selected.map((value) => {
                  const option_list = options.filter((x) => x.value === value);
                  let option = {
                    key: "user not found",
                    value: 0,
                  };
                  if (option_list.length > 0) {
                    option = option_list[0];
                  }
                  return (
                    <Chip
                      key={option.value}
                      label={option.key}
                    />
                  );
                })}
              </Stack>
            )}
            {...rest}
            {...field}
          >
            {options.map((option) => {
              return (
                <MenuItem key={option.value} value={option.value}>
                  {option.key}
                </MenuItem>
              );
            })}
          </Select>
        )}
      />
    </FormControl>
    </div>
  );
}

export function FormSelectField({
  control,
  name,
  defaultValue,
  label,
  options,
  displayEmpty,
  useGroups,
  onChangeUser,
  ...rest
}) {
  let groups = {};
  if (useGroups) {
    for (const option of options) {
      if (!(option.group in groups)) {
        groups[option.group] = [];
      }
      groups[option.group].push(option);
    }
  }
  return (
    <div>
    <FormControl fullWidth>
      <InputLabel 
        id={name.concat("-select-label")} 
        shrink={displayEmpty}
      >{label}</InputLabel>
      <Controller
        control={control}
        defaultValue={defaultValue}
        name={name}
        onFocus={() => {
          const inputEl = document.querySelector(`input[name="${name}"]`);
          inputEl.focus();
        }}
        render={({
          field: { onChange, onBlur, value, name, ref },
          fieldState: { invalid, isTouched, isDirty, error },
          formState,
        }) => {
          console.log("error in select", error);
          return (
          <div>
          <Select
            id={name.concat("-select")}
            labelId={name.concat("-select-label")}
            value={value}
            error={error}
            autoWidth={true}
            onBlur={onBlur}
            input={<OutlinedInput label={label} />}
            checked={value}
            displayEmpty
            inputRef={ref}
            onChange={(value) => {
              if (onChangeUser) {
                onChangeUser(value);
              }
              return onChange(value);
            }}
            {...rest}
          >
            {useGroups
              ? Object.keys(groups).map((group, i) => [
                  <ListSubheader>{group}</ListSubheader>,
                  groups[group].map((option, j) => {
                    return (
                      <MenuItem key={`${i}_${j}`} value={option.value}>
                        {option.key}
                      </MenuItem>
                    );
                  }),
                ])
              : options.map((option, i) => (
                  <MenuItem key={i} value={option.value}>
                    {option.key}
                  </MenuItem>
                ))}
          </Select>
          {error?.message && 
            <FormHelperText>{error?.message}</FormHelperText>
          }
          </div>
          )
        }
        }
      />
    </FormControl>
    </div>
  );
}
