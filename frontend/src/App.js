import React, { useEffect } from "react";
import {
  Switch,
  Route,
  Link,
  matchPath,
  Redirect,
  useParams,
  useLocation,
  useHistory,
} from "react-router-dom";
import { useDispatch } from "react-redux";
import { ThemeProvider, StyledEngineProvider, createTheme } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
//import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
//import enUS from 'date-fns/locale/en-US';
import 'dayjs/locale/en-gb';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';


import DateFnsUtils from "@date-io/date-fns";
import Container from "@mui/material/Container";
import Login from "./features/login/Login";
import Register from "./features/login/Register";
import RegisterSuccess from "./features/login/RegisterSuccess";
import ActivateUser from "./features/login/ActivateUser";
import ActivateUserSuccess from "./features/login/ActivateUserSuccess";
import ResetPasswordRequest from "./features/login/ResetPasswordRequest";
import ResetPasswordRequestSuccess from "./features/login/ResetPasswordRequestSuccess";
import ResetPassword from "./features/login/ResetPassword";
import ResetPasswordSuccess from "./features/login/ResetPasswordSuccess";

import { alpha } from "@mui/material/styles";
import makeStyles from '@mui/styles/makeStyles';
import CssBaseline from "@mui/material/CssBaseline";

import SearchIcon from "@mui/icons-material/Search";

import InputBase from "@mui/material/InputBase";

import clsx from "clsx";
import Drawer from "@mui/material/Drawer";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

import { api } from "./Api";
import InferenceMenu from "./features/menu/InferenceMenu";
import Projects from "./features/projects/Projects";
import Project from "./features/projects/Project";
import RequireLogin from "./features/login/RequireLogin";


import { logout, fetchSession } from "./features/login/loginSlice";
import { fetchAlgorithms } from "./features/inference/algorithmsSlice.js";
import { fetchUnits } from "./features/projects/unitsSlice.js";
import { fetchUsers } from "./features/projects/usersSlice.js";
import { fetchProjects } from "./features/projects/projectsSlice.js";

dayjs.extend(utc);

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
  grow: {
    flexGrow: 1,
  },
  root: {
    display: "flex",
  },
  title: {
    display: "none",
    [theme.breakpoints.up("sm")]: {
      display: "block",
    },
  },
  search: {
    position: "relative",
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    "&:hover": {
      backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    marginRight: theme.spacing(2),
    marginLeft: 0,
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      marginLeft: theme.spacing(3),
      width: "auto",
    },
  },
  searchIcon: {
    padding: theme.spacing(0, 2),
    height: "100%",
    position: "absolute",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  inputRoot: {
    color: "inherit",
  },
  inputInput: {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("md")]: {
      width: "20ch",
    },
  },
  toolbar: {
    paddingRight: 24, // keep right padding when drawer closed
  },
  toolbarIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 8px",
    ...theme.mixins.toolbar,
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  galvanalyserLogo: {
    height: "40px",
  },
  menuButton: {
    marginRight: 36,
  },
  menuButtonHidden: {
    display: "none",
  },

  drawerPaper: {
    position: "relative",
    overflowX: "hidden",
    whiteSpace: "nowrap",
    width: drawerWidth,
    height: "100%",
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },

  drawerPaperClose: {
    overflowX: "hidden",
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: theme.spacing(7),
    height: "100%",
    [theme.breakpoints.up("sm")]: {
      width: theme.spacing(9),
    },
  },
  appBarSpacer: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    overflow: "auto",
  },
  container: {
    paddingTop: theme.spacing(10),
    paddingBottom: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },
  fixedHeight: {
    height: 240,
  },
  nested: {
    paddingLeft: theme.spacing(4),
  },
  avatarPlusSmall: {
    width: theme.spacing(3),
    height: theme.spacing(3),
    backgroundColor: theme.palette.primary.main,
  },
  avatarPlus: {
    width: theme.spacing(5),
    height: theme.spacing(5),
    backgroundColor: theme.palette.primary.main,
  },
  colorSelected: {
    backgroundColor: theme.palette.secondary.main,
  },
  avatarSmall: {
    width: theme.spacing(3),
    height: theme.spacing(3),
  },
  avatar: {
    width: theme.spacing(5),
    height: theme.spacing(5),
    backgroundColor: theme.palette.secondary.main,
  },
  large: {
    width: theme.spacing(7),
    height: theme.spacing(7),
  },
  noPadding: {
    margin: 0,
    marginRight: 0,
    marginLeft: 0,
    padding: 0,
  },
}));

