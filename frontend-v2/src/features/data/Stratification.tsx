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
import { getProtocols, getSubjectDoses, IProtocol } from "./protocolUtils";
import {
  Group,
  groupsFromCatCovariate,
  validateGroupMembers,
} from "./dataValidation";

function validateGroupProtocols(groups: Group[], protocols: IProtocol[]) {
  const groupedProtocols: string[][] = [];
  groups.forEach((group) => {
    let groupProtocols: string[] = [];
    group.subjects.forEach((subject) => {
      const subjectProtocols = protocols
        .filter((protocol) => protocol.subjects.includes(subject))
        .map((protocol) => protocol.label);
      groupProtocols = [...groupProtocols, ...subjectProtocols];
    });
    groupedProtocols.push([...new Set(groupProtocols)]);
  });
  return groupedProtocols.every((protocols) => protocols.length <= 1);
}

/**
 * Generate a unique administration ID for each group.
 * @param data
 * @returns data with administration ID column.
 */
function generateAdministrationIds(data: { [key: string]: string }[]) {
  const newData = data.map((row) => ({ ...row }));
  const uniqueGroupIds = [...new Set(data.map((row) => row["Group ID"]))];
  newData.forEach((row) => {
    const administrationId = uniqueGroupIds.indexOf(row["Group ID"]) + 1;
    row["Administration ID"] = `${administrationId}`;
  });
  return newData;
}

/**
 * Assign a group ID to each row based on a categorical covariate column.
 * @param data
 * @param columnName
 * @returns data with group ID and administration ID columns.
 */
function groupDataRows(data: { [key: string]: string }[], columnName: string) {
  const newData = data.map((row) => ({ ...row }));
  newData.forEach((row) => {
    row["Group ID"] = row[columnName] || "1";
  });
  return newData;
}

interface IStratification {
  state: StepperState;
  firstTime: boolean;
}

const CAT_COVARIATE_COLUMNS = ["Cat Covariate", "Administration Name", "ID"];

const Stratification: FC<IStratification> = ({ state }: IStratification) => {
  const subjectDoses = getSubjectDoses(state);
  const protocols = getProtocols(subjectDoses);

  const catCovariates = state.fields.filter((field) =>
    CAT_COVARIATE_COLUMNS.includes(state.normalisedFields.get(field) || ""),
  );
  const uniqueCovariateValues = catCovariates.map((field) => {
    const values = state.data.map((row) => row[field]);
    return [...new Set(values)];
  });
  const administrationIdField = state.fields.find(
    (field) => state.normalisedFields.get(field) === "Administration ID",
  );

  const [firstRow] = state.data;
  const [tab, setTab] = useState(0);
  const { groupColumn, setGroupColumn } = state;

  const groups = groupsFromCatCovariate(state, groupColumn);
  const isValidGrouping = validateGroupMembers(groups);
  const groupErrorMessage =
    "Invalid group subjects. Each subject ID can only belong to a single cohort.";
  if (!isValidGrouping && !state.errors.includes(groupErrorMessage)) {
    const newErrors = [...state.errors, groupErrorMessage];
    state.setErrors(newErrors);
  }

  if (isValidGrouping && state.errors.includes(groupErrorMessage)) {
    const newErrors = state.errors.filter(
      (error) => error !== groupErrorMessage,
    );
    state.setErrors(newErrors);
  }

  const isValidDosing = validateGroupProtocols(groups, protocols);
  const doseErrorMessage =
    "Doses within a group are inconsistent. Please choose another grouping or ignore administration columns and enter the dosing information in Trial Design.";

  if (isValidDosing && state.errors.includes(doseErrorMessage)) {
    const newErrors = state.errors.filter(
      (error) => error !== doseErrorMessage,
    );
    state.setErrors(newErrors);
  }
  if (!isValidDosing && !state.errors.includes(doseErrorMessage)) {
    const newErrors = [...state.errors, doseErrorMessage];
    state.setErrors(newErrors);
  }

  if (!firstRow["Group ID"]) {
    let newData = groupDataRows(state.data, groupColumn);
    if (!administrationIdField) {
      newData = generateAdministrationIds(newData);
    }
    state.setData(newData);
    state.setNormalisedFields(
      new Map([...state.normalisedFields.entries(), ["Group ID", "Group ID"]]),
    );
  }

  const handleTabChange = (event: ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
  };

  const handleGroupChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newGroup = event.target.value;
    let newData = groupDataRows(state.data, newGroup);
    if (!administrationIdField) {
      newData = generateAdministrationIds(newData);
    }
    setGroupColumn(newGroup);
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
                const isPrimary = groupColumn === field;
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
                        onChange={handleGroupChange}
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
