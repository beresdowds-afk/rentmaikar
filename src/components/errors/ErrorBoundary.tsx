import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/error-monitor";

const RECOVERY_KEY = "rmk_bundle_recovery";

/** Detects crashes caused by a stale HTML shell referencing deleted chunks. */
export function isStaleBundleError(error: unknown): boolean {
  const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk|Failed to fetch dynamically/i.test(
    msg,
  );
}

/** Evict service workers + caches, then reload with a cache-busting param. */
export async function hardReload() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* best effort */
  }
  const url = new URL(window.location.href);
  url.searchParams.set("_r", Date.now().toString(36));
  window.location.replace(url.toString());
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    reportError(error, "critical", "ErrorBoundary", {
      componentStack: errorInfo.componentStack?.slice(0, 1000),
    });

    // A stale cached index.html pointing at deleted asset chunks makes lazy
    // routes throw "Failed to fetch dynamically imported module". Self-heal
    // once by evicting caches/service workers and reloading fresh.
    if (isStaleBundleError(error) && !sessionStorage.getItem(RECOVERY_KEY)) {
      sessionStorage.setItem(RECOVERY_KEY, "1");
      void hardReload();
    }
  }

  handleRetry = () => {
    void hardReload();
  };
  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
              <p className="text-muted-foreground">
                An unexpected error occurred. Please try again or return to the homepage.
              </p>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs bg-muted p-4 rounded-lg overflow-auto max-h-40 text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleRetry} variant="default" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Button>
           
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
export default ErrorBoundary;
