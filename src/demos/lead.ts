import type { Lead } from './types';

// Every form names its fields differently. Map them all to one schema.
const ALIASES: Record<string, keyof Lead> = {
  email: 'email',
  email_address: 'email',
  e_mail: 'email',
  mail: 'email',
  name: 'name',
  full_name: 'name',
  fullname: 'name',
  company: 'company',
  company_name: 'company',
  organization: 'company',
  title: 'title',
  job_title: 'title',
  position: 'title',
  phone: 'phone',
  phone_number: 'phone',
  tel: 'phone',
};

export function normalizeLead(raw: Record<string, unknown>): { lead: Lead; fixes: string[] } {
  const lead: Lead = {};
  const fixes: string[] = [];

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    const normalizedKey = key
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    const field = ALIASES[normalizedKey];
    if (!field) {
      fixes.push(`dropped unknown field "${key}"`);
      continue;
    }
    if (key !== field) fixes.push(`"${key}" → ${field}`);

    let text = String(value).trim().replace(/\s+/g, ' ');
    if (text !== String(value)) fixes.push(`trimmed ${field}`);
    if (field === 'email' && text !== text.toLowerCase()) {
      text = text.toLowerCase();
      fixes.push('lowercased email');
    }
    if (field === 'phone') {
      const digits = text.replace(/[^\d+]/g, '');
      if (digits !== text) fixes.push('cleaned phone');
      text = digits;
    }
    if (text) lead[field] = text;
  }

  return { lead, fixes };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function validateLead(lead: Lead): string[] {
  const errors: string[] = [];
  if (!lead.email) errors.push('email is required');
  else if (!EMAIL.test(lead.email)) errors.push(`"${lead.email}" is not a valid email`);
  if (!lead.name) errors.push('name is required');
  if (lead.phone && !/^\+?\d{7,15}$/.test(lead.phone)) errors.push('phone must have 7-15 digits');
  return errors;
}

// The email is the identity: the same person sent twice gets the same fingerprint.
// FNV-1a, 32 bit: short, stable, good enough to key a lead.
export function fingerprint(lead: Lead): string {
  let hash = 0x811c9dc5;
  for (const char of lead.email ?? '') {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
