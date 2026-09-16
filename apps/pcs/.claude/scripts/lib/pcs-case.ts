/**
 * The CCD verbs both runners are built from.
 *
 * Every event goes through the same two calls the Playwright suites use: an
 * event-trigger GET for a token, then a POST to /events. The endpoints, payloads and
 * header sets all come from pcs-api's E2E api-data modules, so only the sequencing
 * lives here.
 *
 * Deliberately not importing CreateCaseAPIAction. It has a circular import with
 * createCase.action.ts that resolves under Playwright's loader but throws
 * "Cannot access 'CreateCaseAction' before initialization" under tsx.
 */

import { say } from './pcs-cli';
import { ApiInstance, call, CallResult, fail, requireOk } from './pcs-http';

export interface CaseOutcome {
  id: string;
  state: string;
}

/** Payloads are shared across reads, and some of them are mutable singletons. */
export function clone<T>(value: T): T {
  return structuredClone(value);
}

/** 1712345678901234 -> 1712-3456-7890-1234, the form XUI displays. */
export function dashed(caseId: string): string {
  return caseId.replace(/(.{4})(?=.)/g, '$1-');
}

export function manageCaseUrl(caseId: string): string {
  return `${process.env.MANAGE_CASE_BASE_URL ?? ''}/cases/case-details/${caseId}`;
}

function tokenFrom(step: string, result: CallResult): string {
  const token = (result.body as { token?: string })?.token;
  if (!token) fail(step, result);
  return token;
}

function outcomeFrom(result: CallResult, fallbackId: string): CaseOutcome {
  const payload = result.body as { id?: string | number; state?: string };
  return { id: String(payload?.id ?? fallbackId), state: payload?.state ?? '' };
}

/** Create a case: event-trigger GET on the case type, then POST to /cases. */
export async function createCase(opts: {
  instance: ApiInstance;
  eventId: string;
  triggerPath: string;
  createPath: string;
  data: unknown;
}): Promise<CaseOutcome> {
  const trigger = await call('GET', opts.instance, opts.triggerPath);
  requireOk('create-token', trigger);

  const created = await call('POST', opts.instance, opts.createPath, {
    data: opts.data,
    event: { id: opts.eventId },
    event_token: tokenFrom('create-token', trigger),
  });
  requireOk('create', created);

  const outcome = outcomeFrom(created, '');
  if (!outcome.id) fail('create', created);
  return outcome;
}

/**
 * The event-trigger GET.
 *
 * Returns the token and the case data as the event's about-to-start callback left
 * it — the only place some fields appear, because a POST straight to /events skips
 * that callback. `hearing_HearingId` and `featureFlags` are both only visible here.
 */
export async function startEvent(opts: {
  instance: ApiInstance;
  caseRef: string;
  eventId: string;
  step?: string;
}): Promise<{ token: string; caseData: Record<string, unknown> }> {
  const step = `${opts.step ?? opts.eventId}-token`;
  const trigger = await call(
    'GET',
    opts.instance,
    `/cases/${opts.caseRef}/event-triggers/${opts.eventId}`,
  );
  requireOk(step, trigger);

  const body = trigger.body as { case_details?: { case_data?: Record<string, unknown> } };
  return { token: tokenFrom(step, trigger), caseData: body?.case_details?.case_data ?? {} };
}

export async function submitEvent(opts: {
  instance: ApiInstance;
  caseRef: string;
  eventId: string;
  data: unknown;
  token: string;
  step?: string;
}): Promise<CaseOutcome> {
  const step = opts.step ?? opts.eventId;
  const submitted = await call('POST', opts.instance, `/cases/${opts.caseRef}/events`, {
    data: opts.data,
    event: { id: opts.eventId },
    event_token: opts.token,
  });
  requireOk(step, submitted);
  return outcomeFrom(submitted, opts.caseRef);
}

/** The common case: start the event and submit it in one go. */
export async function fireEvent(opts: {
  instance: ApiInstance;
  caseRef: string;
  eventId: string;
  data: unknown;
  step?: string;
}): Promise<CaseOutcome> {
  const { token } = await startEvent(opts);
  return submitEvent({ ...opts, token });
}

/** GET the whole case. Any IDAM token with read access will do. */
export async function getCase(instance: ApiInstance, caseRef: string): Promise<CallResult> {
  const result = await call('GET', instance, `/cases/${caseRef}`);
  requireOk('get-case', result);
  return result;
}

export async function stateOf(instance: ApiInstance, caseRef: string): Promise<string> {
  const result = await getCase(instance, caseRef);
  return (result.body as { state?: string }).state ?? '';
}

/**
 * Move PENDING_CASE_ISSUED to CASE_ISSUED by faking the Pay-hub callback.
 *
 * The fee_payment row is written by a db-scheduler task, so the service-request
 * reference has to be polled for. PUT /payment-update itself is synchronous: by the
 * time it returns, pcs-api has already fired claimIssuePayment internally and the
 * case is CASE_ISSUED. Both endpoints are S2S-only.
 */
export async function payAndIssue(opts: {
  instance: ApiInstance;
  feeInfoPath: string;
  paymentPath: string;
  payloadFor: (serviceRequestReference: string) => unknown;
  attempts?: number;
  delayMs?: number;
}): Promise<CallResult> {
  const attempts = opts.attempts ?? 20;
  const delayMs = opts.delayMs ?? 3000;

  let reference = '';
  let last!: CallResult;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    last = await call('GET', opts.instance, opts.feeInfoPath);
    requireOk('fee-payment-info', last);

    const rows = last.body as Array<{ serviceRequestReference?: string }>;
    reference =
      (Array.isArray(rows) ? rows : []).find(row => row?.serviceRequestReference)
        ?.serviceRequestReference ?? '';
    if (reference) break;

    say(`  waiting for the fee service request … (${attempt}/${attempts})`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  if (!reference) {
    fail('fee-payment-info', last, {
      hint:
        'no serviceRequestReference appeared — the fees-and-pay db-scheduler task has not run. '
        + 'Check DB_SCHEDULER_EXECUTOR_ENABLED on the pod, and that the fee lookup succeeded.',
    });
  }

  const updated = await call('PUT', opts.instance, opts.paymentPath, opts.payloadFor(reference));
  requireOk('payment-update', updated);
  return updated;
}
