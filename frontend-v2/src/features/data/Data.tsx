import { FC, SyntheticEvent, useState } from "react";
import { useSelector } from "react-redux";
import {
  useProjectRetrieveQuery,
  useUnitListQuery,
} from "../../app/backendApi";
import { RootState } from "../../app/store";
import { Box, Button, Grid, Tab, Tabs, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import LoadDataStepper from "./LoadDataStepper";
import useDataset from "../../hooks/useDataset";
import generateCSV from "./generateCSV";
import { getTableHeight } from "../../shared/calculateTableHeights";

const BOTH_TABLES_VISIBLE_BREAKPOINTS = [
  {
    minHeight: 1100,
    tableHeight: "78vh",
  },
  {
    minHeight: 1000,
    tableHeight: "70vh",
  },
  {
    minHeight: 900,
    tableHeight: "73vh",
  },
  {
    minHeight: 800,
    tableHeight: "70vh",
  },
  {
    minHeight: 700,
    tableHeight: "65vh",
  },
  {
    minHeight: 600,
    tableHeight: "59vh",
  },
  {
    minHeight: 500,
    tableHeight: "55vh",
  },
];

export const DATA_HEIGHT =
  "72vh; @media (max-height: 1000px) { height: 65vh }; @media (max-height: 900px) { height: 60vh }; @media (max-height: 800px) { height: 58vh }; @media (max-height: 700px) { height: 44vh }; @media (max-height: 600px) { height: 42vh };";

function displayUnitSymbol(symbol: string | undefined) {
  return symbol === "" ? "dimensionless" : symbol;
}

const Data: FC = () => {
  const [tab, setTab] = useState(0);
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project } = useProjectRetrieveQuery(
    { id: projectIdOrZero },
    { skip: !projectId },
  );
  const { data: units } = useUnitListQuery(
    { compoundId: project?.compound || 0 },
    { skip: !project?.compound },
  );
  const { dataset, groups, subjectBiomarkers } = useDataset(projectIdOrZero);
  const csv = generateCSV(dataset, groups, subjectBiomarkers, units, "default");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  function editDataset() {
    if (csv) {
      setIsEditing(true);
      setIsLoading(false);
    }
  }

  function handleNewUpload() {
    if (
      groups.length === 0 ||
      window.confirm("Are you sure you want to delete the current dataset?")
    ) {
      setIsLoading(true);
      setIsEditing(false);
    }
  }

  function onUploadComplete() {
    setIsLoading(false);
    setIsEditing(false);
  }

  function onCancel() {
    if (window.confirm("Any unsaved changes will be lost. Continue?")) {
      setIsLoading(false);
      setIsEditing(false);
    }
  }

  function handleTabChange(event: SyntheticEvent, newValue: number) {
    setTab(newValue);
  }

  function a11yProps(index: number) {
    return {
      id: `group-tab-${index}`,
      "aria-controls": "group-tabpanel",
    };
  }

  function downloadCSV(format: "default" | "nonmem") {
    const csv = generateCSV(dataset, groups, subjectBiomarkers, units, format);
    const blob = new Blob(["\ufeff", csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name} data.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  const group = groups[tab];
  const protocols = group?.protocols || [];
  const dosingRows = protocols
    .flatMap((protocol) => {
      const amountUnit =
        units?.find((unit) => unit.id === protocol.amount_unit)?.symbol || "";
      const timeUnit =
        units?.find((unit) => unit.id === protocol.time_unit)?.symbol || "";
      const qname = protocol.mapped_qname;
      const doseType = protocol.dose_type;
      return protocol.doses
        .map((dose) => ({
          Amount: dose.amount,
          "Amount Unit": amountUnit,
          Time: dose.start_time,
          "Time Unit": timeUnit,
          Duration: dose.duration,
          Route: doseType,
          "Additional Doses": (dose?.repeats || 1) - 1,
          "Interdose Interval": dose.repeat_interval,
          "Amount Variable": qname,
        }))
        .sort((a, b) => a.Time - b.Time);
    })
    .map((row, index) => ({ id: index + 1, ...row }));
  const dosingColumns = dosingRows[0]
    ? Object.keys(dosingRows[0])
        .filter((field) => field !== "id" && field !== "Route")
        .map((field) => ({
          field,
          headerName: field,
          minWidth:
            field === "Amount Variable" ? 150 : field.length > 10 ? 130 : 30,
        }))
    : [];
  const groupId = group?.id_in_dataset || group?.name;
  const observations =
    subjectBiomarkers
      ?.flatMap((biomarkerRows) =>
        biomarkerRows.map((row) => {
          const group = dataset?.groups?.find((group) =>
            group.subjects.includes(row.subjectId),
          );
          const groupId = group?.id_in_dataset || group?.name;
          return {
            "Subject ID": row.subjectDatasetId,
            Time: row.time,
            "Time Unit": row.timeUnit?.symbol,
            Observation: row.value,
            "Observation Unit": displayUnitSymbol(row.unit?.symbol),
            "Observation ID": row.label,
            "Observation Variable": row.qname,
            Group: groupId,
          };
        }),
      )
      .filter((row) => row.Group === groupId)
      .map((row, index) => ({ id: index + 1, ...row })) || [];
  const [firstRow] = observations;
  const columns = firstRow
    ? Object.keys(firstRow)
        .filter((field) => field !== "id")
        .map((field) => ({
          field,
          headerName: field,
          minWidth:
            field === "Observation Variable"
              ? 150
              : field.length > 10
                ? 120
                : 30,
        }))
    : [];

  const noData = !groups.length && !observations.length;

  const pageTitle = dataset?.name !== "New Dataset" ? dataset?.name : "";

  const isBothTablesVisible =
    dosingRows.length !== 0 && observations.length !== 0;

  return isLoading || isEditing || noData ? (
    <LoadDataStepper
      csv={isEditing ? csv : ""}
      onFinish={onUploadComplete}
      onCancel={onCancel}
    />
  ) : (
    <>
      <Grid container spacing={2}>
        <Grid item xs={true}>
          {pageTitle && (
            <Typography variant="h5" component="h1" gutterBottom>
              {pageTitle}
            </Typography>
          )}
        </Grid>
        <Grid
          container
          sx={{ display: "flex", justifyContent: "flex-end" }}
          xs={true}
        >
          <Button
            variant="outlined"
            onClick={handleNewUpload}
            startIcon={<FileUploadIcon />}
            sx={{ margin: ".2rem", maxHeight: "2rem" }}
          >
            New dataset
          </Button>
          <Button
            variant="outlined"
            onClick={editDataset}
            disabled={!csv}
            startIcon={<EditIcon />}
            sx={{ margin: ".2rem", maxHeight: "2rem" }}
          >
            Edit dataset
          </Button>
          <Button
            variant="outlined"
            onClick={() => downloadCSV("default")}
            startIcon={<FileDownloadIcon />}
            sx={{ margin: ".2rem", maxHeight: "2rem" }}
          >
            Download CSV
          </Button>
          <Button
            variant="outlined"
            onClick={() => downloadCSV("nonmem")}
            startIcon={<FileDownloadIcon />}
            sx={{ margin: ".2rem", maxHeight: "2rem" }}
          >
            Download NONMEM
          </Button>
        </Grid>
      </Grid>
      <Tabs value={tab} onChange={handleTabChange}>
        {groups?.map((group, index) => (
          <Tab key={group.id} label={group.name} {...a11yProps(index)} />
        ))}
      </Tabs>
      {isBothTablesVisible ? (
        <Box
          role="tabpanel"
          id={`group-tabpanel`}
          sx={{
            overflow: "auto",
            maxHeight: getTableHeight({
              steps: BOTH_TABLES_VISIBLE_BREAKPOINTS,
            }),
          }}
        >
          <Box padding={1}>
            <Typography variant="h6" component="h2" gutterBottom>
              Protocols
            </Typography>
            <Box>
              <DataGrid rows={dosingRows} columns={dosingColumns} />
            </Box>
          </Box>
          <Box padding={1}>
            <Typography variant="h6" component="h2" gutterBottom>
              Observations
            </Typography>
            <Box>
              <DataGrid rows={observations} columns={columns} />
            </Box>
          </Box>
        </Box>
      ) : (
        <Box role="tabpanel" id={`group-tabpanel`}>
          {dosingRows.length !== 0 && (
            <Box padding={1}>
              <Typography variant="h6" component="h2" gutterBottom>
                Protocols
              </Typography>
              <Box sx={{ width: "100%", marginTop: ".5rem" }}>
                <Box
                  sx={{
                    height: DATA_HEIGHT,
                    overflow: "auto",
                  }}
                >
                  <DataGrid rows={dosingRows} columns={dosingColumns} />
                </Box>
              </Box>
            </Box>
          )}
          {observations.length !== 0 && (
            <Box padding={1}>
              <Typography variant="h6" component="h2" gutterBottom>
                Observations
              </Typography>
              <Box sx={{ width: "100%", marginTop: ".5rem" }}>
                <Box
                  sx={{
                    height: DATA_HEIGHT,
                    overflow: "auto",
                  }}
                >
                  <DataGrid rows={observations} columns={columns} />
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </>
  );
};

export default Data;
