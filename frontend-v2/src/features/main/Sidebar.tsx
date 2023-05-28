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
import { PageName, selectPage } from './mainSlice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../app/store';

const drawerWidth = 240;

export default function Sidebar() {
  const dispatch = useDispatch();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const selectedPage = useSelector((state: RootState) => state.main.selectedPage);
  const selectedProject = useSelector((state: RootState) => state.main.selectedProject);

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
    dispatch(selectPage(PageName[key as keyof typeof PageName]));
  }; 
  
  const isPageDisabled = (key: string) => { 
    const page = PageName[key as keyof typeof PageName];
    if (page === PageName.TRIAL_DESIGN) {
      return true;
    }
    if (page === PageName.DATA) {
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
                {index % 2 === 0 ? <InboxIcon /> : <MailIcon />}
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
          <Typography variant="h6" noWrap component="div">
            PkpdApp
          </Typography>
        </Toolbar>
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