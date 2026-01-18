import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  Wrench, 
  Car, 
  Shield,
  Clock,
  MapPin,
  Loader2,
  Camera,
  Send,
  Info
} from 'lucide-react';

type IncidentType = 'accident' | 'maintenance' | 'breakdown' | 'theft' | 'other';
type Severity = 'low' | 'medium' | 'high' | 'critical';

interface IncidentReportFormProps {
  vehicleId: string;
  vehicleName?: string;
  ownerId?: string;
  onSuccess?: () => void;
}

const incidentTypes: { value: IncidentType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'accident', label: 'Accident', icon: <AlertTriangle className="h-4 w-4" />, description: 'Collision or crash incident' },
  { value: 'maintenance', label: 'Maintenance', icon: <Wrench className="h-4 w-4" />, description: 'Scheduled or required maintenance' },
  { value: 'breakdown', label: 'Breakdown', icon: <Car className="h-4 w-4" />, description: 'Vehicle stopped working' },
  { value: 'theft', label: 'Theft/Security', icon: <Shield className="h-4 w-4" />, description: 'Theft or security incident' },
  { value: 'other', label: 'Other', icon: <Info className="h-4 w-4" />, description: 'Other incidents' },
];

const severityLevels: { value: Severity; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-yellow-500' },
  { value: 'medium', label: 'Medium', color: 'bg-orange-500' },
  { value: 'high', label: 'High', color: 'bg-red-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-700' },
];

export function IncidentReportForm({ vehicleId, vehicleName, ownerId, onSuccess }: IncidentReportFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incidentType, setIncidentType] = useState<IncidentType | ''>('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [location, setLocation] = useState('');
  const [estimatedDowntime, setEstimatedDowntime] = useState('');

  // Check if report would be late (more than 1 hour after occurrence)
  const isLateReport = occurredAt ? 
    (new Date().getTime() - new Date(occurredAt).getTime()) / (1000 * 60 * 60) > 1 : 
    false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id || !incidentType) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!occurredAt) {
      toast.error('Please specify when the incident occurred');
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert incident record
      const { data: incident, error: insertError } = await supabase
        .from('vehicle_incidents')
        .insert({
          vehicle_id: vehicleId,
          driver_id: user.id,
          owner_id: ownerId || null,
          incident_type: incidentType,
          severity,
          title: title.trim(),
          description: description.trim(),
          occurred_at: new Date(occurredAt).toISOString(),
          location_address: location.trim() || null,
          estimated_downtime_hours: estimatedDowntime ? parseInt(estimatedDowntime) : null,
          is_iot_detected: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Send notification to admin and owner
      try {
        await supabase.functions.invoke('send-incident-notification', {
          body: {
            incidentId: incident.id,
            incidentType,
            severity,
            vehicleId,
            driverId: user.id,
            ownerId,
            title: title.trim(),
            description: description.trim(),
            isIotDetected: false,
            isLateReport,
            location: location.trim() || undefined,
          },
        });
      } catch (notifError) {
        console.error('[IncidentReport] Notification failed:', notifError);
        // Don't fail the whole submission if notification fails
      }

      toast.success('Incident reported successfully', {
        description: isLateReport 
          ? 'Note: This report was submitted more than 1 hour after the incident.'
          : 'Admin and owner have been notified.',
      });

      // Reset form
      setIncidentType('');
      setTitle('');
      setDescription('');
      setOccurredAt('');
      setLocation('');
      setEstimatedDowntime('');
      setSeverity('medium');

      onSuccess?.();
    } catch (error) {
      console.error('[IncidentReport] Error:', error);
      toast.error('Failed to submit incident report');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current datetime in local format for max attribute
  const now = new Date();
  const maxDateTime = now.toISOString().slice(0, 16);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <CardTitle>Report Incident</CardTitle>
            <CardDescription>
              {vehicleName ? `For ${vehicleName}` : 'Report maintenance or accident'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1-Hour Requirement Alert */}
          <Alert className="bg-orange-500/10 border-orange-500/30">
            <Clock className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-orange-700">
              <strong>Drivers must report incidents within 1 hour of occurrence.</strong> Late reports will be flagged.
            </AlertDescription>
          </Alert>

          {/* Late Report Warning */}
          {isLateReport && (
            <Alert variant="destructive" className="bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Late Report Warning:</strong> This incident occurred more than 1 hour ago. 
                Your report will be flagged as late.
              </AlertDescription>
            </Alert>
          )}

          {/* Incident Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Incident Type *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {incidentTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setIncidentType(type.value)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    incidentType === type.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {type.icon}
                    <span className="font-medium">{type.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label htmlFor="severity" className="text-base font-semibold">Severity *</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {severityLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${level.color}`} />
                      {level.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the incident"
              maxLength={100}
              required
            />
          </div>

          {/* When it occurred */}
          <div className="space-y-2">
            <Label htmlFor="occurred-at" className="text-base font-semibold">
              When did this occur? *
            </Label>
            <Input
              id="occurred-at"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              max={maxDateTime}
              required
            />
            {occurredAt && (
              <p className="text-xs text-muted-foreground">
                {isLateReport ? (
                  <span className="text-destructive">⚠️ More than 1 hour ago</span>
                ) : (
                  <span className="text-green-600">✓ Within 1 hour - on time</span>
                )}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-semibold">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about what happened, any damage, injuries, etc."
              rows={4}
              maxLength={1000}
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/1000
            </p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Address or location description"
              maxLength={200}
            />
          </div>

          {/* Estimated Downtime */}
          <div className="space-y-2">
            <Label htmlFor="downtime" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Estimated Downtime (hours)
            </Label>
            <Input
              id="downtime"
              type="number"
              value={estimatedDowntime}
              onChange={(e) => setEstimatedDowntime(e.target.value)}
              placeholder="Expected hours vehicle will be out of service"
              min="0"
              max="720"
            />
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={!incidentType || !title || !description || !occurredAt || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Incident Report
                {isLateReport && <Badge variant="destructive" className="ml-2">Late</Badge>}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
