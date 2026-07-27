import { getCountries, getCountryCallingCode, getExampleNumber } from 'libphonenumber-js';
import examples from 'libphonenumber-js/examples.mobile.json.js';
import fs from 'fs';
const REGION_MAP = { US: 'USA', NG: 'Nigeria' };
const dn = new Intl.DisplayNames(['en'], { type: 'region' });
const rows = getCountries().map(iso => {
  const ex = getExampleNumber(iso, examples);
  return {
    iso2: iso,
    country_name: dn.of(iso) || iso,
    calling_code: '+' + getCountryCallingCode(iso),
    example_e164: ex?.number ?? null,
    example_national: ex?.formatNational() ?? null,
    region_label: REGION_MAP[iso] || null,
  };
});
const q = v => v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
const values = rows.map(r => `(${q(r.iso2)},${q(r.country_name)},${q(r.calling_code)},${q(r.example_e164)},${q(r.example_national)},${q(r.region_label)})`).join(',\n');
fs.writeFileSync('/tmp/phone_seed.sql', `INSERT INTO public.phone_reference (iso2,country_name,calling_code,example_e164,example_national,region_label) VALUES\n${values}\nON CONFLICT (iso2) DO UPDATE SET country_name=EXCLUDED.country_name, calling_code=EXCLUDED.calling_code, example_e164=EXCLUDED.example_e164, example_national=EXCLUDED.example_national, region_label=EXCLUDED.region_label, updated_at=now();`);
console.log('rows:', rows.length);
