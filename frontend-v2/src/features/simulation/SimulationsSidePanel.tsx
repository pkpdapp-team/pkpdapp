import {
  Box,
  Typography,
  Divider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Collapse,
  Stack,
  Badge,
} from "@mui/material";
import ReactDOM from "react-dom";
import DropdownButton from "../../components/DropdownButton";
import FloatField from "../../components/FloatField";
import UnitField from "../../components/UnitField";
import SimulationSliderView from "./SimulationSliderView";
import HelpButton from "../../components/HelpButton";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { ChangeEvent, useState } from "react";
import { getTableHeight } from "../../shared/calculateTableHeights";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { PageName } from "../main/mainSlice";
import {
  Simulation,
  SimulationPlot,
  SimulationRead,
  SimulationSlider,
  SubjectGroupRead,
  UnitRead,
} from "../../app/backendApi";
import { Control } from "react-hook-form";
import { useCollapsibleSidebar } from "../../shared/contexts/CollapsibleSidebarContext";
import "../../App.css";

type SimulationsSidePanelType = {
  portalId: string;
  addPlotOptions: {
    value: number;
    label: string;
  }[];
  handleAddPlot: (plot: number) => void;
  isSharedWithMe: boolean;
  layoutOptions: { value: string; label: string }[];
  layout: string[];
  setLayout: (layout: string[]) => void;
  plots: SimulationPlot[];
  control: Control<Simulation, unknown>;
  units: UnitRead[];
  simulation: SimulationRead;
  groups?: SubjectGroupRead[];
  visibleGroups: string[];
  handleVisibleGroups: (group: ChangeEvent<HTMLInputElement>) => void;
  addSliderOptions: {
    value: number;
    label: string;
  }[];
  handleAddSlider: (slider: number) => void;
  orderedSliders: (SimulationSlider & { fieldArrayIndex: number })[];
  handleChangeSlider: (variable: number, value: number) => void;
  handleRemoveSlider: (index: number) => () => void;
  handleSaveSlider: (slider: SimulationSlider) => (value: number) => void;
  handleSaveAllSlider: () => void;
  exportSimulation: () => void;
  showReference: boolean;
  setShowReference: (reference: boolean) => void;
  shouldShowLegend: boolean;
  setShouldShowLegend: (value: boolean) => void;
};

const ButtonSx = {
  transition: "all .35s linear",
  color: "#544f4f",
  backgroundColor: "transparent",
  "&:hover": {
    backgroundColor: "transparent",
  },
  borderBottom: "1px solid #dbd6d1",
  borderRadius: 0,
  width: "12rem",
  textTransform: "capitalize",
  display: "flex",
  justifyContent: "flex-start",
};

const SidePanelSteps = [
  {
    minHeight: 1100,
    tableHeight: "75vh",
  },
  {
    minHeight: 1000,
    tableHeight: "72vh",
  },
  {
    minHeight: 900,
    tableHeight: "70vh",
  },
  {
    minHeight: 800,
    tableHeight: "65vh",
  },
  {
    minHeight: 700,
    tableHeight: "60vh",
  },
  {
    minHeight: 600,
    tableHeight: "55vh",
  },
  {
    minHeight: 500,
    tableHeight: "50vh",
  },
  {
    minHeight: 400,
    tableHeight: "40vh",
  },
  {
    minHeight: 300,
    tableHeight: "30vh",
  },
];

