import { fingerprint } from './lead';
import type { Lead } from './types';

export const MAX_ATTEMPTS = 3;

/**
 * Stand-in for the HubSpot contacts API (search by email, then create), so the playground
 * works offline. When the CRM is down, every attempt fails and the lead is queued, not lost.
 */
export function syncToCrm(lead: Lead, crmDown: boolean) {
  const attempts: string[] = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (crmDown) {
      attempts.push(`attempt ${attempt}: 503 from CRM`);
      continue;
    }
    const contactId = 1000 + (parseInt(fingerprint(lead), 16) % 9000);
    attempts.push(`attempt ${attempt}: search by email → not found → created contact ${contactId}`);
    return { ok: true as const, contactId, attempts };
  }
  // The error workflow stores the failure; a schedule retries unsynced leads every 15 minutes.
  return { ok: false as const, attempts };
}
