import { Tabs, Tab, Box } from "@mui/material";
import Add from "@mui/icons-material/Add";
import { ChangeEvent, FC, useState } from "react";

import ResultsTab from "./ResultsTab";

type Table = {
  name: string;
  id: number;
};

const Results: FC = () => {
  const [tab, setTab] = useState(0);
  const [tables, setTables] = useState<Table[]>([{ name: "Table 1", id: 0 }]);

  const handleTabChange = async (event: ChangeEvent<{}>, newValue: number) => {
    if (tables && newValue === tables?.length) {
      const existingNames = tables?.map((t) => t.name);
      let newTableId = newValue;
      let newTableName = `Table ${newValue + 1}`;
      while (existingNames?.includes(newTableName)) {
        newTableId++;
        newTableName = `Group ${newTableId + 1}`;
      }
      setTables([...tables, { name: newTableName, id: newTableId }]);
    }
    setTab(newValue);
  };

  function a11yProps(index: number) {
    return {
      id: `table-tab-${index}`,
      "aria-controls": `table-tabpanel-${index}`,
    };
  }

  return (
    <>
      <Tabs value={tab} onChange={handleTabChange}>
        {tables?.map((table, index) => {
          return (
            <Tab key={table.id} label={table.name} {...a11yProps(index)} />
          );
        })}
        <Tab
          label="New Table"
          {...a11yProps((tables.length || 0) + 1)}
          icon={<Add sx={{ fontSize: 16 }} />}
          iconPosition="start"
          sx={{ minHeight: 20 }}
        />
      </Tabs>
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
