import * as React from "react";
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
import { PageName, setPage } from "./mainSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { LinearProgress, Tooltip } from "@mui/material";
import { Logout } from "@mui/icons-material";
import { logout } from "../login/loginSlice";
import { useAppDispatch } from "../../app/hooks";
import ErrorIcon from "@mui/icons-material/Error";
import {
  CombinedModelRead,
  Protocol,
  ProtocolListApiResponse,
  useCombinedModelListQuery,
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


const drawerWidth = 240;

export default function Sidebar() {
  const dispatch = useAppDispatch();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const selectedPage = useSelector(
    (state: RootState) => state.main.selectedPage,
  );
  const selectedProject = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const dirtyCount = useSelector((state: RootState) => state.main.dirtyCount);
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: models } =
    useCombinedModelListQuery(
      { projectId: projectIdOrZero },
      { skip: !projectId },
    );
  const {
    data: protocols,
  } = useProtocolListQuery({ projectId: projectIdOrZero }, { skip: !projectId });
  const model = models?.[0] || null;
  const { data: project } =
    useProjectRetrieveQuery({ id: projectIdOrZero }, { skip: !projectId });

  const modelIsIncomplete = (mdl: CombinedModelRead | null, prtcls: ProtocolListApiResponse | undefined) => {
    return (
      (mdl && mdl.pk_model === null) ||
      (mdl && mdl.pd_model && mdl.mappings.length === 0) ||
      (prtcls && prtcls.length === 0)
    );
  };

  const errors: { [key: string]: string } = {};
  if (modelIsIncomplete(model, protocols)) {
    errors[PageName.MODEL] =
      "Model is incomplete, see the Model tab for details";
  }

  const errorComponents: { [key: string]: React.ReactNode } = {};
  for (const key in errors) {
    errorComponents[key] = (
      <Tooltip title={errors[key]}>
        <ErrorIcon color="error" />
      </Tooltip>
    );
  }

  const icons: { [key: string]: React.ReactNode } = {
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
    dispatch(setPage(PageName[key as keyof typeof PageName]));
  };

  const isPageDisabled = (key: string) => {
    const page = PageName[key as keyof typeof PageName];
    if (page === PageName.HELP) {
      return false;
    }
    if (page === PageName.TRIAL_DESIGN && PageName.MODEL in errors) {
      return true;
    }
    if (page === PageName.DATA) {
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

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        {pages.map(({ key, value }) => (
          <ListItem key={key} disablePadding selected={isPageSelected(key)}>
            <ListItemButton
              onClick={handlePageClick(key)}
              disabled={isPageDisabled(key)}
              disableRipple={true}
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
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontFamily: "comfortaa" }}>
            pkpd explorer{project && ` - ${project.name}`}
          </Typography>
          <IconButton onClick={() => dispatch(logout())} color="inherit">
            <Logout />
          </IconButton>
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
