import { createContext, ReactNode, useContext, useState } from "react";

type ProjectDescriptionContextType = {
  isDescriptionModalOpen: boolean;
  descriptionProjectId: number | null;
  onOpenDescriptionModal: (id: number | null) => void;
  onCloseDescriptionModal: () => void;
};

const ProjectDescriptionContext = createContext<ProjectDescriptionContextType>({
  isDescriptionModalOpen: false,
  descriptionProjectId: null,
  onOpenDescriptionModal: (_id: number | null) => {
    return;
  },
  onCloseDescriptionModal: () => {
    return;
  },
});

export const ProjectDescriptionProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [descriptionProjectId, setProjectId] = useState<number | null>(null);
  const onOpenDescriptionModal = (id: number | null) => {
    setIsDescriptionModalOpen(true);
    setProjectId(id);
  };

  const onCloseDescriptionModal = () => {
    setIsDescriptionModalOpen(false);
    setProjectId(null);
  };

  return (
    <ProjectDescriptionContext.Provider
      value={{
        isDescriptionModalOpen,
        descriptionProjectId,
        onOpenDescriptionModal,
        onCloseDescriptionModal,
      }}
    >
      {children}
    </ProjectDescriptionContext.Provider>
  );
};

export const useProjectDescription = () =>
  useContext(ProjectDescriptionContext);
