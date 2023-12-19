import React, { PropsWithChildren, ReactElement, useState } from "react";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import ErrorIcon from "@mui/icons-material/Error";
import { Tooltip } from "@mui/material";
import { useCustomToast } from "../hooks/useCustomToast";
import { notificationTypes } from "./Notification/notificationTypes";

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
  tabErrors?: { [key: string]: string };
  isOtherSpeciesSelected?: boolean;
}

interface TabPanelProps {
  index?: number;
}

export const TabPanel: React.FC<PropsWithChildren<TabPanelProps>> = ({
  index,
  children,
}) => {
  const { currentTab } = React.useContext(TabContext);

  return <Box hidden={currentTab !== index}>{children}</Box>;
};

export const DynamicTabs: React.FC<PropsWithChildren<DynamicTabsProps>> = ({
  tabNames,
  tabErrors,
  isOtherSpeciesSelected,
  children,
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const toast = useCustomToast();

  const errors: { [key: string]: ReactElement<any, string> } = {};
  for (const key in tabErrors) {
    errors[key] = (
      <Tooltip title={tabErrors[key]}>
        <ErrorIcon color="error" />
      </Tooltip>
    );
  }

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    const previousTabs = tabNames.filter((__, index) => index < newValue);
    const previousErrors = previousTabs.map(tabName => tabErrors && tabErrors[tabName]).filter(val => val !== undefined);
    
    if (tabErrors && previousErrors?.length && newValue > currentTab) {
      toast({
        type: notificationTypes.ERROR,
        text: previousErrors.join('; ') || '',
        autoClose: 3500
      })
    } else if (tabNames[newValue] === 'Parameters' && isOtherSpeciesSelected) {
      toast({
        type: notificationTypes.INFORMATION,
        text: "Currently selected species is 'Other'. Please ensure all parameters are correct",
        autoClose: 3500
      })
      setCurrentTab(newValue);
    } else {
      setCurrentTab(newValue);
    }
  };

  return (
    <TabContext.Provider value={{ currentTab, setCurrentTab }}>
      <Box sx={{ width: "100%" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", marginBottom: 5 }}>
          <Tabs
            value={currentTab}
            onChange={handleChange}
            aria-label="basic tabs example"
          >
            {tabNames.map((name, index) => (
              <Tab
                key={index}
                label={name}
                icon={name in errors ? errors[name] : undefined}
                iconPosition="end"
              />
            ))}
          </Tabs>
        </Box>
        <Box sx={{ margin: 2 }}>
          {React.Children.map(children, (child, index) => {
            return React.cloneElement(child as React.ReactElement<any>, {
              index,
            });
          })}
        </Box>
      </Box>
    </TabContext.Provider>
  );
};
