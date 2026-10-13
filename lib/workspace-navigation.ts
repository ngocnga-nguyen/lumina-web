import type { LucideIcon } from "lucide-react";
import {
  Heart,
  Compass,
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
  void professionalId;
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
      href: "/dashboard/reviews",
      icon: Star,
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
  { id: "discover", label: "Discover", href: "/discover", icon: Compass },
  { id: "professionals", label: "Professionals", href: "/browse", icon: Users },
  { id: "saved", label: "Saved", href: "/saved", icon: Heart },
  { id: "requests", label: "My Requests", href: "/my-requests", icon: Inbox },
  { id: "overview", label: "Overview", href: "/client", icon: LayoutDashboard },
  { id: "messages", label: "Messages", href: "/client/messages", icon: MessageCircle },
  { id: "reviews", label: "Reviews", href: "/client/reviews", icon: Star },
  { id: "settings", label: "Profile / Settings", href: "/account", icon: Settings },
];
