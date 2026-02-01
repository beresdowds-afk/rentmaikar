import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DollarSign, Edit, Shield, Loader2 } from "lucide-react";

interface SecurityDepositSetting {
  id: string;
  region: string;
  amount: number;
  currency: string;
  description: string | null;
  is_active: boolean;
  updated_at: string;
}

const SecurityDepositManagement = () => {
  const queryClient = useQueryClient();
  const [editingDeposit, setEditingDeposit] = useState<SecurityDepositSetting | null>(null);
  const [editForm, setEditForm] = useState({
    amount: "",
    description: "",
    is_active: true,
  });

  const { data: deposits, isLoading } = useQuery({
    queryKey: ['security-deposit-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_deposit_settings')
        .select('*')
        .order('region');
      
      if (error) throw error;
      return data as SecurityDepositSetting[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: { id: string; amount: number; description: string | null; is_active: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('security_deposit_settings')
        .update({
          amount: values.amount,
          description: values.description,
          is_active: values.is_active,
          updated_by: user?.id,
        })
        .eq('id', values.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-deposit-settings'] });
      toast.success("Security deposit updated successfully");
      setEditingDeposit(null);
    },
    onError: (error) => {
      console.error("Error updating security deposit:", error);
      toast.error("Failed to update security deposit");
    },
  });

  const handleEdit = (deposit: SecurityDepositSetting) => {
    setEditingDeposit(deposit);
    setEditForm({
      amount: deposit.amount.toString(),
      description: deposit.description || "",
      is_active: deposit.is_active,
    });
  };

  const handleSave = () => {
    if (!editingDeposit) return;
    
    const amount = parseFloat(editForm.amount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    updateMutation.mutate({
      id: editingDeposit.id,
      amount,
      description: editForm.description || null,
      is_active: editForm.is_active,
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Security Deposit Settings
          </CardTitle>
          <CardDescription>
            Configure security deposit amounts required for driver registration by region
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deposits?.map((deposit) => (
                <TableRow key={deposit.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {deposit.region === 'USA' ? '🇺🇸' : '🇳🇬'}
                      {deposit.region}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      {formatCurrency(deposit.amount, deposit.currency)}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {deposit.description || '-'}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      deposit.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {deposit.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(deposit.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(deposit)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingDeposit} onOpenChange={() => setEditingDeposit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit Security Deposit - {editingDeposit?.region === 'USA' ? '🇺🇸 USA' : '🇳🇬 Nigeria'}
            </DialogTitle>
            <DialogDescription>
              Update the security deposit amount for {editingDeposit?.region} drivers
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({editingDeposit?.currency})</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {editingDeposit?.currency === 'USD' ? '$' : '₦'}
                </span>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-8"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Security deposit for driver registration..."
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDeposit(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SecurityDepositManagement;
