import { describe, it, expect } from 'vitest';
import { deepLinkToPath, buildOnboardingDeepLink } from '@/lib/onboarding-deep-link';

describe('deepLinkToPath', () => {
  it('routes rentmaikar://onboarding to /onboarding-redirect', () => {
    expect(deepLinkToPath('rentmaikar://onboarding?step=documents')).toBe(
      '/onboarding-redirect?step=documents',
    );
  });
  it('preserves query strings across native + web variants', () => {
    const { web, native } = buildOnboardingDeepLink('driver', 'documents');
    expect(web).toBe('/driver/onboarding?step=documents');
    expect(native).toContain('step=documents');
    expect(native).toContain('role=driver');
  });
  it('email step lands on /verify-email on web', () => {
    expect(buildOnboardingDeepLink('driver', 'email').web).toBe('/verify-email');
  });
  it('owners get their own onboarding base', () => {
    expect(buildOnboardingDeepLink('owner', 'verification').web).toBe(
      '/owner/onboarding?step=verification',
    );
  });
});
