import { ChangeEvent, FC, SyntheticEvent, useState } from "react";
import {
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
  TableContainer,
} from "@mui/material";
import { StepperState } from "./LoadDataStepper";
import ProtocolDataGrid from "./ProtocolDataGrid";
import { getProtocols, getSubjectDoses, IProtocol } from "./protocolUtils";
import {
  Group,
  groupsFromCatCovariate,
  validateGroupMembers,
} from "./dataValidation";
import { TableHeader } from "../../components/TableHeader";
import {
  calculateTableHeights,
  DOUBLE_TABLE_FIRST_BREAKPOINTS,
  DOUBLE_TABLE_SECOND_BREAKPOINTS,
  getTableHeight,
} from "../../shared/calculateTableHeights";

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
 * Assign a group ID to each row based on a categorical covariate column.
 * @param data
 * @param columnName
 * @returns data with group ID and administration ID columns.
 */
export function groupDataRows(
  data: { [key: string]: string }[],
  columnName: string,
) {
  const newData = data.map((row) => ({ ...row }));
  newData.forEach((row) => {
    row["Group ID"] = row[columnName] || "1";
  });
  return newData;
}

interface IStratification {
  state: StepperState;
  firstTime: boolean;
  notificationsInfo: {
    isOpen: boolean;
    count: number;
  };
}

const CAT_COVARIATE_COLUMNS = ["Cat Covariate", "Administration Name", "ID"];

const Stratification: FC<IStratification> = ({
  state,
  notificationsInfo,
}: IStratification) => {
  const subjectDoses = getSubjectDoses(state);
  const protocols = getProtocols(subjectDoses);

  const catCovariates = state.fields.filter((field) =>
    CAT_COVARIATE_COLUMNS.includes(state.normalisedFields.get(field) || ""),
  );
  const uniqueCovariateValues = catCovariates.map((field) => {
    const values = state.data.map((row) => row[field]);
    return [...new Set(values)];
  });

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
    const newData = groupDataRows(state.data, groupColumn);
    state.setData(newData);
    state.setNormalisedFields(
      new Map([...state.normalisedFields.entries(), ["Group ID", "Group ID"]]),
    );
  }

  const handleTabChange = (
    event: SyntheticEvent<Element, Event>,
    newValue: number,
  ) => {
    setTab(newValue);
  };

  const handleGroupChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newGroup = event.target.value;
    const newData = groupDataRows(state.data, newGroup);
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TableHeader
        label="Stratification"
        tooltip="Stratify your observations into groups based on the covariates you have
        provided."
      />
      <Stack marginTop={2} spacing={2}>
        {!!catCovariates.length && (
          <TableContainer
            sx={{
              maxHeight: calculateTableHeights({
                baseHeight: getTableHeight({
                  steps: DOUBLE_TABLE_FIRST_BREAKPOINTS,
                }),
                isOpen: notificationsInfo.isOpen,
                count: notificationsInfo.count,
                splitMode: "first",
              }),
              transition: "all .35s ease-in",
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell id="heading-primary" width="120px">
                    <Typography>Group ID</Typography>
                  </TableCell>
                  <TableCell width="250px">
                    <Typography>Covariate</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>Values</Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {catCovariates.map((field, index) => {
                  const primaryLabel = `heading-primary field-${field}`;
                  const isPrimary = groupColumn === field;
                  return (
                    <TableRow key={field}>
                      <TableCell sx={{ padding: "0 16px" }}>
                        <Radio
                          name="primary"
                          value={field}
                          checked={isPrimary}
                          onChange={handleGroupChange}
                          inputProps={{ "aria-labelledby": primaryLabel }}
                          sx={{ padding: 0, transform: "scale(0.8)" }}
                        />
                      </TableCell>
                      <TableCell id={`field-${field}`}>{field}</TableCell>
                      <TableCell>
                        {uniqueCovariateValues[index]?.join(",")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
      <Stack sx={{ paddingTop: ".5rem" }}>
        <TableHeader
          label="Groups"
          tooltip="Please review the group assignment based on your stratification above.
          If you want to move individuals between groups or assign them to a new
          group, select them first and then follow the instructions."
        />
        <Tabs value={tab} onChange={handleTabChange} selectionFollowsFocus>
          {groups.map((group, index) => (
            <Tab key={group.name} label={group.name} {...a11yProps(index)} />
          ))}
        </Tabs>
        <Box role="tabpanel" id="protocol-tabpanel">
          {groups[tab] ? (
            <Box
              component="div"
              sx={{
                height: calculateTableHeights({
                  baseHeight: getTableHeight({
                    steps: DOUBLE_TABLE_SECOND_BREAKPOINTS,
                  }),
                  isOpen: notificationsInfo.isOpen,
                  count: notificationsInfo.count,
                  splitMode: "second",
                }),
                overflow: "auto",
                overflowX: "auto",
                transition: "all .35s ease-in",
              }}
            >
              <ProtocolDataGrid group={groups[tab]} state={state} />
            </Box>
          ) : (
            <Typography>This dataset has no subject group column.</Typography>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default Stratification;
