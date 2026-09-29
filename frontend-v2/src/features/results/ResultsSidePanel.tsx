import { createPortal } from "react-dom";
import { FC } from "react";
import { useSelector } from "react-redux";
import { Box, Button, Typography } from "@mui/material";
import { useCollapsibleSidebar } from "../../shared/contexts/CollapsibleSidebarContext";
import ResultsSecondaryParameters from "./ResultsSecondaryParameters";
import { RootState } from "../../app/store";
import { PageName } from "../main/mainSlice";

type ResultsSidePanelProps = {
  onAddTable: () => void | Promise<void>;
};

const ResultsSidePanel: FC<ResultsSidePanelProps> = ({ onAddTable }) => {
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
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        maxHeight: "100%",
        paddingBottom: "1rem",
        backgroundColor: "#FBFBFA",
        borderRight: "1px solid #DBD6D1",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          padding: "1rem 0 1rem 1rem",
        }}
      >
        <Box
          sx={{
            paddingTop: "5rem",
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
            width: "100%",
          }}
        >
          <Typography variant="h4">Results</Typography>
          <Button
            variant="contained"
            onClick={onAddTable}
            sx={{
              width: "12rem",
              marginTop: ".5rem",
              marginBottom: "1rem",
              alignSelf: "center",
              textTransform: "uppercase",
            }}
          >
            Add new table
          </Button>
          <ResultsSecondaryParameters />
        </Box>
      </Box>
    </Box>,
    portalRoot,
  );
};

export default ResultsSidePanel;
