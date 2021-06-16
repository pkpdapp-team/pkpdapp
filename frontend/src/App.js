import React, {useEffect} from "react";
import {
  Switch,
  Route,
  Redirect,
  Link,
  useHistory,
  useLocation,
} from "react-router-dom";
import Login from "./Login"
import DatasetDetail from "./DatasetDetail"
import Project from "./Project"
import TableChartIcon from '@material-ui/icons/TableChart';
import BatteryUnknownIcon from '@material-ui/icons/BatteryUnknown';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import BackupIcon from '@material-ui/icons/Backup';
import DateRangeIcon from '@material-ui/icons/DateRange';
import { makeStyles, fade } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import SettingsBackupRestoreIcon from '@material-ui/icons/SettingsBackupRestore';

import { green, pink } from '@material-ui/core/colors';
import BubbleChartIcon from '@material-ui/icons/BubbleChart';
import TimelineIcon from '@material-ui/icons/Timeline';

import Tooltip from '@material-ui/core/Tooltip';
import SearchIcon from '@material-ui/icons/Search';

import InputBase from '@material-ui/core/InputBase';
import VisibilityIcon from '@material-ui/icons/Visibility';

import clsx from 'clsx';
import Drawer from '@material-ui/core/Drawer';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import List from '@material-ui/core/List';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import LabelIcon from '@material-ui/icons/Label';
import AddIcon from '@material-ui/icons/Add';
import AccessibilityIcon from '@material-ui/icons/Accessibility';
import FunctionsIcon from '@material-ui/icons/Functions';
import AllInboxIcon from '@material-ui/icons/AllInbox';
import Avatar from '@material-ui/core/Avatar';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';

import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';

import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import { api } from './Api'
import CreateProjectDialog from './CreateProjectDialog'
import CreatePkModelDialog from './CreatePkModelDialog'




const PrivateRoute = ({ component: Component, ...rest }) => {
  const logged = api.isLoggedIn();

  return <Route {...rest} render={(props) => (
    logged
      ? <Component {...props} />
      : <Redirect to='/login' />
  )} />
}

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
  grow: {
    flexGrow: 1,
  },
  root: {
    display: 'flex',
  },
  title: {
    display: 'none',
    [theme.breakpoints.up('sm')]: {
      display: 'block',
    },
  },
  search: {
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: fade(theme.palette.common.white, 0.15),
    '&:hover': {
      backgroundColor: fade(theme.palette.common.white, 0.25),
    },
    marginRight: theme.spacing(2),
    marginLeft: 0,
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      marginLeft: theme.spacing(3),
      width: 'auto',
    },
  },
  searchIcon: {
    padding: theme.spacing(0, 2),
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRoot: {
    color: 'inherit',
  },
  inputInput: {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
    },
  },
  toolbar: {
    paddingRight: 24, // keep right padding when drawer closed
  },
  toolbarIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 8px',
    ...theme.mixins.toolbar,
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  galvanalyserLogo: {
    height: '40px' 
  },
  menuButton: {
    marginRight: 36,
  },
  menuButtonHidden: {
    display: 'none',
  },
  
  drawerPaper: {
    position: 'relative',
    whiteSpace: 'nowrap',
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerPaperClose: {
    overflowX: 'hidden',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: theme.spacing(7),
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing(9),
    },
  },
  appBarSpacer: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    height: '100vh',
    overflow: 'auto',
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(2),
    display: 'flex',
    overflow: 'auto',
    flexDirection: 'column',
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
  avatarSmall: {
    width: theme.spacing(3),
    height: theme.spacing(3),
  },
  avatar: {
    width: theme.spacing(5),
    height: theme.spacing(5),
  },
  avatarSmallSelected: {
    width: theme.spacing(3),
    height: theme.spacing(3),
    backgroundColor: theme.palette.secondary.main,
  },
  avatarSelected: {
    width: theme.spacing(5),
    height: theme.spacing(5),
    backgroundColor: theme.palette.secondary.main,
  },
  large: {
    width: theme.spacing(7),
    height: theme.spacing(7),
  },
}));


function AvatarListItem({ nested, item, selected, handleClick, small }) {
  const classes = useStyles();
  let itemClassName;
  if (small) {
    if (selected) {
      itemClassName = classes.avatarSmallSelected;
    } else {
      itemClassName = classes.avatarSmall;
    }
  } else {
    if (selected) {
      itemClassName = classes.avatarSelected;
    } else {
      itemClassName = classes.avatar;
    }
  }
  return (
    <Tooltip title={item.name} placement="right" arrow>
      <ListItem button className={nested ? classes.nested : null} onClick={handleClick}>
      <ListItemAvatar>
        <Avatar  className={itemClassName}>{item.name[0]}</Avatar>
      </ListItemAvatar>
      <ListItemText primary={item.name} />
    </ListItem>
    </Tooltip>

  )
}

