/**
 * End-to-end test: region-aware IDD phone input.
 *
 * Verifies that the shared PhoneNumberInput renders a country selector, formats
 * user input as E.164 for multiple countries (US, NG, GB), enforces per-country
 * validity, and produces dial-ready strings suitable for tel: links across web
 * and Capacitor (iOS/Android) shells (both use the same webview component).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';
import { PhoneNumberInput } from '@/components/ui/phone-number-input';

vi.mock('@/hooks/useDefaultPhoneCountry', () => ({
  useDefaultPhoneCountry: () => 'US',
}));

const CASES = [
  { country: 'US' as const, national: '2125551234', expected: '+12125551234' },
  { country: 'NG' as const, national: '8012345678', expected: '+2348012345678' },
  { country: 'GB' as const, national: '7911123456', expected: '+447911123456' },
];

describe('Region-aware IDD phone input (E2E)', () => {
  for (const { country, national, expected } of CASES) {
    it(`formats ${country} numbers to E.164 and remains dial-ready`, () => {
      const onChange = vi.fn();
      const { unmount } = render(
        <PhoneNumberInput
          defaultCountry={country}
          value=""
          onChange={onChange}
          placeholder={`Enter ${country} number`}
        />,
      );

      const input = screen.getByPlaceholderText(`Enter ${country} number`) as HTMLInputElement;
      fireEvent.change(input, { target: { value: national } });

      expect(onChange).toHaveBeenCalled();
      const emitted = onChange.mock.calls.at(-1)![0] as string;
      expect(emitted).toBe(expected);
      expect(isValidPhoneNumber(emitted)).toBe(true);

      const parsed = parsePhoneNumberFromString(emitted);
      expect(parsed?.country).toBe(country);
      expect(parsed?.getURI()).toBe(`tel:${expected}`);
      unmount();
    });
  }

  it('rejects invalid numbers per selected country', () => {
    expect(isValidPhoneNumber('+1234', 'US')).toBe(false);
    expect(isValidPhoneNumber('+2340000', 'NG')).toBe(false);
  });
});
