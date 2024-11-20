import { createContext, ReactNode, useContext, useState } from 'react';


const CollapsibleSidebarContext = createContext({
  onCollapse: () => { return },
  onExpand: () => { return },
  isExpanded: true,
  animationClasses: ''
});

export const CollapsibleSidebarProvider = ({ children }: { children: ReactNode }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [hasExpandedChanged, setHasExpandedChanged] = useState(false);
    const onCollapse = () => {
      setHasExpandedChanged(true);
      setIsExpanded(false);
    };
  
    const onExpand = () => {
      setHasExpandedChanged(true);
      setIsExpanded(true);
    };
  
  
    const getAnimationClasses = () => {
      if (!hasExpandedChanged) return '';
      return isExpanded ? 'on-expand' : 'on-collapse';
    }
  
    const animationClasses = getAnimationClasses();

  return (
    <CollapsibleSidebarContext.Provider
      value={{
        onCollapse,
        onExpand,
        isExpanded,
        animationClasses
      }}
    >
      {children}
    </CollapsibleSidebarContext.Provider>
  );
};

export const useCollapsibleSidebar = () => useContext(CollapsibleSidebarContext);
