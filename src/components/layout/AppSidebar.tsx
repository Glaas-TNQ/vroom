import { Home, Bot, Play, Settings, History, LayoutGrid, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const navItems = [
    { title: t('nav.dashboard'), url: '/', icon: Home },
    { title: t('nav.agents'), url: '/agents', icon: Bot },
    { title: t('nav.rooms'), url: '/rooms', icon: LayoutGrid },
    { title: t('nav.sessions'), url: '/sessions', icon: History },
    { title: t('nav.settings'), url: '/settings', icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={isCollapsed ? item.title : undefined}>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/'}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={isCollapsed ? t('nav.newSession') : undefined}>
                  <NavLink 
                    to="/sessions/new"
                    className="flex items-center gap-3 px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    activeClassName="bg-primary/80"
                  >
                    <Play className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('nav.newSession')}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={isCollapsed ? t('nav.oneOnOne') : undefined}>
                  <NavLink 
                    to="/one-on-one"
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                    activeClassName="bg-accent text-accent-foreground font-medium"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t('nav.oneOnOne')}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}