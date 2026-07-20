import { useOnboardingStageToasts } from '@/hooks/useOnboardingStageToasts';

/** Mount once in the app tree (under AuthProvider). Fires congratulatory
 *  and failure-advice toasts whenever the user's registration stage changes. */
export function OnboardingStageToaster() {
  useOnboardingStageToasts();
  return null;
}

export default OnboardingStageToaster;
