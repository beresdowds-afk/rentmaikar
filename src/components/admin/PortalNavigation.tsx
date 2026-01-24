import { ChevronDown, Building2, UsersRound, Headphones, LayoutGrid, Inbox, Phone, MessageSquare, UserCircle, HandshakeIcon, ClipboardList, Home, Car, MapPin, Cpu, Package, BarChart3, Tag, Wrench, WifiOff, Ban, Camera, Wallet, KeyRound, Settings, HelpCircle, FileText, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type PortalType = 'crm' | 'erp' | 'support';

export interface PortalTab {
  value: string;
  label: string;
  icon: React.ReactNode;
  dataTour?: string;
}

export const crmTabs: PortalTab[] = [
  { value: "applications", label: "Applications", icon: <UserPlus className="h-4 w-4" />, dataTour: "admin-applications" },
  { value: "accounts", label: "User Accounts", icon: <UserCircle className="h-4 w-4" />, dataTour: "admin-accounts" },
  { value: "negotiations", label: "Negotiations", icon: <HandshakeIcon className="h-4 w-4" />, dataTour: "admin-negotiations" },
  { value: "approvals", label: "Pending Approvals", icon: <ClipboardList className="h-4 w-4" /> },
  { value: "defaults", label: "Payment Defaults", icon: <Wallet className="h-4 w-4" /> },
  { value: "legal-agreements", label: "Legal Agreements", icon: <FileText className="h-4 w-4" />, dataTour: "admin-agreements" },
  { value: "rent-to-own", label: "Rent to Own", icon: <Home className="h-4 w-4" />, dataTour: "admin-rto" },
  { value: "content", label: "Content CMS", icon: <HelpCircle className="h-4 w-4" /> },
];

export const erpTabs: PortalTab[] = [
  { value: "tracking", label: "Vehicle Tracking", icon: <Car className="h-4 w-4" /> },
  { value: "assets", label: "Assets Registry", icon: <ClipboardList className="h-4 w-4" />, dataTour: "admin-assets" },
  { value: "pickup-locations", label: "Pickup Locations", icon: <MapPin className="h-4 w-4" /> },
  { value: "hardware", label: "Hardware", icon: <Cpu className="h-4 w-4" /> },
  { value: "device-orders", label: "Device Orders", icon: <Package className="h-4 w-4" />, dataTour: "admin-device-orders" },
  { value: "device-revenue", label: "Device Revenue", icon: <BarChart3 className="h-4 w-4" /> },
  { value: "pricing", label: "Category Pricing", icon: <Tag className="h-4 w-4" /> },
  { value: "incidents", label: "Incidents", icon: <Wrench className="h-4 w-4" />, dataTour: "admin-incidents" },
  { value: "recalls", label: "Vehicle Recalls", icon: <WifiOff className="h-4 w-4" /> },
  { value: "daily-plans", label: "Daily Plans", icon: <Ban className="h-4 w-4" /> },
  { value: "weekly-reports", label: "Weekly Reports", icon: <Camera className="h-4 w-4" />, dataTour: "admin-inspections" },
  { value: "fees", label: "Fee Structure", icon: <Wallet className="h-4 w-4" /> },
  { value: "secrets", label: "API Secrets", icon: <KeyRound className="h-4 w-4" /> },
  { value: "settings", label: "Region Settings", icon: <Settings className="h-4 w-4" /> },
];

export const supportTabs: PortalTab[] = [
  { value: "task-portal", label: "Task Portal", icon: <LayoutGrid className="h-4 w-4" />, dataTour: "admin-portal" },
  { value: "inbox", label: "Unified Inbox", icon: <Inbox className="h-4 w-4" />, dataTour: "admin-inbox" },
  { value: "call-center", label: "Call Center", icon: <Phone className="h-4 w-4" /> },
  { value: "contacts", label: "Contact Settings", icon: <MessageSquare className="h-4 w-4" />, dataTour: "admin-contacts" },
  { value: "support-tasks", label: "Support Tasks", icon: <Headphones className="h-4 w-4" /> },
];

interface PortalNavigationProps {
  activePortal: PortalType;
  activeTab: string;
  onPortalChange: (portal: PortalType) => void;
  onTabChange: (tab: string) => void;
}

export const PortalNavigation = ({
  activePortal,
  activeTab,
  onPortalChange,
  onTabChange,
}: PortalNavigationProps) => {
  const getTabsForPortal = (portal: PortalType): PortalTab[] => {
    switch (portal) {
      case 'crm': return crmTabs;
      case 'erp': return erpTabs;
      case 'support': return supportTabs;
    }
  };

  const getPortalIcon = (portal: PortalType) => {
    switch (portal) {
      case 'crm': return <UsersRound className="h-4 w-4" />;
      case 'erp': return <Building2 className="h-4 w-4" />;
      case 'support': return <Headphones className="h-4 w-4" />;
    }
  };

  const getPortalLabel = (portal: PortalType) => {
    switch (portal) {
      case 'crm': return 'CRM';
      case 'erp': return 'ERP';
      case 'support': return 'Support';
    }
  };

  const getPortalDescription = (portal: PortalType) => {
    switch (portal) {
      case 'crm': return 'Customer relationships & agreements';
      case 'erp': return 'Operations, assets & fleet management';
      case 'support': return 'Communications & task management';
    }
  };

  const currentTabs = getTabsForPortal(activePortal);
  const currentTabLabel = currentTabs.find(t => t.value === activeTab)?.label || 'Select...';

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Portal Buttons with Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        {(['crm', 'erp', 'support'] as PortalType[]).map((portal) => (
          <DropdownMenu key={portal}>
            <DropdownMenuTrigger asChild>
              <Button
                variant={activePortal === portal ? 'default' : 'outline'}
                className={cn(
                  "gap-2 min-w-[120px]",
                  activePortal === portal && "ring-2 ring-primary/20"
                )}
              >
                {getPortalIcon(portal)}
                {getPortalLabel(portal)}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover z-50">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {getPortalDescription(portal)}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {getTabsForPortal(portal).map((tab) => (
                <DropdownMenuItem
                  key={tab.value}
                  className={cn(
                    "cursor-pointer gap-2",
                    activePortal === portal && activeTab === tab.value && "bg-accent"
                  )}
                  onClick={() => {
                    onPortalChange(portal);
                    onTabChange(tab.value);
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      </div>

      {/* Current Selection Indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Current view:</span>
        <span className="font-medium text-foreground flex items-center gap-1.5">
          {getPortalIcon(activePortal)}
          {getPortalLabel(activePortal)} → {currentTabLabel}
        </span>
      </div>
    </div>
  );
};
