"use client";

/**
 * Admin Sidebar Component
 *
 * Responsive navigation sidebar for admin pages.
 * Features:
 * - Collapsible to icon-only mode on desktop
 * - Converts to Sheet/drawer on mobile
 * - Auto-closes on mobile navigation
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  FileText,
  TrendingUp,
  ShieldCheck,
  FlaskConical,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const adminNavItems = [
  {
    title: "Analytics",
    url: "/admin",
    icon: BarChart3,
    description: "Costs & usage",
  },
  {
    title: "Playground",
    url: "/admin/playground",
    icon: FlaskConical,
    description: "Compare models",
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
    description: "Manage users",
  },
  {
    title: "Audit Logs",
    url: "/admin/audit",
    icon: FileText,
    description: "Activity logs",
  },
  {
    title: "Business",
    url: "/admin/business",
    icon: TrendingUp,
    description: "Projections",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    // Close mobile sidebar when navigating
    setOpenMobile(false);
  };

  const isActive = (url: string) => {
    if (url === "/admin") {
      return pathname === "/admin";
    }
    return pathname?.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon">
      {/* Header - matches main header height (h-14) */}
      <SidebarHeader className="h-14 flex items-center border-b border-[#E8E4E0]">
        <div className="flex items-center gap-2.5 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#B8956F] to-[#A07850] shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-[#1A1A1A] tracking-tight group-data-[collapsible=icon]:hidden">
            Admin Panel
          </span>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="h-auto py-3"
                    >
                      <Link href={item.url} onClick={handleNavClick}>
                        <item.icon className="h-4 w-4" />
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium">
                            {item.title}
                          </span>
                          <span className="text-xs text-[#9A9A9A] group-data-[active=true]:text-white/70">
                            {item.description}
                          </span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-[#E8E4E0]">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F2EF] rounded-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-medium text-[#6B6B6B] group-data-[collapsible=icon]:hidden">
            Admin Access Active
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
