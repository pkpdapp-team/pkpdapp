import { Tabs, Tab, Box, Button, IconButton } from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { ChangeEvent, FC, useEffect, useState } from "react";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ResultsTab from "./ResultsTab";
import { TableHeader } from "../../components/TableHeader";

type Table = {
  name: string;
  id: number;
};

const Results: FC = () => {
  const [tab, setTab] = useState(0);
  const [tables, setTables] = useState<Table[]>([{ name: "Table 1", id: 0 }]);

  const getHighestTableId = (): number =>
    tables
      ?.map(({ id }) => id)
      .sort((id1: number, id2: number) => (id1 > id2 ? 1 : 0))
      .pop() || 0;

  const handleTabAdd = async () => {
    const newTableId = getHighestTableId() + 1;
    const newTableName = `Table ${getHighestTableId() + 2}`;
    const newTables = [...tables, { name: newTableName, id: newTableId }];
    setTables(newTables);
    setTab(newTables?.length - 1);
  };

  const handleTabChange = async (event: ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
  };

  const handleTabRemove = async (table: Table) => {
    if (window.confirm("Are you sure you want to delete the current Table?")) {
      const removedIndex = tables.map(({ id }) => id).indexOf(table.id);
      setTables(tables.filter(({ id }) => id !== table.id));

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
          display: "flex ",
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
          sx={{ width: "fit-content" }}
        >
          {tables?.map((table, index) => {
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
          <Button
            variant="outlined"
            sx={{ width: "fit-content", textWrap: "nowrap", height: "2rem" }}
            endIcon={<ArrowDropDownIcon />}
          >
            Export
          </Button>
        </Box>
      </Box>

      {tables.map((table, index) => {
        return (
          <Box
            key={table.id}
            role="tabpanel"
            id={`table-tabpanel-${index}`}
            hidden={tab !== index}
            sx={{ p: 3 }}
          >
            <ResultsTab />
          </Box>
        );
      })}
    </>
  );
};

export default Results;
