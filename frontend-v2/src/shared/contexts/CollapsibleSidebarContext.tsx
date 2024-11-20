import { createContext, ReactNode, useContext, useState } from "react";

const CollapsibleSidebarContext = createContext({
  onCollapse: () => {
    return;
  },
  onExpand: () => {
    return;
  },
  setHasSimulationsExpandedChanged: (isChanged: boolean) => { return; },
  isExpanded: true,
  animationClasses: "",
  simulationAnimationClasses: "",
});

export const CollapsibleSidebarProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasExpandedChanged, setHasExpandedChanged] = useState(false);
  const [hasSimulationsExpandedChanged, setHasSimulationsExpandedChanged] =
    useState(false);
  const onCollapse = () => {
    setHasExpandedChanged(true);
    setHasSimulationsExpandedChanged(true);
    setIsExpanded(false);
  };

  const onExpand = () => {
    setHasExpandedChanged(true);
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
