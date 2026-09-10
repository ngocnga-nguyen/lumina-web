import ProfessionalDashboardShell from "@/components/ProfessionalDashboardShell";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProfessionalDashboardShell>{children}</ProfessionalDashboardShell>;
}
