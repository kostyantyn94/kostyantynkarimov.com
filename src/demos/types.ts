export type StepStatus = 'ok' | 'review' | 'error' | 'skip';

/** One line in the playground log. */
export interface Step {
  name: string;
  status: StepStatus;
  detail: string;
}

export interface Run {
  steps: Step[];
  response: { status: number; body: unknown };
}

export interface Lead {
  email?: string;
  name?: string;
  company?: string;
  title?: string;
  phone?: string;
}
