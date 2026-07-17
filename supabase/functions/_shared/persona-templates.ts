// Universal Persona verification template IDs. Applied to every region.
// The three templates encapsulate the identity + proof-of-address checks
// tailored to each subject type; region no longer selects a template.
//
// Priority when resolving a template:
//   1. subject_role -> universal template ID (below)
//   2. persona_region_templates row (DB override, keyed by country_code)
//   3. PERSONA_TEMPLATE_ID_(NG|US) env override
//   4. PERSONA_TEMPLATE_ID / PERSONA_MASTER_TEMPLATE_ID env fallback

export type PersonaSubjectRole =
  | "driver"
  | "referee"
  | "owner"
  | "support_staff"
  | "admin_assistant"
  | "proxy";

export const PERSONA_TEMPLATE_IDS: Record<PersonaSubjectRole, string> = {
  driver: "ctmpl_As49Kz1UKtAYYEW9dPZmEeFiM12ty1",
  referee: "ctmpl_As49Kz14uVkobxDdh5gP4rYWavgfqs",
  owner: "ctmpl_As49Kz1JwTcfM32GH38WQda8xGy1Zs",
  support_staff: "ctmpl_As49Kz1JwTcfM32GH38WQda8xGy1Zs",
  admin_assistant: "ctmpl_As49Kz1JwTcfM32GH38WQda8xGy1Zs",
  // Proxy re-uses the referee template (same identity + address check profile)
  proxy: "ctmpl_As49Kz14uVkobxDdh5gP4rYWavgfqs",
};

export function templateForRole(role: PersonaSubjectRole | string | null | undefined): string | null {
  if (!role) return null;
  return (PERSONA_TEMPLATE_IDS as Record<string, string>)[role] ?? null;
}
