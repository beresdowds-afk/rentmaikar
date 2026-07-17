import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2, ScrollText } from 'lucide-react';

interface Props {
  applicationId: string;
}

interface AuditRow {
  id: string;
  action: string;
  actor_id: string | null;
  actor_role: string | null;
  changed: any;
  details: any;
  created_at: string;
}

export const ApplicationAuditLog = ({ applicationId }: Props) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['application_audit_log', applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('application_audit_log')
        .select('id, action, actor_id, actor_role, changed, details, created_at')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AuditRow[];
    },
  });

  return (
    <section className="space-y-2 border-t pt-3">
      <h4 className="font-semibold flex items-center gap-2">
        <ScrollText className="h-4 w-4" /> Audit trail
      </h4>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
        </div>
      ) : error ? (
        <div className="text-sm text-destructive">Unable to load audit log.</div>
      ) : !data?.length ? (
        <div className="text-sm text-muted-foreground">No audit entries yet.</div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {data.map((row) => (
            <div key={row.id} className="p-2 rounded border bg-muted/40 text-xs">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] uppercase">{row.action}</Badge>
                {row.actor_role && (
                  <Badge variant="secondary" className="text-[10px]">{row.actor_role}</Badge>
                )}
                <span className="text-muted-foreground ml-auto">
                  {format(new Date(row.created_at), 'MMM dd, yyyy HH:mm:ss')}
                </span>
              </div>
              {row.actor_id && (
                <div className="text-muted-foreground truncate">Actor: {row.actor_id}</div>
              )}
              {row.changed && Object.keys(row.changed || {}).length > 0 && (
                <pre className="whitespace-pre-wrap break-all text-[11px] mt-1">
                  {JSON.stringify(row.changed, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ApplicationAuditLog;
