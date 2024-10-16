import { FC, ReactNode } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { PageName } from "./mainSlice";
import ProjectTable from "../projects/Projects";
import Drug from "../drug/Drug";
import Model from "../model/Model";
import Simulations from "../simulation/Simulations";
import Protocols from "../trial/Protocols";
import { Box } from "@mui/material";
import Help from "../help/Help";
import Data from "../data/Data";

interface TabPanelProps {
  children?: ReactNode;
  index: PageName;
  value: PageName;
  error?: ReactNode;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      <Box sx={{ p: 3, zIndex: value === index ? 1000 : 1, paddingBottom: value === PageName.DATA ? 0 : '24px' }}>{children}</Box>
    </div>
  );
}

const MainContent: FC = () => {
  const page = useSelector((state: RootState) => state.main.selectedPage);
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;

  return (
    <div>
      <TabPanel value={page} index={PageName.PROJECTS}>
        <ProjectTable />
      </TabPanel>
      <TabPanel value={page} index={PageName.DRUG}>
        <Drug key={projectIdOrZero} />
      </TabPanel>
      <TabPanel value={page} index={PageName.MODEL}>
        <Model key={projectIdOrZero} />
      </TabPanel>
      <TabPanel value={page} index={PageName.DATA}>
        <Data key={projectIdOrZero} />
      </TabPanel>
      <TabPanel value={page} index={PageName.TRIAL_DESIGN}>
        <Protocols key={projectIdOrZero} />
      </TabPanel>
      <TabPanel value={page} index={PageName.SIMULATIONS}>
        <Simulations key={projectIdOrZero} />
      </TabPanel>
      <TabPanel value={page} index={PageName.HELP}>
        <Help />
      </TabPanel>
    </div>
  );
};

export default MainContent;
