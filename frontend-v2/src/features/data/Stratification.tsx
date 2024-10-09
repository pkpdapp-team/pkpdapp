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
  TableContainer,
  Tooltip,
} from "@mui/material";
import { StepperState } from "./LoadDataStepper";
import ProtocolDataGrid from "./ProtocolDataGrid";
import { getProtocols, getSubjectDoses, IProtocol } from "./protocolUtils";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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

  const splitNotificationsCount = (notificationCount: number) => ({
    first: Math.floor(notificationCount / 2),
    second: Math.ceil(notificationCount / 2),
  });

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h5">Stratification</Typography>
      <Typography variant="body2" style={{ marginTop: ".5rem" }}>
        Stratify your observations into groups based on the covariates you have
        provided.
      </Typography>
      <Stack marginTop={2} spacing={2}>
        {!!catCovariates.length && (
          <TableContainer
            sx={{
              maxHeight: notificationsInfo?.isOpen
                ? `calc(10.1rem - ${splitNotificationsCount(notificationsInfo?.count).first * 3}rem)`
                : "10.1rem",
              transition: "all .35s ease-in",
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell id="heading-primary" width="100px">
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
                        {uniqueCovariateValues[index].join(",")}
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
        <Typography variant="h5">Groups</Typography>
        <Typography variant="body2" style={{ marginTop: ".5rem" }}>
          Please review the group assignment based on your stratification above.
          If you want to move individuals between groups or assign them to a new
          group, select them first and the follow the instructions.
        </Typography>
        <Tabs value={tab} onChange={handleTabChange}>
          {groups.map((group, index) => (
            <Tab key={group.name} label={group.name} {...a11yProps(index)} />
          ))}
        </Tabs>
        <Box role="tabpanel" id="protocol-tabpanel">
          {groups[tab] ? (
            <Box
              component="div"
              sx={{
                height: notificationsInfo?.isOpen
                  ? `calc(35vh - ${splitNotificationsCount(notificationsInfo?.count).second * 3}rem)`
                  : "35vh",
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
