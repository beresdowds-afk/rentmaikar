import {
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumber
} from "libphonenumber-js";

import examples from "libphonenumber-js/examples.mobile.json.js";
import fs from "fs";

const ACTIVE_REGIONS = {
  NG: true,
  US: true
};

const displayNames = new Intl.DisplayNames(
  ["en"],
  { type: "region" }
);

const rows = getCountries().map((iso) => {

  const example = getExampleNumber(iso, examples);

  let nationalExample = null;
  let internationalExample = null;
  let e164Example = null;
  let nationalDigits = null;

  if (example) {
    nationalExample = example.formatNational();
    internationalExample = example.formatInternational();
    e164Example = example.number;
    nationalDigits = example.nationalNumber;
  }

  return {

    // Primary Key
    iso2: iso,

    // Display
    country_name: displayNames.of(iso) ?? iso,

    // Dialing
    calling_code: "+" + getCountryCallingCode(iso),

    // Examples
    example_e164: e164Example,
    example_national: nationalExample,
    example_international: internationalExample,
    example_digits: nationalDigits,

    // Business Region
    is_active_region: !!ACTIVE_REGIONS[iso],

    // Admin Region Builder
    region_status: ACTIVE_REGIONS[iso]
      ? "ACTIVE"
      : "AVAILABLE",

    // Future-proof
    validation_library: "libphonenumber-js",
    supports_phone_validation: true
  };

});

const quote = (v) =>
  v == null
    ? "NULL"
    : `'${String(v).replace(/'/g, "''")}'`;

const values = rows.map(r => `(
${quote(r.iso2)},
${quote(r.country_name)},
${quote(r.calling_code)},
${quote(r.example_e164)},
${quote(r.example_national)},
${quote(r.example_international)},
${quote(r.example_digits)},
${r.is_active_region},
${quote(r.region_status)},
${quote(r.validation_library)},
${r.supports_phone_validation}
)`).join(",\n");

const sql = `
INSERT INTO public.phone_reference (

iso2,
country_name,
calling_code,

example_e164,
example_national,
example_international,
example_digits,

is_active_region,
region_status,

validation_library,
supports_phone_validation

)
VALUES

${values}

ON CONFLICT (iso2)
DO UPDATE SET

country_name=EXCLUDED.country_name,
calling_code=EXCLUDED.calling_code,

example_e164=EXCLUDED.example_e164,
example_national=EXCLUDED.example_national,
example_international=EXCLUDED.example_international,
example_digits=EXCLUDED.example_digits,

is_active_region=EXCLUDED.is_active_region,
region_status=EXCLUDED.region_status,

validation_library=EXCLUDED.validation_library,
supports_phone_validation=EXCLUDED.supports_phone_validation,

updated_at=NOW();
`;

fs.writeFileSync("/tmp/phone_seed.sql", sql);

console.log(`Generated ${rows.length} countries`);
