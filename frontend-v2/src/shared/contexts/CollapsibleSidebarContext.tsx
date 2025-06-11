import { createContext, ReactNode, useContext, useState } from "react";

const CollapsibleSidebarContext = createContext({
  onCollapse: () => {
    return;
  },
  onExpand: () => {
    return;
  },
  setHasSimulationsExpandedChanged: (_isChanged: boolean) => {},
  isExpanded: true,
  animationClasses: "",
  simulationAnimationClasses: "",
});

export const CollapsibleSidebarProvider = ({
  children,
  expanded = true,
}: {
  children: ReactNode;
  expanded?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [hasExpandedChanged, setHasExpandedChanged] = useState(false);
  const [hasSimulationsExpandedChanged, setHasSimulationsExpandedChanged] =
    useState(false);

  const eventCollapse = new Event("eventCollapse");
  const eventExpand = new Event("eventExpand");

  const onCollapse = () => {
    setHasExpandedChanged(true);
    dispatchEvent(eventCollapse);
    setHasSimulationsExpandedChanged(true);
    setIsExpanded(false);
  };

  const onExpand = () => {
    setHasExpandedChanged(true);
    dispatchEvent(eventExpand);
    setHasSimulationsExpandedChanged(true);
    setIsExpanded(true);
  };

  const getAnimationClasses = () => {
    if (!hasExpandedChanged) return "";
    return isExpanded ? "on-expand" : "on-collapse";
  };

  const animationClasses = getAnimationClasses();

  const getSimulationsAnimationClasses = () => {
    if (!hasExpandedChanged || !hasSimulationsExpandedChanged) return "";
    return isExpanded ? "on-expand" : "on-collapse";
  };

  const simulationAnimationClasses = getSimulationsAnimationClasses();

  return (
    <CollapsibleSidebarContext.Provider
      value={{
        onCollapse,
        onExpand,
        setHasSimulationsExpandedChanged,
        isExpanded,
        animationClasses,
        simulationAnimationClasses,
      }}
    >
      {children}
    </CollapsibleSidebarContext.Provider>
  );
};

export const useCollapsibleSidebar = () =>
  useContext(CollapsibleSidebarContext);
