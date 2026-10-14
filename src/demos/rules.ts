import type { Lead } from './types';

export type Decision = 'qualified' | 'rejected';

// Rules are rows of data, not code: in production they live in a PostgreSQL table,
// and a human decision in the review form can add a new row.
export interface Rule {
  id: string;
  label: string;
  kind: 'domain_in' | 'title_matches' | 'free_mail_without_company';
  values?: string[];
  pattern?: string;
  decision: Decision;
}

export const FREE_MAIL = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'proton.me', 'icloud.com', 'ukr.net'];

export const RULES: Rule[] = [
  {
    id: 'test-domains',
    label: 'Test or disposable domain',
    kind: 'domain_in',
    values: ['test.com', 'example.com', 'mailinator.com'],
    decision: 'rejected',
  },
  {
    id: 'students',
    label: 'Student, intern or trainee',
    kind: 'title_matches',
    pattern: '\\b(student|intern|trainee)\\b',
    decision: 'rejected',
  },
  {
    id: 'free-mail',
    label: 'Free mail and no company',
    kind: 'free_mail_without_company',
    decision: 'rejected',
  },
  {
    id: 'decision-makers',
    label: 'Decision maker title',
    kind: 'title_matches',
    pattern: '\\b(ceo|cto|founder|head|vp|director)\\b',
    decision: 'qualified',
  },
  {
    id: 'helixsoft',
    label: 'helixsoft.dev, added from a human decision',
    kind: 'domain_in',
    values: ['helixsoft.dev'],
    decision: 'qualified',
  },
];

const domainOf = (lead: Lead) => lead.email?.split('@')[1] ?? '';

export function matches(rule: Rule, lead: Lead): boolean {
  switch (rule.kind) {
    case 'domain_in':
      return rule.values?.includes(domainOf(lead)) ?? false;
    case 'title_matches':
      return new RegExp(rule.pattern ?? '$^', 'i').test(lead.title ?? '');
    case 'free_mail_without_company':
      return FREE_MAIL.includes(domainOf(lead)) && !lead.company;
  }
}

/** First enabled rule that matches wins; no match means the lead needs the model. */
export function applyRules(lead: Lead, rules: Rule[] = RULES, disabled: string[] = []) {
  const trace: { rule: Rule; matched: boolean; disabled: boolean }[] = [];
  for (const rule of rules) {
    const isDisabled = disabled.includes(rule.id);
    const matched = !isDisabled && matches(rule, lead);
    trace.push({ rule, matched, disabled: isDisabled });
    if (matched) return { decision: rule.decision, rule, trace };
  }
  return { decision: 'needs_model' as const, rule: undefined, trace };
}
