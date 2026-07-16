// Utilities to translate raw Supabase/Postgres errors from the registration
// flow into a friendly, actionable message for the UI. Kept in one place so
// both the driver and owner registration pages behave identically.

export type FriendlyRegistrationError = {
  title: string;
  description: string;
  isPermissionIssue: boolean;
  isDuplicate: boolean;
  raw: string;
};

export function classifyRegistrationError(
  err: unknown,
): FriendlyRegistrationError {
  const anyErr = err as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  } | null;
  const raw = [
    anyErr?.message,
    anyErr?.details,
    anyErr?.hint,
    anyErr?.code,
  ]
    .filter(Boolean)
    .join(' | ') || 'Unknown error';

  const lower = raw.toLowerCase();
  const isPermissionIssue =
    lower.includes('permission denied') ||
    lower.includes('row-level security') ||
    lower.includes('rls') ||
    lower.includes('not authorized') ||
    anyErr?.code === '42501' ||
    anyErr?.code === 'PGRST301';

  const isDuplicate =
    lower.includes('already has') ||
    lower.includes('pending application') ||
    lower.includes('duplicate') ||
    anyErr?.code === '23505' ||
    lower.includes('no_pending_application_for_email');

  if (isDuplicate) {
    return {
      title: 'Application already submitted',
      description:
        'We already have a pending application for this email address. Please check your inbox for our review update, or contact support if you think this is a mistake.',
      isPermissionIssue: false,
      isDuplicate: true,
      raw,
    };
  }

  if (isPermissionIssue) {
    return {
      title: 'Registration blocked by a permission check',
      description:
        'Your submission was rejected by our backend security rules. This is usually temporary — please tap Retry. If it keeps happening, contact support and share the code below so we can unblock your account.',
      isPermissionIssue: true,
      isDuplicate: false,
      raw,
    };
  }

  return {
    title: 'We couldn’t submit your registration',
    description:
      'Something went wrong on our side. Please tap Retry. If the problem persists, contact support with the code below.',
    isPermissionIssue: false,
    isDuplicate: false,
    raw,
  };
}
