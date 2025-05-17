
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Wrench, Folder, FolderOpen, ArrowRight } from "lucide-react";
import { useLocation, Link } from "react-router-dom";

const sidebarSections = [
  { label: 'Requirements', path: '/', icon: LayoutDashboard },
  { label: 'Component Library', path: '/components', icon: Folder },
  { label: 'Design', path: '/design', icon: Wrench },
  { label: 'Configure', path: '/configure', icon: Settings },
  { label: 'Results', path: '/results', icon: FolderOpen },
  { label: 'Compare', path: '/compare', icon: ArrowRight },
];

export const AppSidebar: React.FC = () => {
  const location = useLocation();

  return (
    <Sidebar className="h-full border-r bg-white">
      <SidebarContent className="flex-1">
        <SidebarGroup>
          <SidebarGroupLabel>Infrastructure Tool</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/"}>
                  <Link to="/">
                    <LayoutDashboard className="mr-2" />
                    Requirements
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.startsWith("/components")}>
                  <Link to="/components">
                    <Folder className="mr-2"/>
                    Component Library
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.startsWith("/design")}>
                  <Link to="/design">
                    <Wrench className="mr-2"/>
                    Design
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.startsWith("/configure")}>
                  <Link to="/configure">
                    <Settings className="mr-2"/>
                    Configure
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.startsWith("/results")}>
                  <Link to="/results">
                    <FolderOpen className="mr-2"/>
                    Results
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.startsWith("/compare")}>
                  <Link to="/compare">
                    <ArrowRight className="mr-2"/>
                    Compare
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
