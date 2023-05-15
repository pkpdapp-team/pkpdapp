import React, { PropsWithChildren, useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

interface TabContextProps {
  currentTab: number;
  setCurrentTab: React.Dispatch<React.SetStateAction<number>>;
}

export const TabContext = React.createContext<TabContextProps>({
  currentTab: 0,
  setCurrentTab: () => {},
});

interface DynamicTabsProps {
  tabNames: string[];
}

interface TabPanelProps {
  index?: number;
}

export const TabPanel: React.FC<PropsWithChildren<TabPanelProps>> = ({ index, children }) => {
  const { currentTab } = React.useContext(TabContext);

  return <Box hidden={currentTab !== index}>{children}</Box>;
};

export const DynamicTabs: React.FC<PropsWithChildren<DynamicTabsProps>> = ({ tabNames, children }) => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <TabContext.Provider value={{ currentTab, setCurrentTab }}>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', marginBottom: 5 }}>
          <Tabs value={currentTab} onChange={handleChange} aria-label="basic tabs example">
            {tabNames.map((name, index) => (
              <Tab key={index} label={name} />
            ))}
          </Tabs>
        </Box>
        <Box sx={{ margin: 2 }}>
          {React.Children.map(children, (child, index) => {
            return React.cloneElement(child as React.ReactElement<any>, { index });
          })}
        </Box>
      </Box>
    </TabContext.Provider>
  );
};
