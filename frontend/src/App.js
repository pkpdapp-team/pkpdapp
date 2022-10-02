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

import { MuiPickersUtilsProvider } from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import Container from "@material-ui/core/Container";
import Login from "./features/login/Login";
import Register from "./features/login/Register";
import RegisterSuccess from "./features/login/RegisterSuccess";
import ActivateUser from "./features/login/ActivateUser";
import ActivateUserSuccess from "./features/login/ActivateUserSuccess";
import ResetPasswordRequest from "./features/login/ResetPasswordRequest";
import ResetPasswordRequestSuccess from "./features/login/ResetPasswordRequestSuccess";
import ResetPassword from "./features/login/ResetPassword";
import ResetPasswordSuccess from "./features/login/ResetPasswordSuccess";

import { makeStyles, fade } from "@material-ui/core/styles";
import CssBaseline from "@material-ui/core/CssBaseline";

import SearchIcon from "@material-ui/icons/Search";

import InputBase from "@material-ui/core/InputBase";

import clsx from "clsx";
import Drawer from "@material-ui/core/Drawer";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Divider from "@material-ui/core/Divider";
import IconButton from "@material-ui/core/IconButton";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import MenuIcon from "@material-ui/icons/Menu";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";

import { api } from "./Api";
import InferenceMenu from "./features/menu/InferenceMenu";
import Projects from "./features/projects/Projects";
import Project from "./features/projects/Project";


import { fetchAlgorithms } from "./features/inference/algorithmsSlice.js";
import { fetchUnits } from "./features/projects/unitsSlice.js";
import { fetchUsers } from "./features/projects/usersSlice.js";
import { fetchProjects } from "./features/projects/projectsSlice.js";

const PrivateRoute = ({ component: Component, componentProps, ...rest }) => {
  const logged = api.isLoggedIn();
  console.log("logged", logged);

  return (
    <Route
      {...rest}
      render={(props) =>
        logged ? (
          <Component {...props} {...componentProps} />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
};

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
    backgroundColor: fade(theme.palette.common.white, 0.15),
    "&:hover": {
      backgroundColor: fade(theme.palette.common.white, 0.25),
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
    paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
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

export default function App() {
  const classes = useStyles();
  const [open, setOpen] = React.useState(true);

  const handleDrawerOpenClose = () => {
    setOpen((prevOpen) => !prevOpen);
  };

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
  let aucePath = ''
  let isAucePath = false
  let ncaPath  = ''
  let isNcaPath = false
  if (matchProject) {
    modellingPath = `/${matchProject.params.id}`;
    isModellingPath = !!matchPath(pathname, {
      path: modellingPath,
      exact: true,
    });
    inferencePath = `/${matchProject.params.id}/inference`;
    isInferencePath = !!matchPath(pathname, {
      path: inferencePath,
      exact: true,
    });
    ncaPath = `/${matchProject.params.id}/nca`;
    isNcaPath = !!matchPath(pathname, { path: ncaPath, exact: true });
    aucePath = `/${matchProject.params.id}/auce`;
    isAucePath = !!matchPath(pathname, { path: aucePath, exact: true });
  }
  console.log('path', pathname, isRootPath, isAucePath)

  const logged_in = (
    <div className={classes.root}>
      <AppBar position="absolute" className={clsx(classes.appBar)}>
        <Toolbar className={classes.toolbar}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpenClose}
            className={clsx(classes.menuButton)}
          >
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
              to={ncaPath}
              variant="contained"
              color={isNcaPath ? "secondary" : "primary"}
            >
              NCA
            </Button>

            <Button
              component={Link}
              to={aucePath}
              variant="contained"
              color={isAucePath ? "secondary" : "primary"}
            >
              AUCE
            </Button>

            
            <Button
              component={Link}
              to={inferencePath}
              variant="contained"
              color={isInferencePath ? "secondary" : "primary"}
            >
              Inference
            </Button>
          </ButtonGroup>
          </React.Fragment>
          }

          <div className={classes.grow} />
          <Button
            color="inherit"
            onClick={() => {
              api.logout();
              history.push("/login");
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <MuiPickersUtilsProvider utils={DateFnsUtils}>
        {/* A <Switch> looks through its children <Route>s and
              renders the first one that matches the current URL. */}
        <Container maxWidth={false} className={classes.container}>
        <Switch>
          <PrivateRoute path="/:id" component={Project} />
          <PrivateRoute path="/" component={Projects} />
        </Switch>
        </Container>
      </MuiPickersUtilsProvider>
    </div>
  );

  return (
    <React.Fragment>
      <CssBaseline />
      <Switch>
        <Route path="/login">
          <Login />
        </Route>
        <Route path="/reset-password-request">
          <ResetPasswordRequest />
        </Route>
        <Route path="/reset-password-request-success">
          <ResetPasswordRequestSuccess />
        </Route>
        <Route path="/reset-password/:uid/:token">
          <ResetPassword />
        </Route>
        <Route path="/reset-password-success">
          <ResetPasswordSuccess />
        </Route>
        <Route path="/register">
          <Register />
        </Route>
        <Route path="/activate/:uid/:token">
          <ActivateUser />
        </Route>
        <Route path="/activate-success">
          <ActivateUserSuccess />
        </Route>
        <Route path="/register-success">
          <RegisterSuccess />
        </Route>
        <Route>{logged_in}</Route>
      </Switch>
    </React.Fragment>
  );
}