export const SimulationsSidePanel = ({
  portalId,
  addPlotOptions,
  handleAddPlot,
  isSharedWithMe,
  layoutOptions,
  layout,
  setLayout,
  plots,
  control,
  units,
  simulation,
  groups,
  visibleGroups,
  handleVisibleGroups,
  addSliderOptions,
  handleAddSlider,
  orderedSliders,
  handleChangeSlider,
  handleRemoveSlider,
  handleSaveSlider,
  handleSaveAllSlider,
  exportSimulation,
  showReference,
  setShowReference,
  shouldShowLegend,
  setShouldShowLegend,
}: SimulationsSidePanelType) => {
  const selectedPage = useSelector(
    (state: RootState) => state.main.selectedPage,
  );
  const portalRoot = document.getElementById(portalId);
  const [collapseLayout, setCollapseLayout] = useState(false);
  const [collapseOptions, setCollapseOptions] = useState(false);
  const [collapseGroups, setCollapseGroups] = useState(false);
  const [collapseParameters, setCollapseParameters] = useState(false);
  const [collapseReference, setCollapseReference] = useState(false);
  const [collapseLegend, setCollapseLegend] = useState(false);
  const { simulationAnimationClasses } = useCollapsibleSidebar();

  const onLayoutChange = (value: string) => {
    if (layout.includes(value)) {
      setLayout(layout.filter((layoutValue) => value !== layoutValue));
    } else {
      setLayout(layout?.length ? [] : [value]);
    }
  };

  if (!portalRoot || selectedPage !== PageName.SIMULATIONS) return null;

  return ReactDOM.createPortal(
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
        sx={{ display: "flex", justifyContent: "flex-start", padding: "1rem" }}
      >
        <Box
          sx={{
            paddingTop: "5rem",
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          <Typography variant="h4">Simulations</Typography>
          <DropdownButton
            sx={{ width: "12rem", marginTop: ".5  rem" }}
            useIcon={false}
            data_cy="add-plot"
            options={addPlotOptions}
            onOptionSelected={handleAddPlot}
            disabled={isSharedWithMe}
          >
            Add new plot
          </DropdownButton>
          <Divider
            sx={{ paddingTop: "1rem", width: "11rem" }}
            variant="middle"
          />
          <Box
            sx={{
              overflowX: "auto",
              maxHeight: getTableHeight({ steps: SidePanelSteps }),
            }}
          >
            <Box>
              <Box>
                <Button
                  sx={ButtonSx}
                  disableTouchRipple
                  disableRipple
                  disableFocusRipple
                  disableElevation
                  onClick={() => setCollapseLayout(!collapseLayout)}
                  startIcon={collapseLayout ? <ExpandLess /> : <ExpandMore />}
                >
                  <Typography>Figures Layout</Typography>
                </Button>
                <Collapse
                  sx={{
                    transition: "all .35s ease-in",
                    marginBottom: ".5rem",
                  }}
                  timeout={350}
                  easing="ease-in"
                  in={collapseLayout}
                  component="div"
                >
                  <FormGroup>
                    {layoutOptions.map(({ value, label }) => (
                      <FormControlLabel
                        key={value}
                        control={
                          <Checkbox
                            checked={layout.includes(value)}
                            onChange={() => {
                              onLayoutChange(value);
                            }}
                          />
                        }
                        label={label}
                      />
                    ))}
                  </FormGroup>
                </Collapse>
              </Box>
              <Box>
                <Button
                  sx={ButtonSx}
                  disableTouchRipple
                  disableRipple
                  disableFocusRipple
                  disableElevation
                  onClick={() => setCollapseOptions(!collapseOptions)}
                  startIcon={collapseOptions ? <ExpandLess /> : <ExpandMore />}
                >
                  <Typography>Simulation Options</Typography>
                </Button>
                <Collapse
                  sx={{
                    transition: "all .35s ease-in",
                    marginBottom: ".5rem",
                  }}
                  timeout={350}
                  easing="ease-in"
                  in={collapseOptions}
                  component="div"
                >
                  {plots.length > 0 && (
                    <>
                      <Stack
                        direction={"column"}
                        alignItems={"center"}
                        spacing={2}
                        justifyContent="flex-start"
                        paddingTop="1rem"
                      >
                        <FloatField
                          sx={{ width: "11rem" }}
                          label="Simulation Duration"
                          name="time_max"
                          control={control}
                          textFieldProps={{ disabled: isSharedWithMe }}
                        />
                        <UnitField
                          sx={{ width: "11rem" }}
                          label="Unit"
                          name="time_max_unit"
                          baseUnit={units.find(
                            (u) => u.id === simulation?.time_max_unit,
                          )}
                          control={control}
                          selectProps={{
                            disabled: isSharedWithMe,
                          }}
                        />
                      </Stack>
                    </>
                  )}
                </Collapse>
              </Box>
              <Box>
                {!!groups?.length && (
                  <>
                    <Button
                      sx={ButtonSx}
                      disableTouchRipple
                      disableRipple
                      disableFocusRipple
                      disableElevation
                      onClick={() => setCollapseGroups(!collapseGroups)}
                      startIcon={
                        collapseGroups ? <ExpandLess /> : <ExpandMore />
                      }
                    >
                      <Typography>Groups</Typography>{" "}
                      <Badge
                        sx={{ marginLeft: "auto", marginRight: "1rem" }}
                        badgeContent={visibleGroups?.length}
                        color="primary"
                      />
                    </Button>
                    <Collapse
                      sx={{
                        transition: "all .35s ease-in",
                        marginBottom: ".5rem",
                      }}
                      timeout={350}
                      easing="ease-in"
                      in={collapseGroups}
                      component="div"
                    >
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={visibleGroups.includes("Project")}
                              value="Project"
                              onChange={handleVisibleGroups}
                            />
                          }
                          label="Project"
                        />
                        {groups?.map((group) => (
                          <FormControlLabel
                            key={group.name}
                            control={
                              <Checkbox
                                checked={visibleGroups.includes(group.name)}
                                value={group.name}
                                onChange={handleVisibleGroups}
                              />
                            }
                            label={group.name}
                          />
                        ))}
                      </FormGroup>
                    </Collapse>
                  </>
                )}
              </Box>
              <Box sx={{ width: "11rem" }}>
                <Button
                  sx={ButtonSx}
                  disableTouchRipple
                  disableRipple
                  disableFocusRipple
                  disableElevation
                  onClick={() => setCollapseReference(!collapseReference)}
                  startIcon={
                    collapseReference ? <ExpandLess /> : <ExpandMore />
                  }
                >
                  <Typography>Reference</Typography>
                </Button>
                <Collapse
                  sx={{
                    transition: "all .35s ease-in",
                    marginBottom: ".5rem",
                  }}
                  timeout={350}
                  easing="ease-in"
                  in={collapseReference}
                  component="div"
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showReference}
                        onChange={(e) => setShowReference(e.target.checked)}
                      ></Checkbox>
                    }
                    label="Show reference"
                  />
                </Collapse>
              </Box>
              <Box sx={{ width: "11rem" }}>
                <Button
                  sx={ButtonSx}
                  disableTouchRipple
                  disableRipple
                  disableFocusRipple
                  disableElevation
                  onClick={() => setCollapseLegend(!collapseLegend)}
                  startIcon={
                    collapseReference ? <ExpandLess /> : <ExpandMore />
                  }
                >
                  <Typography>Legend</Typography>
                </Button>
                <Collapse
                  sx={{
                    transition: "all .35s ease-in",
                    marginBottom: ".5rem",
                  }}
                  timeout={350}
                  easing="ease-in"
                  in={collapseLegend}
                  component="div"
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={shouldShowLegend}
                        onChange={(e) => setShouldShowLegend(e.target.checked)}
                      ></Checkbox>
                    }
                    label="Show Legend"
                  />
                </Collapse>
              </Box>
              <Box sx={{ width: "11rem" }}>
                <Button
                  sx={ButtonSx}
                  disableTouchRipple
                  disableRipple
                  disableFocusRipple
                  disableElevation
                  onClick={() => setCollapseParameters(!collapseParameters)}
                  startIcon={
                    collapseParameters ? <ExpandLess /> : <ExpandMore />
                  }
                >
                  <Typography>Parameters</Typography>
                  <Badge
                    sx={{ marginLeft: "auto", marginRight: "1rem" }}
                    badgeContent={orderedSliders?.length}
                    color="primary"
                  />
                </Button>
                <Collapse
                  sx={{
                    transition: "all .35s ease-in",
                    marginBottom: ".5rem",
                  }}
                  timeout={350}
                  easing="ease-in"
                  in={collapseParameters}
                  component="div"
                >
                  <DropdownButton
                    variant="outlined"
                    sx={{ width: "12rem", marginTop: ".5rem" }}
                    useIcon={false}
                    options={addSliderOptions}
                    onOptionSelected={handleAddSlider}
                    data_cy="add-parameter-slider"
                    disabled={isSharedWithMe}
                  >
                    Add Parameter
                  </DropdownButton>
                  {orderedSliders.map((slider, index) => (
                    <SimulationSliderView
                      key={index}
                      index={index}
                      slider={slider}
                      onChange={handleChangeSlider}
                      onRemove={handleRemoveSlider(slider.fieldArrayIndex)}
                      onSave={handleSaveSlider(slider)}
                      units={units}
                    />
                  ))}
                  <Button
                    variant="outlined"
                    sx={{ width: "12rem", marginTop: ".5rem" }}
                    onClick={handleSaveAllSlider}
                    disabled={isSharedWithMe}
                  >
                    Save All Sliders
                  </Button>
                </Collapse>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Button variant="contained" onClick={exportSimulation}>
          Export to CSV
        </Button>
        <HelpButton title={"Export to CSV"}>
          A variables are reported in pmol, C or T variables are reported in
          pmol/L and AUC variables are reported in pmol/L*h. These units cannot
          be changed in the current version.
        </HelpButton>
      </Box>
    </Box>,
    portalRoot,
  );
};
