import { DynamicTabs, TabPanel } from "../../components/DynamicTabs";
import LoadDataTab from "./LoadDataTab";

const Data: React.FC = () => {
  return (
    <DynamicTabs tabNames={["Load Data", "Stratification", "Visualisation"]}>
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
