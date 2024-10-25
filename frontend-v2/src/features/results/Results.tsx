import { SyntheticEvent, FC, useState } from "react";

import { Box, Tab, Tabs } from "@mui/material";
import useSubjectGroups from "../../hooks/useSubjectGroups";
import VariableTabs from "./VariableTabs";

const Results: FC = () => {
  const [tab, setTab] = useState(0);
  const { groups = [] } = useSubjectGroups();

  function handleTabChange(
    event: SyntheticEvent<Element, Event>,
    newValue: number,
  ) {
    setTab(newValue);
  }

  try {
    return (
      <>
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab
            label={"Project"}
            id="group-tab-0"
            aria-controls="group-tabpanel"
          />
          {groups?.map((group, index) => {
            return (
              <Tab
                key={group.id}
                label={group.name}
                id={`group-tab-${index + 1}`}
                aria-controls="group-tabpanel"
              />
            );
          })}
        </Tabs>
        <Box id="group-tabpanel">
          <VariableTabs index={tab} />
        </Box>
      </>
    );
  } catch (e: any) {
    console.error(e);
    return <div>Error {e.message}</div>;
  }
};

export default Results;
