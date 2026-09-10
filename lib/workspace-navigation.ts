import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  GitCompareArrows,
  Heart,
  Images,
  Inbox,
  LayoutDashboard,
  MessageCircle,
  Scissors,
  Settings,
  Star,
  Users,
} from "lucide-react";

export type WorkspaceNavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  supportingText?: string;
  external?: boolean;
};

export function getProfessionalWorkspaceNavigation(
  professionalId?: string | null
): WorkspaceNavigationItem[] {
  return [
    { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { id: "requests", label: "Requests", href: "/dashboard/requests", icon: Inbox },
    { id: "clients", label: "Clients", href: "/dashboard/clients", icon: Users },
    { id: "services", label: "Services", href: "/dashboard/services", icon: Scissors },
    {
      id: "portfolio",
      label: "Portfolio / Results",
      href: "/dashboard/portfolio",
      icon: Images,
    },
    {
      id: "reviews",
      label: "Reviews",
      href: professionalId
        ? `/artist/${professionalId}?tab=reviews`
        : "/dashboard",
      icon: Star,
      external: true,
    },
    {
      id: "messages",
      label: "Messages",
      href: "/dashboard/messages",
      icon: MessageCircle,
    },
    { id: "settings", label: "Settings", href: "/dashboard/settings", icon: Settings },
  ];
}

export const clientWorkspaceNavigation: WorkspaceNavigationItem[] = [
  { id: "overview", label: "Overview", href: "/client", icon: LayoutDashboard },
  {
    id: "requests",
    label: "My Requests",
    href: "/my-requests",
    icon: Bookmark,
  },
  { id: "messages", label: "Messages", href: "/client/messages", icon: MessageCircle },
  { id: "saved", label: "Saved", href: "/saved", icon: Heart },
  {
    id: "compare",
    label: "Compare",
    href: "/saved#compare",
    icon: GitCompareArrows,
    supportingText: "In Saved",
  },
  {
    id: "reviews",
    label: "Reviews",
    href: "/my-requests",
    icon: Star,
    supportingText: "After completion",
  },
  { id: "settings", label: "Profile / Settings", href: "/account", icon: Settings },
];
