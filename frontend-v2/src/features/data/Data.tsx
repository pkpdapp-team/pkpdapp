import { DynamicTabs, TabPanel } from "../../components/DynamicTabs";
import LoadDataTab from "./LoadDataTab";
import { SubPageName } from "../main/mainSlice";

const Data: React.FC = () => {
  const tabKeys = [
    SubPageName.LOAD_DATA,
    SubPageName.STRATIFICATION,
    SubPageName.VISUALISATION
  ];
  return (
    <DynamicTabs tabNames={tabKeys}>
      <TabPanel>
        <LoadDataTab  />
      </TabPanel>
      <TabPanel>
        <LoadDataTab  />
      </TabPanel>
      <TabPanel>
        <LoadDataTab  />
      </TabPanel>
    </DynamicTabs>
  );
}

export default Data;
