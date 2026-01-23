import {
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Box,
  Chip,
  MenuItem,
} from "@mui/material";
import { FC } from "react";
import { Control, Controller } from "react-hook-form";

import { ProjectFormData } from "../projectFormState";
import { ProjectRead, useTagListQuery } from "../../../app/backendApi";

type PKTagSelectProps = {
  control: Control<ProjectFormData>;
  project: ProjectRead;
};

const pkTagList = [
  "1-compartment",
  "2-compartment",
  "3-compartment",
  "PK",
  "TMDD",
  "QSS",
  "MM",
  "bispecific",
  "constant",
];
const modelTypesLabel = "Filter by Model Type";

export const PKTagSelect: FC<PKTagSelectProps> = ({ control, project }) => {
  const { data: tagsData, isLoading } = useTagListQuery();
  const pkTags = project?.pk_tags || [];
  if (isLoading) {
    return null;
  }
  const tagOptions = tagsData
    ?.filter((tag) => {
      return pkTagList.includes(tag.name);
    })
    .map((tag) => {
      return { value: tag.id, label: tag.name };
    });
  return (
    <Controller
      name="pk_tags"
      control={control}
      render={({ field: { onChange } }) => (
        <FormControl sx={{ width: "calc(100% - 3rem)" }} size="small">
          <InputLabel id="tags-label">{modelTypesLabel}</InputLabel>
          <Select
            size="small"
            labelId="tags-label"
            id="tags"
            multiple
            value={pkTags}
            onChange={onChange}
            input={
              <OutlinedInput
                id="select-multiple-tags"
                label={modelTypesLabel}
              />
            }
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {selected.map((value) => {
                  const label = tagOptions?.find(
                    (tag) => tag.value === value,
                  )?.label;
                  return <Chip key={value} label={label} />;
                })}
              </Box>
            )}
          >
            {tagOptions?.map((tag) => (
              <MenuItem key={tag.value} value={tag.value}>
                {tag.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    />
  );
};