function LoggedInApp() {
  const classes = useStyles();
  const [open, setOpen] = React.useState(true);

  const handleDrawerOpenClose = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleLogout = () => {
    dispatch(logout());
  }

  let history = useHistory();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchUsers());
    dispatch(fetchUnits());
    dispatch(fetchAlgorithms());
    //const interval = setInterval(() => {
    //  refreshHarvesters();
    //}, 5000);
    //return () => clearInterval(interval);
  }, [dispatch]);

  const { pathname } = useLocation();
  const matchProject = matchPath(pathname, { path: '/:id'})

  const rootPath = "/";
  const isRootPath = !!matchPath(pathname, { path: rootPath, exact: true });
  console.log('pathname', pathname)
  let modellingPath = ''
  let isModellingPath = false
  let inferencePath = ''
  let isInferencePath = false
  if (matchProject) {
    modellingPath = `/${matchProject.params.id}`;
    isModellingPath = !!matchPath(pathname, {
      path: modellingPath,
      exact: true,
    });
    inferencePath = `/${matchProject.params.id}/inference`;
    isInferencePath = !!matchPath(pathname, {
      path: inferencePath,
    });
  }
  return (
    <div className={classes.root}>
      <AppBar position="absolute" className={clsx(classes.appBar)}>
        <Toolbar className={classes.toolbar}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpenClose}
            className={clsx(classes.menuButton)}
            size="large">
            <MenuIcon />
          </IconButton>
          <Typography className={classes.title} variant="h6" noWrap>
            PKPDapp
          </Typography>
          { !isRootPath &&
          <React.Fragment>
          <div className={classes.search}>
            <div className={classes.searchIcon}>
              <SearchIcon />
            </div>
            <InputBase
              placeholder="Search..."
              classes={{
                root: classes.inputRoot,
                input: classes.inputInput,
              }}
              inputProps={{ "aria-label": "search" }}
            />
          </div>

          <ButtonGroup variant="contained">
            <Button
              component={Link}
              to={rootPath}
              variant="contained"
              color={isRootPath ? "secondary" : "primary"}
            >
              Home
            </Button>
            <Button
              component={Link}
              to={modellingPath}
              variant="contained"
              color={isModellingPath ? "secondary" : "primary"}
            >
              Workbench 
            </Button>
            
            <Button
              component={Link}
              to={inferencePath}
              variant="contained"
              color={isInferencePath ? "secondary" : "primary"}
            >
              Inferences
            </Button>
          </ButtonGroup>
          </React.Fragment>
          }

          <div className={classes.grow} />
          <Button
            color="inherit"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
        {/* A <Switch> looks through its children <Route>s and
              renders the first one that matches the current URL. */}

        <LocalizationProvider
          dateAdapter={AdapterDayjs}
          //adapterLocale={'en-gb'}
          dateLibInstance={dayjs.utc}
        >
        <Container maxWidth={false} className={classes.container}>
        <Switch>
          <Route path="/:id" component={Project} />
          <Route path="/" component={Projects} />
        </Switch>
        </Container>
        </LocalizationProvider>
    </div>
  );
}

const theme = createTheme(
  {
  },
);


export default function App() {
  const dispatch = useDispatch();
  React.useEffect(() => {
    dispatch(fetchSession());
  }, [dispatch]);

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>;
        <CssBaseline />
        <Switch>
          <Route path="/login">
            <Login />
          </Route>
          <Route>
            <RequireLogin>
              <LoggedInApp />
            </RequireLogin>
          </Route>
        </Switch>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
