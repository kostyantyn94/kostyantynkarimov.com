import { describe, expect, it } from 'vitest';
import { fingerprint, normalizeLead, validateLead } from './lead';
import { applyRules } from './rules';
import { decide, mockModel, parseQualification } from './llm';
import { syncToCrm } from './crm';
import { runIntake, runModel, runPipeline, runRules, SCENARIOS } from './scenarios';

const options = { model: 'normal' as const, crmDown: false, disabledRules: [] };

describe('lead', () => {
  it('maps aliases, trims, lowercases email and cleans phone', () => {
    const { lead, fixes } = normalizeLead({
      Email_Address: ' Ana@Acme.IO ',
      'Full Name': 'Ana   K',
      'Phone Number': '+49 (151) 234-5678',
      utm_source: 'x',
    });
    expect(lead).toEqual({ email: 'ana@acme.io', name: 'Ana K', phone: '+491512345678' });
    expect(fixes).toContain('dropped unknown field "utm_source"');
  });

  it('reports every validation problem', () => {
    expect(validateLead({ email: 'ana@', phone: '12' })).toEqual([
      '"ana@" is not a valid email',
      'name is required',
      'phone must have 7-15 digits',
    ]);
  });

  it('gives the same person the same fingerprint', () => {
    const a = normalizeLead({ email: 'JONAS@x.dev' }).lead;
    const b = normalizeLead({ Email: ' jonas@x.dev ' }).lead;
    expect(fingerprint(a)).toBe(fingerprint(b));
  });
});

describe('rules', () => {
  it('first match wins and disabled rules are skipped', () => {
    const student = { email: 'emma@gmail.com', name: 'Emma', title: 'Student' };
    expect(applyRules(student).rule?.id).toBe('students');
    expect(applyRules(student, undefined, ['students']).rule?.id).toBe('free-mail');
  });

  it('sends unmatched leads to the model', () => {
    expect(applyRules({ email: 'tom@northwind.io', company: 'N', title: 'Office Administrator' }).decision).toBe(
      'needs_model',
    );
  });
});

describe('llm guardrails', () => {
  const lead = { email: 'o@cloudmesa.app', title: 'Growth Lead' };

  it('rejects anything outside the schema', () => {
    expect(parseQualification('{decision: qualified').ok).toBe(false);
    expect(parseQualification('{"decision":"qualified","confidence":0.9,"reasons":["x"],"extra":1}').ok).toBe(false);
    expect(parseQualification('{"decision":"maybe","confidence":0.9,"reasons":["x"]}').ok).toBe(false);
  });

  it('sends low confidence to a human', () => {
    const reply = mockModel(lead, 'low_confidence');
    if (!reply.ok) throw new Error('expected a reply');
    const parsed = parseQualification(reply.text);
    if (!parsed.ok) throw new Error('expected valid output');
    expect(decide(parsed.value)).toBe('review');
  });

  it('falls back to review when the model is down or invalid', () => {
    expect(runModel(lead, 'down').response.body).toEqual({ decision: 'review', reason: 'ai_unavailable' });
    expect(runModel(lead, 'invalid_json').response.body).toEqual({ decision: 'review', reason: 'invalid_output' });
  });
});

describe('scenarios', () => {
  it('intake: 202 for a new lead, 200 for a duplicate, 400 for a broken one', () => {
    const [messy, duplicate, broken] = SCENARIOS.easy.samples.map((sample) => runIntake(sample.payload));
    expect(messy.response.status).toBe(202);
    expect(duplicate.response.status).toBe(200);
    expect(broken.response.status).toBe(400);
  });

  it('rules: a decision maker is qualified without any model call', () => {
    const run = runRules({ email: 's@pinefield-saas.com', name: 'S', title: 'VP Marketing' });
    expect(run.response.body).toMatchObject({ decision: 'qualified', llm_calls: 0 });
  });

  it('pipeline: a down CRM queues the lead instead of losing it', () => {
    const body = SCENARIOS.expert.samples[0].payload;
    expect(runPipeline(body, options).response.body).toMatchObject({ decision: 'qualified' });
    expect(runPipeline(body, { ...options, crmDown: true }).response.body).toMatchObject({ crm_contact: 'queued' });
    expect(syncToCrm({ email: 'a@b.co' }, true).attempts).toHaveLength(3);
  });

  it('pipeline: a lead without a matching rule goes through the model', () => {
    const run = runPipeline(SCENARIOS.expert.samples[1].payload, options);
    expect(run.steps.some((step) => step.name === 'model')).toBe(true);
    expect(run.response.body).toMatchObject({ decided_by: 'ai' });
  });
});
