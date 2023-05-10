import React, { PropsWithChildren, useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

interface DynamicTabsProps {
  tabNames: string[];
}

export const DynamicTabs: React.FC<PropsWithChildren<DynamicTabsProps>> = ({ tabNames, children }) => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleChange} aria-label="basic tabs example">
            {tabNames.map((name, index) => (
              <Tab key={index} label={name} />
            ))}
          </Tabs>
        </Box>
        {React.Children.map(children, (child, index) => {
          return React.cloneElement(child as React.ReactElement<any>, { index });
        })}
      </Box>
  );
};
