import { MessageSquare } from 'lucide-react';
import Seo from '@/components/seo/Seo';
import { MessagingCenter } from '@/components/admin/MessagingCenter';

/** Standalone route for the central messaging center. */
export default function MessagingCenterPage() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <Seo
        title="Messaging Center | Rentmaikar Admin"
        description="Draft, send, respond to and review email, SMS and WhatsApp messages from one place."
        path="/admin/messaging"
      />
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <MessageSquare className="h-6 w-6 text-primary" /> Messaging Center
        </h1>
        <p className="text-sm text-muted-foreground">
          One place for every conversation — email, SMS and WhatsApp.
        </p>
      </header>
      <MessagingCenter />
    </div>
  );
}
