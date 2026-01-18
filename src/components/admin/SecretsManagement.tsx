import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Key, 
  Shield, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ExternalLink,
  Phone,
  Mail,
  CreditCard,
  AlertTriangle,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface SecretConfig {
  name: string;
  displayName: string;
  description: string;
  category: "sms" | "email" | "payment" | "system";
  testable: boolean;
  docsUrl?: string;
}

const secrets: SecretConfig[] = [
  // SMS/WhatsApp
  {
    name: "TWILIO_ACCOUNT_SID",
    displayName: "Twilio Account SID",
    description: "Your Twilio account identifier for SMS and WhatsApp messaging",
    category: "sms",
    testable: true,
    docsUrl: "https://www.twilio.com/docs/usage/api",
  },
  {
    name: "TWILIO_AUTH_TOKEN",
    displayName: "Twilio Auth Token",
    description: "Authentication token for Twilio API access",
    category: "sms",
    testable: true,
    docsUrl: "https://www.twilio.com/docs/usage/api",
  },
  {
    name: "TWILIO_PHONE_NUMBER",
    displayName: "Twilio Phone Number",
    description: "The phone number used to send SMS messages",
    category: "sms",
    testable: true,
    docsUrl: "https://www.twilio.com/docs/phone-numbers",
  },
  // Email
  {
    name: "RESEND_API_KEY",
    displayName: "Resend API Key",
    description: "API key for sending transactional emails via Resend",
    category: "email",
    testable: true,
    docsUrl: "https://resend.com/docs/api-reference/introduction",
  },
  // Payment - PayPal (USA)
  {
    name: "PAYPAL_CLIENT_ID",
    displayName: "PayPal Client ID",
    description: "PayPal REST API client ID for USA payment processing",
    category: "payment",
    testable: false,
    docsUrl: "https://developer.paypal.com/api/rest/",
  },
  {
    name: "PAYPAL_CLIENT_SECRET",
    displayName: "PayPal Client Secret",
    description: "PayPal REST API secret key for authentication",
    category: "payment",
    testable: false,
    docsUrl: "https://developer.paypal.com/api/rest/",
  },
  // Payment - Paystack (Nigeria)
  {
    name: "PAYSTACK_SECRET_KEY",
    displayName: "Paystack Secret Key",
    description: "Paystack secret key for Nigeria payment processing",
    category: "payment",
    testable: false,
    docsUrl: "https://paystack.com/docs/api/",
  },
  {
    name: "PAYSTACK_PUBLIC_KEY",
    displayName: "Paystack Public Key",
    description: "Paystack public key for client-side integration",
    category: "payment",
    testable: false,
    docsUrl: "https://paystack.com/docs/api/",
  },
];

const categoryConfig = {
  sms: { icon: Phone, label: "SMS/WhatsApp", color: "bg-blue-500", region: null },
  email: { icon: Mail, label: "Email", color: "bg-green-500", region: null },
  payment: { icon: CreditCard, label: "Payment Gateways", color: "bg-purple-500", region: null },
  system: { icon: Shield, label: "System", color: "bg-gray-500", region: null },
};