function ExpandableListItem({project, icon: Icon, items, text, selectedItems, apiId, type, handleClickItem, createNewComponent: CreateNewComponent}) {

  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  const [openCreateNew, setOpenCreateNew] = React.useState(false);

  const handleClick = () => {
    setOpen(!open);
  };

  const handleNewOpenClose = () => {
    setOpenCreateNew((open) => !open);
  }

  const handleNewSave = (data) => {
    handleNewOpenClose(); 
    project.refresh(project.id);
  }

  return (
    <React.Fragment>
      <ListItem button onClick={handleClick}>
        <ListItemIcon>
          <Icon />
        </ListItemIcon>
        <ListItemText primary={text} />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <Collapse in={open} timeout="auto" unmountOnExit>
      <List component="div" disablePadding>
        {items.map((item) => (
          <AvatarListItem
            nested={true}
            key={item.id}
            item={item} 
            selected={selectedItems.find((i) => i.id === item.id) !== undefined}
            small={true}
            handleClick={() => {
              handleClickItem({...item, type: type});
            }}
          />
        ))}
        <AddButton 
          project={project}
          nested={true}
          handleOpenClose={handleNewOpenClose} 
          handleSave={handleNewSave} 
          component={CreateNewComponent} 
          open={openCreateNew}
          label={`create ${text}`} small={true}
        />
      </List>
      </Collapse>
    </React.Fragment>
  )
}

function AddButton({ project, nested, handleOpenClose, handleSave, label, small, component: Component, open }) {
  const classes = useStyles();
  let avatarClassName;
  if (small) {
    avatarClassName = classes.avatarPlusSmall
  } else {
    avatarClassName = classes.avatarPlus
  }

  return (
    <React.Fragment>
    <Tooltip title={label} placement="bottom">
      <ListItem button className={nested ? classes.nested : null} onClick={handleOpenClose}>
        <ListItemAvatar>
          <Avatar variant='rounded' className={avatarClassName}>
            <AddIcon/>
          </Avatar>
        </ListItemAvatar>
      </ListItem>
      </Tooltip>
      <Component 
        project={project}
        open={open}
        handleClose={handleOpenClose}
        handleSave={handleSave}
      />
    </React.Fragment>
  )
}


function ListOfProjects({ handleClickProject, project}) {
  const classes = useStyles();
  const [projects, setProjects] = React.useState([]);
  const [newProjectOpen, setNewProjectOpen] = React.useState(false);

  useEffect(() => {
    api.get("/api/project").then(setProjects);
  },[])

  const handleOpenCloseNewProject = () => {
    setNewProjectOpen((open) => !open);
  };

  const handleSaveNewProject = (data) => {
    handleOpenCloseNewProject(); 
    api.get("api/project").then(setProjects);
  };

  return (
    <List>
      {projects.map((p) => (
        <AvatarListItem
          item={p} 
          key={p.id}
          selected={project ? p.id === project.id : false}
          handleClick={() => handleClickProject(p)}
        />
      ))}
      <AddButton 
        handleOpenClose={handleOpenCloseNewProject}             
        handleSave={handleSaveNewProject}             
        component={CreateProjectDialog} 
        open={newProjectOpen} label='create project'
      />
    </List>
  )
}

