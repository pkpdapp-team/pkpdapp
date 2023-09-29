import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MailIcon from '@mui/icons-material/Mail';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MainContent from './MainContent';
import { PageName, setPage } from './mainSlice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { LinearProgress } from '@mui/material';
import { ThemeContext } from '@emotion/react';
import { Logout } from '@mui/icons-material';
import { logout } from '../login/loginSlice';
import { useAppDispatch } from '../../app/hooks';
import ErrorIcon from '@mui/icons-material/Error';
import { Tooltip } from '@mui/material';
import { useCombinedModelListQuery, useProtocolListQuery } from '../../app/backendApi';
import { Protocol } from "../../app/backendApi";

const drawerWidth = 240;

export default function Sidebar() {
  const dispatch = useAppDispatch();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const selectedPage = useSelector((state: RootState) => state.main.selectedPage);
  const selectedProject = useSelector((state: RootState) => state.main.selectedProject);
  const dirtyCount = useSelector((state: RootState) => state.main.dirtyCount);
  const projectId = useSelector((state: RootState) => state.main.selectedProject);
  const { data: models, isLoading: isModelsLoading } = useCombinedModelListQuery({projectId: projectId || 0}, { skip: !projectId})
  const { data: protocols, error: protocolsError, isLoading: isProtocolsLoading } = useProtocolListQuery({projectId: projectId || 0}, { skip: !projectId})
  const model = models?.[0] || null;

  let errors: { [key: string]: string } = {};
  if ((model && model.pk_model === null) || (model && model.pd_model && model.mappings.length === 0) || (protocols && protocols.length === 0)) {
    errors[PageName.MODEL] = 'Model is incomplete, see the Model tab for details';
  }

  let errorComponents: { [key: string]: React.ReactNode } = {};
  for (const key in errors) {
    errorComponents[key] = (
      <Tooltip title={errors[key]}>
      <ErrorIcon color='error'/>
      </Tooltip>
    )
  }

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
    if (page === PageName.SIMULATIONS && (PageName.MODEL in errors || PageName.TRIAL_DESIGN in errors)) {
      return true;
    }
    if (selectedProject === null) {
      return page !== PageName.PROJECTS;
    } else {
      return false;
    }
  }
  
  const isPageSelected = (key: string) => {
    const page = PageName[key as keyof typeof PageName];
    return page === selectedPage;
  }
    

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        {pages.map(({ key, value }, index) => (
          <ListItem key={key} disablePadding selected={isPageSelected(key)}>
            <ListItemButton onClick={handlePageClick(key)} disabled={isPageDisabled(key)} disableRipple={true}>
              <ListItemIcon>
                {value in errorComponents ? errorComponents[value] : index % 2 === 0 ? <InboxIcon /> : <MailIcon />}
              </ListItemIcon>
              <ListItemText primary={value} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
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
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            PK/PD Simulator
          </Typography>
          <IconButton
            onClick={() => dispatch(logout())}
            color="inherit"
          >
            <Logout />
          </IconButton>
        </Toolbar>
        {dirtyCount !== 0 ? (
          <LinearProgress
            sx={{ height: 5, zIndex: 10010000}}
          />
        ): (
          <Box sx={{ height: 5}}></Box>
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
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar />
        <MainContent />
      </Box>
    </Box>
  );
}