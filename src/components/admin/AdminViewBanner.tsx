import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AdminViewBannerProps {
  dashboardType: 'driver' | 'owner';
}

export const AdminViewBanner = ({ dashboardType }: AdminViewBannerProps) => {
  const { userRole } = useAuth();
  
  // Only show banner when admin is viewing driver/owner dashboards
  if (userRole !== 'admin') {
    return null;
  }

  return (
    <Alert className="mb-6 border-warning bg-warning/10">
      <Eye className="h-4 w-4 text-warning" />
      <AlertDescription className="text-warning-foreground">
        <strong>Admin View - Read Only</strong> — You are viewing the {dashboardType} dashboard as an administrator. 
        Actions are disabled to prevent unintended modifications.
      </AlertDescription>
    </Alert>
  );
};
