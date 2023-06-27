import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { PageName } from './mainSlice';
import ProjectTable from '../projects/Projects';
import Drug from '../drug/Drug';
import Model from '../model/Model';
import Simulations from '../simulation/Simulations';
import Protocols from '../trial/Protocols';
import { Box, LinearProgress } from '@mui/material';


interface TabPanelProps {
  children?: React.ReactNode;
  index: PageName;
  value: PageName;
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
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const MainContent: React.FC = () => {
  const page = useSelector((state: RootState) => state.main.selectedPage);
  return (

    <div>
      <TabPanel value={page} index={PageName.PROJECTS}>
        <ProjectTable />
      </TabPanel>
      <TabPanel value={page} index={PageName.DRUG}>
        <Drug />
      </TabPanel >
      <TabPanel value={page} index={PageName.MODEL}>
        <Model />
      </TabPanel>
      <TabPanel value={page} index={PageName.TRIAL_DESIGN}>
        <Protocols/>
      </TabPanel>
      <TabPanel value={page} index={PageName.SIMULATIONS}>
        <Simulations />
      </TabPanel>
    </div>
  );
};

export default MainContent;
