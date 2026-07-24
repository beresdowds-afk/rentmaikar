import * as React from 'react';
import PhoneInputBase, { type Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '@/styles/phone-input.css';
import { cn } from '@/lib/utils';
import { useDefaultPhoneCountry } from '@/hooks/useDefaultPhoneCountry';

export interface PhoneNumberInputProps {
  /** E.164 value, e.g. "+2348012345678". */
  value?: string;
  onChange: (value: string) => void;
  /** Default ISO country when the value doesn't yet include a calling code. */
  defaultCountry?: Country;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
  'aria-invalid'?: boolean;
}

/**
 * Region-aware phone input with an IDD (international dialing code) country
 * selector. Emits E.164 formatted values on change. Country list, flags and
 * per-country formatting come from libphonenumber-js.
 */
export const PhoneNumberInput = React.forwardRef<HTMLInputElement, PhoneNumberInputProps>(
  (
    {
      value,
      onChange,
      defaultCountry = 'US',
      placeholder = 'Enter phone number',
      disabled,
      className,
      id,
      name,
      autoComplete = 'tel',
      ...rest
    },
    ref,
  ) => {
    return (
      <PhoneInputBase
        international
        countryCallingCodeEditable={false}
        defaultCountry={defaultCountry}
        value={value || undefined}
        onChange={(v) => onChange((v as string) || '')}
        disabled={disabled}
        placeholder={placeholder}
        numberInputProps={{
          ref: ref as React.Ref<HTMLInputElement>,
          id,
          name,
          autoComplete,
          'aria-invalid': rest['aria-invalid'],
          className:
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        }}
        className={cn('phone-number-input flex items-center gap-2', className)}
      />
    );
  },
);
PhoneNumberInput.displayName = 'PhoneNumberInput';

export default PhoneNumberInput;
