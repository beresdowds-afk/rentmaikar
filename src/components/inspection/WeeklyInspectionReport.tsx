import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhotoUploadSlot } from './PhotoUploadSlot';
import { PhotoZoomModal } from './PhotoZoomModal';
import { useWeeklyInspection, PHOTO_TYPES, getWeekStartDate, type PhotoType } from '@/hooks/useWeeklyInspection';
import { Camera, Calendar, Clock, CheckCircle, AlertTriangle, History, Loader2 } from 'lucide-react';
import { format, parseISO, addDays, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';

interface WeeklyInspectionReportProps {
  vehicleId: string;
  vehicleName: string;
  ownerId?: string | null;
}

export function WeeklyInspectionReport({
  vehicleId,
  vehicleName,
  ownerId = null,
}: WeeklyInspectionReportProps) {
  const {
    reports,
    currentReport,
    settings,
    isLoading,
    uploadPhoto,
    createOrUpdateReport,
    submitReport,
  } = useWeeklyInspection(vehicleId);

  const [uploadingType, setUploadingType] = useState<PhotoType | null>(null);
  const [zoomModalOpen, setZoomModalOpen] = useState(false);
  const [zoomPhotoIndex, setZoomPhotoIndex] = useState(0);

  // Calculate progress
  const uploadedCount = PHOTO_TYPES.filter(pt => 
    currentReport?.[pt.key as keyof typeof currentReport]
  ).length;
  const progress = (uploadedCount / PHOTO_TYPES.length) * 100;
  const isComplete = uploadedCount === PHOTO_TYPES.length;
  const isSubmitted = !!currentReport?.submitted_at;

  // Check if overdue
  const weekStart = getWeekStartDate();
  const dueDate = addDays(parseISO(weekStart), 6); // Sunday
  const isOverdue = isAfter(new Date(), dueDate) && !isSubmitted;

  const handlePhotoUpload = async (photoType: PhotoType, file: File) => {
    setUploadingType(photoType);
    try {
      const url = await uploadPhoto(vehicleId, photoType, file);
      if (url) {
        await createOrUpdateReport(vehicleId, ownerId, photoType, url);
      }
    } finally {
      setUploadingType(null);
    }
  };

  const handleSubmit = async () => {
    if (currentReport) {
      await submitReport(currentReport.id);
    }
  };

  const handleZoom = (photoType: PhotoType) => {
    const index = PHOTO_TYPES.findIndex(pt => pt.key === photoType);
    setZoomPhotoIndex(index);
    setZoomModalOpen(true);
  };

  const getZoomPhotos = () => {
    if (!currentReport) return [];
    return PHOTO_TYPES.map(pt => ({
      url: currentReport[pt.key as keyof typeof currentReport] as string | null,
      label: pt.label,
      timestamp: currentReport.photo_timestamps?.[pt.key] || null,
    }));
  };

  if (!settings?.feature_enabled) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Weekly Reports Disabled</p>
          <p className="text-muted-foreground">
            The weekly inspection report feature is currently disabled.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground mt-2">Loading inspection data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Weekly Vehicle Inspection
              </CardTitle>
              <CardDescription>{vehicleName}</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isOverdue ? 'destructive' : isSubmitted ? 'default' : 'secondary'}>
                {isSubmitted ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Submitted</>
                ) : isOverdue ? (
                  <><AlertTriangle className="h-3 w-3 mr-1" /> Overdue</>
                ) : (
                  <><Clock className="h-3 w-3 mr-1" /> Due {format(dueDate, 'EEEE')}</>
                )}
              </Badge>
              <Badge variant="outline">
                {uploadedCount}/{PHOTO_TYPES.length} Photos
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Upload Progress</span>
              <span className={cn(
                isComplete ? 'text-green-600 font-medium' : 'text-muted-foreground'
              )}>
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Overdue Alert */}
      {isOverdue && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your weekly inspection report is overdue. Please upload all required photos and submit immediately.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">Upload Photos</TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {/* Photo Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Required Photos</CardTitle>
              <CardDescription>
                Upload all 10 photos showing the current condition of the vehicle.
                Each photo is timestamped automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {PHOTO_TYPES.map((pt) => (
                  <PhotoUploadSlot
                    key={pt.key}
                    label={pt.label}
                    description={pt.description}
                    photoUrl={currentReport?.[pt.key as keyof typeof currentReport] as string | undefined}
                    timestamp={currentReport?.photo_timestamps?.[pt.key]}
                    onUpload={(file) => handlePhotoUpload(pt.key, file)}
                    onZoom={() => handleZoom(pt.key)}
                    isUploading={uploadingType === pt.key}
                    disabled={isSubmitted}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          {!isSubmitted && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Ready to Submit?</p>
                    <p className="text-sm text-muted-foreground">
                      {isComplete 
                        ? 'All photos uploaded. Submit your weekly report.'
                        : `Upload ${PHOTO_TYPES.length - uploadedCount} more photo(s) to complete.`
                      }
                    </p>
                  </div>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!isComplete}
                    className="w-full sm:w-auto"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Weekly Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isSubmitted && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your weekly inspection report was submitted on{' '}
                {format(new Date(currentReport!.submitted_at!), 'MMM d, yyyy h:mm a')}.
                {currentReport?.status === 'pending' && ' Awaiting owner review.'}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submission History</CardTitle>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No previous inspection reports found.
                </p>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => {
                    const photoCount = PHOTO_TYPES.filter(pt => 
                      report[pt.key as keyof typeof report]
                    ).length;
                    
                    return (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">
                              Week of {format(parseISO(report.week_start_date), 'MMM d, yyyy')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {report.submitted_at 
                                ? `Submitted ${format(new Date(report.submitted_at), 'MMM d, h:mm a')}`
                                : 'Not submitted'
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{photoCount}/10 Photos</Badge>
                          <Badge 
                            variant={
                              report.status === 'approved' || report.status === 'completed' 
                                ? 'default' 
                                : report.status === 'pending' 
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {report.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Zoom Modal */}
      <PhotoZoomModal
        isOpen={zoomModalOpen}
        onClose={() => setZoomModalOpen(false)}
        photos={getZoomPhotos()}
        initialIndex={zoomPhotoIndex}
      />
    </div>
  );
}
