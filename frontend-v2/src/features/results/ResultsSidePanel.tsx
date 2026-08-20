import { createPortal } from "react-dom";
import { FC } from "react";
import { useSelector } from "react-redux";
import { Box, Typography } from "@mui/material";
import { useCollapsibleSidebar } from "../../shared/contexts/CollapsibleSidebarContext";
import ResultsSecondaryParameters from "./ResultsSecondaryParameters";
import { RootState } from "../../app/store";
import { PageName } from "../main/mainSlice";

const ResultsSidePanel: FC = () => {
  const selectedPage = useSelector(
    (state: RootState) => state.main.selectedPage,
  );
  const portalRoot = document.getElementById("results-portal");
  const { simulationAnimationClasses } = useCollapsibleSidebar();
  if (!portalRoot || selectedPage !== PageName.RESULTS) return null;

  return createPortal(
    <Box
      className={simulationAnimationClasses}
      sx={{
        height: "100%",
        maxHeight: "100%",
        overflowY: "auto",
        padding: "1rem",
        paddingTop: "5rem",
        backgroundColor: "#FBFBFA",
        borderRight: "1px solid #DBD6D1",
      }}
    >
      <Typography variant="h4" sx={{ mb: 2, textAlign: "center" }}>
        Results
      </Typography>
      <ResultsSecondaryParameters />
    </Box>,
    portalRoot,
  );
};

export default ResultsSidePanel;