function ProjectMenu({ project, selectedItems, handleClickItem }) {
  const classes = useStyles();
  const datasets = project.datasets;
  const pkModels = project.pk_models;
  const pdModels = project.pd_models;
  const pkpdModels = project.pkpd_models;
  const [dataAnalysisOpen, setDataAnalysisOpen] = React.useState(false);
  const handleDataAnalysisClick = () => {
    setDataAnalysisOpen((open) => !open);
  };
  
  return (
    <List>
      <ListItem button >
        <ListItemIcon>
          <VisibilityIcon />
        </ListItemIcon>
        <ListItemText primary='Explore' />
      </ListItem>
      <ListItem button onClick={handleDataAnalysisClick}>
        <ListItemIcon>
          <TimelineIcon/>
        </ListItemIcon>
        <ListItemText primary='Data Analysis' />
        {dataAnalysisOpen ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <Collapse in={dataAnalysisOpen} timeout="auto" unmountOnExit>
      <List component="div" disablePadding>
       <ListItem button className={classes.nested}>
        <ListItemIcon>
          <CheckBoxOutlineBlankIcon />
        </ListItemIcon>
        <ListItemText primary='NCA' />
       </ListItem>
        <ListItem button className={classes.nested}>
        <ListItemIcon>
          <BubbleChartIcon />
        </ListItemIcon>
        <ListItemText primary='AUCE' />
       </ListItem>
      </List>
      </Collapse>
      <ListItem button >
        <ListItemIcon>
          <SettingsBackupRestoreIcon/>
        </ListItemIcon>
        <ListItemText primary='Inference' />
      </ListItem>

      <Divider />

      <ExpandableListItem 
        project={project}
        items={datasets} 
        text="Datasets" 
        type='dataset'
        apiId='dataset'
        icon={TableChartIcon}
        handleClickItem={handleClickItem}
        createNewComponent={CreatePkModelDialog}
        selectedItems={
          selectedItems.filter((i) => i.type === 'dataset')
        }
      />

      <ExpandableListItem 
        project={project}
        items={pkModels} 
        text="PK Models" 
        type='pk_model'
        apiId='dosed_pharmacokinetic'
        icon={AccessibilityIcon}
        handleClickItem={handleClickItem}
        createNewComponent={CreatePkModelDialog}
        selectedItems={
          selectedItems.filter((i) => i.type === 'pk_model')
        }
      />
      <ExpandableListItem 
        project={project}
        items={pdModels} 
        text="PD Models" 
        type='pd_model'
        apiId='pharmacodynamic'
        icon={FunctionsIcon}
        handleClickItem={handleClickItem}
        createNewComponent={CreatePkModelDialog}
        selectedItems={
          selectedItems.filter((i) => i.type === 'pd_model')
        }
      />
      <ExpandableListItem 
        project={project}
        items={pkpdModels} 
        text="PKPD Models" 
        type='pkd_model'
        apiId='pkpd_model'
        icon={AllInboxIcon}
        handleClickItem={handleClickItem}
        createNewComponent={CreatePkModelDialog}
        selectedItems={
          selectedItems.filter((i) => i.type === 'pkpd_model')
        }
      />
    </List>
  )
}


export default function App() {
  const classes = useStyles();
  const [project, setProject] = React.useState(null);
  const [selectedItems, setSelectedItems] = React.useState([]);
  const [open, setOpen] = React.useState(true);

  const handleDrawerOpenClose = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClickItem = (item) => {
    setSelectedItems((prevSelected) => {
      let newSelected = prevSelected.filter((s) => 
        s.type !== item.type || s.id !== item.id
      );
      if (newSelected.length === prevSelected.length) {
        newSelected.push(item)
      }
      return newSelected;
    });
  };

  const loadProject = (id) => {
    console.log('setting project', id);
    api.get(`/api/project/${id}`).then(data => {
      setProject({
        ...data,
        refresh: loadProject,
      });
    });
  };

  const handleClickProject = (project) => {
    loadProject(project.id);
    setSelectedItems([]);
  };

  let history = useHistory();

  const logged_in = (
    <div className={classes.root}>
    <CssBaseline />
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
            inputProps={{ 'aria-label': 'search' }}
          />
        </div>
        <div className={classes.grow} />
        <Button color="inherit" onClick={() => {
          api.logout()
          history.push('/login');
        }}>
          Logout
        </Button>
      </Toolbar>
    </AppBar>
    <Drawer
      variant="permanent"
      classes={{
        paper: clsx(classes.drawerPaper,  classes.drawerPaperClose),
      }}
      open={open}
    >
      <div className={classes.toolbarIcon}>
        <IconButton>
          <ChevronLeftIcon />
        </IconButton>
      </div>
      <Divider />
      <Typography align='center'>
        Projects
      </Typography>
      <ListOfProjects 
        project={project} handleClickProject={handleClickProject}
      />
    </Drawer>
    <Drawer
      variant="permanent"
      classes={{
        paper: clsx(classes.drawerPaper, !open && classes.drawerPaperClose),
      }}
      open={open}
    >
      <div className={classes.toolbarIcon}>
        <IconButton>
          <ChevronLeftIcon />
        </IconButton>
      </div>
      <Divider />
      {project && <ProjectMenu 
        project={project} 
        selectedItems={selectedItems}
        handleClickItem={handleClickItem}
      />
      }
    </Drawer>
    <main className={classes.content}>
      <div className={classes.appBarSpacer} />
        {/* A <Switch> looks through its children <Route>s and
              renders the first one that matches the current URL. */}
        <Switch>
          <PrivateRoute path="/dataset/:id" component={DatasetDetail} />
          <PrivateRoute path="/" component={Project} />
        </Switch>
    </main>
    </div>
  );


  return (
      <Switch>
        <Route path="/login">
          <Login />
        </Route>
        <Route>
          {logged_in}
        </Route>
    </Switch>
  );
}
 