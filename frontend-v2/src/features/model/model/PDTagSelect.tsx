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

import { ProjectFormData } from "../Model";
import { ProjectRead, useTagListQuery } from "../../../app/backendApi";

type PDTagSelectProps = {
  control: Control<ProjectFormData>;
  project: ProjectRead;
};

const pdTagList = ["direct", "indirect", "TGI", "DDI"];
const modelTypesLabel = "Filter by Model Type";

export const PDTagSelect: FC<PDTagSelectProps> = ({ control, project }) => {
  const { data: tagsData, isLoading } = useTagListQuery();
  const pdTags = project?.pd_tags || [];
  if (isLoading) {
    return null;
  }
  const pdTagOptions = tagsData
    ?.filter((tag) => {
      return pdTagList.includes(tag.name);
    })
    .map((tag) => {
      return { value: tag.id, label: tag.name };
    });

  return (
    <Controller
      name="pd_tags"
      control={control}
      render={({ field: { onChange } }) => (
        <FormControl sx={{ width: "calc(100% - 3rem)" }} size="small">
          <InputLabel id="tags-label">{modelTypesLabel}</InputLabel>
          <Select
            size="small"
            labelId="tags-label"
            id="tags"
            multiple
            value={pdTags}
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
                  const label = pdTagOptions?.find(
                    (tag) => tag.value === value,
                  )?.label;
                  return <Chip key={value} label={label} />;
                })}
              </Box>
            )}
          >
            {pdTagOptions?.map((tag) => (
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
