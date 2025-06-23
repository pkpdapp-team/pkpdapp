import {
  Children,
  Dispatch,
  FC,
  PropsWithChildren,
  ReactElement,
  SetStateAction,
  SyntheticEvent,
  cloneElement,
  createContext,
  useContext,
  useState,
} from "react";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import ErrorIcon from "@mui/icons-material/Error";
import { useDispatch } from "react-redux";
import { Tooltip } from "@mui/material";
import { useCustomToast } from "../hooks/useCustomToast";
import { notificationTypes } from "./Notification/notificationTypes";
import { SubPageName, setSubPage } from "../features/main/mainSlice";

interface TabContextProps {
  currentTab: number;
  setCurrentTab: Dispatch<SetStateAction<number>>;
}

export const TabContext = createContext<TabContextProps>({
  currentTab: 0,
  setCurrentTab: () => {},
});

interface DynamicTabsProps {
  tabNames: SubPageName[];
  disabledTabs?: SubPageName[];
  tabErrors?: { [key: string]: string };
  isOtherSpeciesSelected?: boolean;
  tumourModelWithNoKillModel?: boolean;
  marginBottom?: number;
}

interface TabPanelProps {
  index?: number;
}

export const TabPanel: FC<PropsWithChildren<TabPanelProps>> = ({
  index,
  children,
}) => {
  const { currentTab } = useContext(TabContext);

  return <Box hidden={currentTab !== index}>{children}</Box>;
};

export const DynamicTabs: FC<PropsWithChildren<DynamicTabsProps>> = ({
  tabNames,
  disabledTabs,
  tabErrors,
  isOtherSpeciesSelected,
  tumourModelWithNoKillModel,
  marginBottom = 5,
  children,
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const toast = useCustomToast();
  const dispatch = useDispatch();

  const errors: { [key: string]: ReactElement<unknown, string> } = {};
  for (const key in tabErrors) {
    errors[key] = (
      <Tooltip title={tabErrors[key]}>
        <ErrorIcon color="error" titleAccess={tabErrors[key]} />
      </Tooltip>
    );
  }

  const handleChange = (event: SyntheticEvent, newValue: number) => {
    const previousTabs = tabNames.filter((__, index) => index < newValue);
    const previousErrors = previousTabs
      .map((tabName) => tabErrors && tabErrors[tabName])
      .filter((val) => val !== undefined);

    if (tabErrors && previousErrors?.length && newValue > currentTab) {
      toast({
        type: notificationTypes.ERROR,
        text: previousErrors.join("; ") || "",
        autoClose: 3500,
      });
    } else if (tabNames[newValue] === "Parameters" && isOtherSpeciesSelected) {
      toast({
        type: notificationTypes.INFORMATION,
        text: "Currently selected species is 'Other'. Please ensure all parameters are correct",
        autoClose: 3500,
      });
      setCurrentTab(newValue);
      dispatch(setSubPage(tabNames[newValue]));
    } else if (
      tabNames[newValue] === "Map Variables" &&
      tumourModelWithNoKillModel
    ) {
      toast({
        type: notificationTypes.INFORMATION,
        text: "You have selected a tumour growth model without a kill model. Please ensure this is correct",
        autoClose: 3500,
      });
      setCurrentTab(newValue);
      dispatch(setSubPage(tabNames[newValue]));
    } else {
      setCurrentTab(newValue);
      dispatch(setSubPage(tabNames[newValue]));
    }
  };

  return (
    <TabContext.Provider value={{ currentTab, setCurrentTab }}>
      <Box sx={{ width: "100%" }}>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            marginBottom: marginBottom,
          }}
        >
          <Tabs
            value={currentTab}
            onChange={handleChange}
            selectionFollowsFocus
          >
            {tabNames.map((name, index) => (
              <Tab
                key={index}
                label={name}
                icon={name in errors ? errors[name] : undefined}
                iconPosition="end"
                disabled={disabledTabs?.includes(name)}
              />
            ))}
          </Tabs>
        </Box>
        <Box sx={{ margin: 2 }}>
          {Children.map(children, (child, index) => {
            return cloneElement(child as ReactElement<TabPanelProps>, {
              index,
            });
          })}
        </Box>
      </Box>
    </TabContext.Provider>
  );
};
