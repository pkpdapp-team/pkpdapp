import { Tabs, Tab, Box, Button, IconButton } from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { SyntheticEvent, FC, useState } from "react";
import ResultsTab from "./ResultsTab";
import { TableHeader } from "../../components/TableHeader";
import { useResults } from "./useResults";
import { ResultsTableRead } from "../../app/backendApi";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

/**
 * Display results for the combined model. Results can be displayed by:
 * - secondary PK parameter.
 * - model variable.
 * - time interval.
 * - subject group.
 *
 * Create multiple results tables and save them to the current project.
 */
const Results: FC = () => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const [tab, setTab] = useState(0);
  const { results, createResults, deleteResults } = useResults();

  const getNewTableName = (): string => {
    const existingNames = results?.map((r) => r.name);
    let newId = results?.length || 1;
    let newTableName = `Table ${newId}`;
    while (existingNames?.includes(newTableName)) {
      newId++;
      newTableName = `Table ${newId}`;
    }
    return newTableName;
  };

  const handleTabAdd = async () => {
    const newTableName = getNewTableName();
    const lastTable = results[results.length - 1];
    const newTable: ResultsTableRead = {
      ...lastTable,
      name: newTableName,
      project: projectId,
    };
    newTable.columns ||= "parameters";
    newTable.rows ||= "variables";
    newTable.filters ||= {
      parameterIndex: "columns",
      variableIndex: "rows",
      groupIndex: 0,
      intervalIndex: 0,
    };
    createResults({ resultsTable: newTable });
    setTab(results.length);
  };

  const handleTabChange = async (event: SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  const handleTabRemove = async (table: ResultsTableRead) => {
    if (window.confirm("Are you sure you want to delete the current Table?")) {
      const removedIndex = results?.map(({ id }) => id).indexOf(table.id) || -1;
      deleteResults({ id: table.id });

      if (removedIndex === tab) {
        setTab(removedIndex - 1);
      }
      if (tab > removedIndex) {
        setTab(tab - 1);
      }
    }
  };

  function a11yProps(index: number) {
    return {
      id: `table-tab-${index}`,
      "aria-controls": `table-tabpanel-${index}`,
    };
  }

  return (
    <>
      <TableHeader label="Results" key="results-header" />
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          borderBottom: "1px solid #c2bab5",
        }}
      >
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons
          allowScrollButtonsMobile
          selectionFollowsFocus
          sx={{ width: "fit-content" }}
        >
          {results?.map((table, index) => {
            return (
              <Tab
                key={table.id}
                label={table.name}
                {...a11yProps(index)}
                sx={{ maxHeight: "48px", minHeight: 0 }}
                icon={
                  index === 0 ? undefined : (
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTabRemove(table);
                      }}
                    >
                      <RemoveCircleOutlineIcon fontSize="small" />
                    </IconButton>
                  )
                }
                iconPosition="end"
              />
            );
          })}
        </Tabs>
        <Box
          sx={{ display: "flex", width: "fit-content", alignItems: "center" }}
        >
          <Button
            variant="contained"
            sx={{
              marginRight: "1rem",
              width: "fit-content",
              textWrap: "nowrap",
              height: "2rem",
            }}
            onClick={handleTabAdd}
          >
            Add Table
          </Button>
        </Box>
      </Box>

      {results.map((table, index) => {
        return (
          <Box
            key={table.id}
            role="tabpanel"
            id={`table-tabpanel-${index}`}
            hidden={tab !== index}
            sx={{ p: 3 }}
          >
            <ResultsTab table={table} />
          </Box>
        );
      })}
    </>
  );
};

export default Results;
