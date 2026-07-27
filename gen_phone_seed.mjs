import { getCountries, getCountryCallingCode } from 'libphonenumber-js';
import examples from 'libphonenumber-js/examples.mobile.json' with { type: 'json' };
import { getExampleNumber } from 'libphonenumber-js';

const REGION_MAP = { US: 'USA', NG: 'Nigeria' };
const countries = getCountries();
const rows = [];
// ISO country names
const dn = new Intl.DisplayNames(['en'], { type: 'region' });
for (const iso of countries) {
  const cc = '+' + getCountryCallingCode(iso);
  const ex = getExampleNumber(iso, examples);
  rows.push({
    iso2: iso,
    country_name: dn.of(iso) || iso,
    calling_code: cc,
    example_e164: ex ? ex.number : null,
    example_national: ex ? ex.formatNational() : null,
    region_label: REGION_MAP[iso] || null,
  });
}
const values = rows.map(r => {
  const q = (v) => v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
  return `(${q(r.iso2)},${q(r.country_name)},${q(r.calling_code)},${q(r.example_e164)},${q(r.example_national)},${q(r.region_label)})`;
}).join(',\n');
const sql = `INSERT INTO public.phone_reference (iso2,country_name,calling_code,example_e164,example_national,region_label) VALUES\n${values}\nON CONFLICT (iso2) DO UPDATE SET country_name=EXCLUDED.country_name, calling_code=EXCLUDED.calling_code, example_e164=EXCLUDED.example_e164, example_national=EXCLUDED.example_national, region_label=EXCLUDED.region_label, updated_at=now();`;
import('fs').then(fs => fs.writeFileSync('/tmp/phone_seed.sql', sql));
console.log('rows:', rows.length);