export function SecretsManagement() {
  const [testingSecret, setTestingSecret] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "success" | "error" | null>>({});
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testEmail, setTestEmail] = useState("");

  const testTwilioSecrets = async () => {
    if (!testPhone) {
      toast.error("Please enter a phone number");
      return;
    }

    setTestingSecret("TWILIO");
    try {
      const { error } = await supabase.functions.invoke("send-sms-notification", {
        body: {
          phone: testPhone,
          channel: "sms",
          notificationType: "general",
          customMessage: "This is a test message from Rentmaikar admin panel. Your Twilio configuration is working correctly!",
        },
      });

      if (error) throw error;

      setTestResults((prev) => ({
        ...prev,
        TWILIO_ACCOUNT_SID: "success",
        TWILIO_AUTH_TOKEN: "success",
        TWILIO_PHONE_NUMBER: "success",
      }));
      toast.success("Test SMS sent successfully!");
      setTestDialogOpen(false);
    } catch (error: any) {
      setTestResults((prev) => ({
        ...prev,
        TWILIO_ACCOUNT_SID: "error",
        TWILIO_AUTH_TOKEN: "error",
        TWILIO_PHONE_NUMBER: "error",
      }));
      toast.error(`Twilio test failed: ${error.message}`);
    } finally {
      setTestingSecret(null);
    }
  };

  const testResendSecret = async () => {
    if (!testEmail) {
      toast.error("Please enter an email address");
      return;
    }

    setTestingSecret("RESEND_API_KEY");
    try {
      const { error } = await supabase.functions.invoke("send-approval-notification", {
        body: {
          email: testEmail,
          name: "Admin Test",
          userType: "driver",
          region: "USA",
        },
      });

      if (error) throw error;

      setTestResults((prev) => ({ ...prev, RESEND_API_KEY: "success" }));
      toast.success("Test email sent successfully!");
      setTestDialogOpen(false);
    } catch (error: any) {
      setTestResults((prev) => ({ ...prev, RESEND_API_KEY: "error" }));
      toast.error(`Resend test failed: ${error.message}`);
    } finally {
      setTestingSecret(null);
    }
  };

  const getStatusBadge = (secretName: string) => {
    const result = testResults[secretName];
    if (result === "success") {
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    }
    if (result === "error") {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-muted">
        <Key className="w-3 h-3 mr-1" />
        Configured
      </Badge>
    );
  };

  const groupedSecrets = secrets.reduce((acc, secret) => {
    if (!acc[secret.category]) acc[secret.category] = [];
    acc[secret.category].push(secret);
    return acc;
  }, {} as Record<string, SecretConfig[]>);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">API Secrets Management</h2>
        <p className="text-muted-foreground">
          View and test configured API keys for third-party services
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Security Notice</AlertTitle>
        <AlertDescription>
          API secrets are securely stored and cannot be viewed or edited directly from this panel. 
          To update a secret, please contact your system administrator or use the Lovable dashboard 
          to modify Cloud secrets.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {Object.entries(groupedSecrets).map(([category, categorySecrets]) => {
          const config = categoryConfig[category as keyof typeof categoryConfig];
          const CategoryIcon = config.icon;

          return (
            <Card key={category}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center`}>
                    <CategoryIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{config.label} Services</CardTitle>
                    <CardDescription>
                      {categorySecrets.length} secret{categorySecrets.length > 1 ? "s" : ""} configured
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categorySecrets.map((secret) => (
                    <div
                      key={secret.name}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{secret.displayName}</p>
                          {getStatusBadge(secret.name)}
                        </div>
                        <p className="text-sm text-muted-foreground">{secret.description}</p>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">{secret.name}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        {secret.docsUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(secret.docsUrl, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {category === "sms" && (
                    <Dialog open={testDialogOpen && testingSecret === "TWILIO"} onOpenChange={setTestDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setTestDialogOpen(true)}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Test Twilio Configuration
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Test Twilio SMS</DialogTitle>
                          <DialogDescription>
                            Enter a phone number to receive a test SMS message.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="test-phone">Phone Number</Label>
                            <Input
                              id="test-phone"
                              placeholder="+12025550123"
                              value={testPhone}
                              onChange={(e) => setTestPhone(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Use international format (e.g., +1 for USA, +234 for Nigeria)
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={testTwilioSecrets} disabled={testingSecret === "TWILIO"}>
                            {testingSecret === "TWILIO" ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Phone className="w-4 h-4 mr-2" />
                                Send Test SMS
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  {category === "email" && (
                    <Dialog open={testDialogOpen && testingSecret === "RESEND_API_KEY"} onOpenChange={setTestDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setTestingSecret("RESEND_API_KEY");
                            setTestDialogOpen(true);
                          }}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Test Resend Configuration
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Test Resend Email</DialogTitle>
                          <DialogDescription>
                            Enter an email address to receive a test email.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="test-email">Email Address</Label>
                            <Input
                              id="test-email"
                              type="email"
                              placeholder="test@example.com"
                              value={testEmail}
                              onChange={(e) => setTestEmail(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={testResendSecret} disabled={testingSecret === "RESEND_API_KEY"}>
                            {testingSecret === "RESEND_API_KEY" ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Mail className="w-4 h-4 mr-2" />
                                Send Test Email
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            How to Update Secrets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To update API secrets, follow these steps:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Open the Lovable chat interface</li>
            <li>Request to update the specific secret (e.g., "Update my Twilio API key")</li>
            <li>Lovable will provide a secure form to enter the new value</li>
            <li>Submit the form to update the secret</li>
            <li>Return here to test the new configuration</li>
          </ol>
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Available Secrets:</p>
            <div className="flex flex-wrap gap-2">
              {secrets.map((s) => (
                <code key={s.name} className="text-xs bg-muted px-2 py-1 rounded">
                  {s.name}
                </code>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
