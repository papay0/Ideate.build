"use client";

/**
 * App Sidebar Component
 *
 * Global navigation sidebar using shadcn/ui Sidebar.
 * Features:
 * - Collapsible to icon-only mode
 * - Keyboard shortcut (Cmd+B)
 * - Cookie persistence for state
 * - Mobile responsive (becomes sheet)
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings, Layers, Building2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useOrganizationContext } from "@/lib/hooks/useOrganizationContext";

const navigationItems = [
  {
    title: "Home",
    url: "/home",
    icon: Home,
  },
  {
    title: "Settings",
    url: "/home/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { context, currentOrg } = useOrganizationContext();

  const handleNavClick = () => {
    // Close mobile sidebar when navigating
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      {/* Header - Logo */}
      <SidebarHeader>
        <Link
          href="/home"
          onClick={handleNavClick}
          className="flex items-center gap-2.5 px-2 py-2 cursor-pointer hover:opacity-80 transition-opacity group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <Layers className="w-6 h-6 text-[#B8956F] shrink-0" />
          <span className="font-medium text-[#1A1A1A] tracking-tight group-data-[collapsible=icon]:hidden">
            Ideate
          </span>
        </Link>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.url} onClick={handleNavClick}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Organization section - only visible when in org context */}
        {context.type === 'organization' && currentOrg && (
          <SidebarGroup>
            <SidebarGroupLabel>Organization</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/home/organization/${context.organizationId}/settings`}
                    tooltip={currentOrg.name}
                  >
                    <Link
                      href={`/home/organization/${context.organizationId}/settings`}
                      onClick={handleNavClick}
                    >
                      <Building2 className="h-4 w-4" />
                      <span>{currentOrg.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
