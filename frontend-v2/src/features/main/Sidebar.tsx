import { ReactNode, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import MainContent from "./MainContent";
import { PageName, SubPageName, setPage, setSubPage } from "./mainSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { LinearProgress, Tooltip } from "@mui/material";
import { logout } from "../login/loginSlice";
import { useAppDispatch } from "../../app/hooks";
import ErrorIcon from "@mui/icons-material/Error";
import { SvgIcon } from "@mui/material";
import { ReactComponent as RocheLogo } from "../../shared/assets/svg/logo_roche.svg";
import { ReactComponent as PKPDLogo } from "../../shared/assets/svg/logo_pkpdapp.svg";
import {
  CombinedModelRead,
  ProtocolListApiResponse,
  useCombinedModelListQuery,
  usePharmacodynamicRetrieveQuery,
  useProjectRetrieveQuery,
  useProtocolListQuery,
} from "../../app/backendApi";
import DnsIcon from "@mui/icons-material/Dns";
import BiotechIcon from "@mui/icons-material/Biotech";
import FunctionsIcon from "@mui/icons-material/Functions";
import VaccinesIcon from "@mui/icons-material/Vaccines";
import SsidChartIcon from "@mui/icons-material/SsidChart";
import ContactSupportIcon from "@mui/icons-material/ContactSupport";
import TableViewIcon from "@mui/icons-material/TableView";
import "@fontsource/comfortaa"; // Defaults to weight 400
import useSubjectGroups from "../../hooks/useSubjectGroups";

const drawerWidth = 240;

export default function Sidebar() {
  const dispatch = useAppDispatch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const selectedPage = useSelector(
    (state: RootState) => state.main.selectedPage,
  );
  const selectedProject = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const { groups } = useSubjectGroups();
  const dirtyCount = useSelector((state: RootState) => state.main.dirtyCount);
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;

  const { data: models } = useCombinedModelListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  const { data: protocols } = useProtocolListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  const model = models?.[0] || null;
  const { data: pd_model } = usePharmacodynamicRetrieveQuery(
    { id: model?.pd_model || 0 },
    { skip: !model?.pd_model },
  );
  const { data: project } = useProjectRetrieveQuery(
    { id: projectIdOrZero },
    { skip: !projectId },
  );
  const { VITE_APP_ROCHE } = import.meta.env;
  const isRocheLogo =
    typeof VITE_APP_ROCHE === "string"
      ? VITE_APP_ROCHE === "true"
      : VITE_APP_ROCHE;

  const modelIsIncomplete = (
    mdl: CombinedModelRead | null,
    prtcls: ProtocolListApiResponse | undefined,
  ) => {
    const isTumourModel =
      pd_model?.is_library_model && pd_model?.name.startsWith("tumour_growth");
    const noKillModel = !mdl?.pd_model2;
    return (
      (mdl && mdl.pk_model === null) ||
      (mdl &&
        mdl.pd_model &&
        mdl.mappings.length === 0 &&
        !(isTumourModel && noKillModel)) ||
      (prtcls && prtcls.length === 0)
    );
  };

  const doses = groups?.flatMap((group) => group.protocols.map((p) => p.doses));
  const groupsAreIncomplete = doses?.some((dosing) => !dosing[0]?.amount);

  const warnings: { [key: string]: string } = {};
  const errors: { [key: string]: string } = {};
  if (modelIsIncomplete(model, protocols)) {
    errors[PageName.MODEL] =
      "Model is incomplete, see the Model tab for details";
  }
  if (groupsAreIncomplete) {
    warnings[PageName.TRIAL_DESIGN] =
      "Trial design is incomplete, one or more dose amounts are zero";
  }

  const errorComponents: { [key: string]: ReactNode } = {};
  for (const key in warnings) {
    errorComponents[key] = (
      <Tooltip title={warnings[key]}>
        <ErrorIcon color="warning" />
      </Tooltip>
    );
  }
  for (const key in errors) {
    errorComponents[key] = (
      <Tooltip title={errors[key]}>
        <ErrorIcon color="error" />
      </Tooltip>
    );
  }

  const icons: { [key: string]: ReactNode } = {
    [PageName.PROJECTS]: <DnsIcon />,
    [PageName.DRUG]: <BiotechIcon />,
    [PageName.MODEL]: <FunctionsIcon />,
    [PageName.TRIAL_DESIGN]: <VaccinesIcon />,
    [PageName.DATA]: <TableViewIcon />,
    [PageName.SIMULATIONS]: <SsidChartIcon />,
    [PageName.HELP]: <ContactSupportIcon />,
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const pageKeys = Object.keys(PageName);
  const pageValues = Object.values(PageName);

  const pages = pageKeys.map((key, index) => {
    return {
      key,
      value: pageValues[index],
    };
  });

  const handlePageClick = (key: string) => () => {
    const chosenPage = PageName[key as keyof typeof PageName];
    dispatch(setPage(chosenPage));

    switch (chosenPage) {
      case PageName.MODEL:
        dispatch(setSubPage(SubPageName.PKPDMODEL));
        break;
      case PageName.HELP:
        dispatch(setSubPage(SubPageName.TUTORIALS));
        break;
      default:
        dispatch(setSubPage(null));
        break;
    }
  };

  const isPageDisabled = (key: string) => {
    const page = PageName[key as keyof typeof PageName];
    if (page === PageName.HELP) {
      return false;
    }
    if (page === PageName.TRIAL_DESIGN && PageName.MODEL in errors) {
      return true;
    }
    if (page === PageName.DATA && PageName.MODEL in errors) {
      return true;
    }
    if (
      page === PageName.SIMULATIONS &&
      (PageName.MODEL in errors || PageName.TRIAL_DESIGN in errors)
    ) {
      return true;
    }
    if (selectedProject === null) {
      return page !== PageName.PROJECTS;
    } else {
      return false;
    }
  };

  const isPageSelected = (key: string) => {
    const page = PageName[key as keyof typeof PageName];
    return page === selectedPage;
  };

  const projectsPage = pages[0];
  const helpPage = pages[pages?.length - 1];
  const steps = pages.filter(
    (step) => step !== projectsPage && step !== helpPage,
  );

  const drawer = (
    <div style={{ marginTop: "7rem" }}>
      <List>
        <ListItem key={projectsPage?.key} disablePadding>
          <ListItemButton
            onClick={handlePageClick(projectsPage?.key)}
            disabled={isPageDisabled(projectsPage?.key)}
            disableRipple={true}
            selected={isPageSelected(projectsPage?.key)}
          >
            <ListItemIcon>
              {projectsPage?.value in errorComponents
                ? errorComponents[projectsPage?.value]
                : icons[projectsPage?.value]}
            </ListItemIcon>
            <ListItemText primary={projectsPage?.value} />
          </ListItemButton>
        </ListItem>
      </List>
      {projectIdOrZero !== 0 && (
        <>
          <Typography
            variant="subtitle1"
            noWrap
            component="div"
            sx={{
              flexGrow: 1,
              color: "gray",
              paddingLeft: "1rem",
              paddingTop: "1rem",
            }}
          >
            STEPS
          </Typography>
          <List>
            {steps.map(({ key, value }) => (
              <ListItem key={key} disablePadding>
                <ListItemButton
                  onClick={handlePageClick(key)}
                  disabled={isPageDisabled(key)}
                  disableRipple={true}
                  selected={isPageSelected(key)}
                >
                  <ListItemIcon>
                    {value in errorComponents
                      ? errorComponents[value]
                      : icons[value]}
                  </ListItemIcon>
                  <ListItemText primary={value} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
      <Typography
        sx={{
          position: 'absolute',
          bottom: 0,
          margin: '.5rem',
          color: "gray"
        }}
      >
        pkpdx version {import.meta.env.VITE_APP_VERSION?.slice(0, 7) || "dev"}
      </Typography>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `100%` },
          ml: { sm: `${drawerWidth}px` },
          zIndex: 9998,
          backgroundColor: "white",
        }}
      >
        <Toolbar>
          <IconButton
            color="primary"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" }, color: "grey" }}
          >
            <MenuIcon />
          </IconButton>
          <SvgIcon
            color="primary"
            sx={{ width: "4rem", height: "4rem" }}
            viewBox="0 0 62 32"
          >
            {isRocheLogo ? <RocheLogo /> : <PKPDLogo />}
          </SvgIcon>
          <Divider
            orientation="vertical"
            color="#000"
            style={{ height: "1rem", marginLeft: "1rem", opacity: "0.2" }}
          />
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              flexGrow: 1,
              color: "#1976d2",
              fontWeight: "bold",
              paddingLeft: "1rem",
              fontFamily: "Comfortaa",
            }}
          >
            pkpd explorer {project && ` - ${project.name}`}
          </Typography>
          <div style={{ display: "flex" }}>
            <Typography
              variant="subtitle1"
              noWrap
              component="div"
              onClick={handlePageClick(helpPage?.key)}
              sx={{
                flexGrow: 1,
                color: "gray",
                cursor: "pointer",
              }}
            >
              Help
            </Typography>
            <Typography
              variant="subtitle1"
              noWrap
              component="div"
              onClick={() => dispatch(logout())}
              sx={{
                flexGrow: 1,
                color: "gray",
                paddingLeft: "1rem",
                cursor: "pointer",
              }}
            >
              Exit
            </Typography>
          </div>
        </Toolbar>
        {dirtyCount !== 0 ? (
          <LinearProgress sx={{ height: 5, zIndex: 10010000 }} />
        ) : (
          <Box sx={{ height: 5 }}></Box>
        )}
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <MainContent />
      </Box>
    </Box>
  );
}
