import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Button
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  ShoppingCart as DealsIcon,
  Inventory as ProductsIcon,
  Assessment as AnalyticsIcon,
  Task as TaskIcon,
  Message as MessageIcon,
  Description as DocumentsIcon,
  Settings as SettingsIcon,
  Chat as ChatIcon,
  Security as SecurityIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240;

const menuItems = [
  { text: 'Дашборд', icon: <DashboardIcon />, path: '/' },
  { text: 'Лиды', icon: <PeopleIcon />, path: '/leads' },
  { text: 'Студенты', icon: <SchoolIcon />, path: '/students' },
  { text: 'Сделки', icon: <DealsIcon />, path: '/deals' },
  { text: 'Продукты', icon: <ProductsIcon />, path: '/products' },
  { text: 'Задачи', icon: <TaskIcon />, path: '/tasks' },
  { text: 'Аналитика', icon: <AnalyticsIcon />, path: '/analytics' },
  { text: 'Шаблоны', icon: <MessageIcon />, path: '/templates' },
  { text: 'Документы', icon: <DocumentsIcon />, path: '/documents' },
  { text: 'Чат', icon: <ChatIcon />, path: '/chat' },
  { text: 'Админка бота', icon: <SettingsIcon />, path: '/bot-admin' },
  { text: 'Права доступа', icon: <SecurityIcon />, path: '/permissions' },
  { text: 'Пользователи CRM', icon: <PeopleIcon />, path: '/users-management' },
];

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            CRM Momentum Trading Pro
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.name} ({user?.email})
          </Typography>
          <Button color="inherit" onClick={logout}>
            Выйти
          </Button>
        </Toolbar>
      </AppBar>
      
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` }
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default Layout;

