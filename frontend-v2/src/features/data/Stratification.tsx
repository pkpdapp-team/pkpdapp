import { ChangeEvent, FC, useState } from "react";
import {
  Alert,
  Box,
  Radio,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tabs,
  Tab,
  Typography,
} from "@mui/material";
import { StepperState } from "./LoadDataStepper";
import ProtocolDataGrid from "./ProtocolDataGrid";

type Group = {
  id: string;
  name: string;
  subjects: string[];
};

function validateGroupMembers(groups: Group[]) {
  const subjectMemberships = {} as Record<string, string[]>;
  groups.forEach((group) => {
    group.subjects.forEach((subject) => {
      const subjectGroups = subjectMemberships[subject]
        ? [...subjectMemberships[subject], group.id]
        : [group.id];
      subjectMemberships[subject] = subjectGroups;
    });
  });
  return Object.values(subjectMemberships).every(
    (groups) => groups.length === 1,
  );
}

interface IStratification {
  state: StepperState;
  firstTime: boolean;
}

const Stratification: FC<IStratification> = ({ state }: IStratification) => {
  const idField = state.fields.find(
    (field) => state.normalisedFields.get(field) === "ID",
  );
  const catCovariates = state.fields.filter(
    (field) => state.normalisedFields.get(field) === "Cat Covariate",
  );
  const uniqueCovariateValues = catCovariates.map((field) => {
    const values = state.data.map((row) => row[field]);
    return [...new Set(values)];
  });

  const [firstRow] = state.data;
  const [tab, setTab] = useState(0);
  const { primaryCohort, setPrimaryCohort } = state;

  const primaryCohortIndex = catCovariates.indexOf(primaryCohort);
  const groupColumnValues = uniqueCovariateValues[primaryCohortIndex] || [];
  const groups = groupColumnValues.map((value, index) => {
    const subjects = state.data
      .filter((row) => row[primaryCohort] === value)
      .map((row) => (idField ? row[idField] : ""));
    return {
      id: value,
      name: `Group ${index + 1}`,
      subjects: [...new Set(subjects)],
    };
  });
  const isValidGrouping = validateGroupMembers(groups);
  if (!isValidGrouping && state.errors.length === 0) {
    state.setErrors([
      "Invalid group subjects. Each subject ID can only belong to a single cohort.",
    ]);
  }
  if (isValidGrouping && state.errors.length > 0) {
    state.setErrors([]);
  }

  if (!firstRow["Group ID"]) {
    const newData = [...state.data];
    newData.forEach((row) => {
      row["Group ID"] = row[primaryCohort] || "1";
    });
    state.setData(newData);
    state.setNormalisedFields(
      new Map([...state.normalisedFields.entries(), ["Group ID", "Group ID"]]),
    );
  }

  const handleTabChange = (event: ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
  };

  const handlePrimaryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPrimaryCohort(event.target.value);
    const newData = [...state.data];
    newData.forEach((row) => {
      row["Group ID"] = row[event.target.value];
    });
    state.setData(newData);
  };

  function a11yProps(index: number) {
    return {
      id: `protocol-tab-${index}`,
      "aria-controls": `protocol-tabpanel`,
    };
  }

  return (
    <>
      <Alert severity="info">
        Stratify your observations into groups based on the covariates you have
        provided.
      </Alert>
      <Stack marginTop={2} spacing={2}>
        {!!catCovariates.length && (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography>Covariate</Typography>
                </TableCell>
                <TableCell>
                  <Typography>Values</Typography>
                </TableCell>
                <TableCell id="heading-primary">
                  <Typography>Use as Group ID?</Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {catCovariates.map((field, index) => {
                const primaryLabel = `heading-primary field-${field}`;
                const isPrimary = primaryCohort === field;
                return (
                  <TableRow key={field}>
                    <TableCell id={`field-${field}`}>{field}</TableCell>
                    <TableCell>
                      {uniqueCovariateValues[index].join(",")}
                    </TableCell>
                    <TableCell>
                      <Radio
                        name="primary"
                        value={field}
                        checked={isPrimary}
                        onChange={handlePrimaryChange}
                        inputProps={{ "aria-labelledby": primaryLabel }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <Tabs value={tab} onChange={handleTabChange}>
          {groups.map((group, index) => (
            <Tab key={group.name} label={group.name} {...a11yProps(index)} />
          ))}
        </Tabs>
        <Box role="tabpanel" id="protocol-tabpanel">
          {groups[tab] ? (
            <Box
              component="div"
              sx={{ maxHeight: "30vh", overflow: "auto", overflowX: "auto" }}
            >
              <ProtocolDataGrid group={groups[tab]} state={state} />
            </Box>
          ) : (
            <Typography>This dataset has no subject group column.</Typography>
          )}
        </Box>
      </Stack>
    </>
  );
};

export default Stratification;
