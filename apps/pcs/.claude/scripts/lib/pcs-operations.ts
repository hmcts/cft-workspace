/**
 * What /pcs:manage-case can do to an existing case.
 *
 * Each operation declares the user it must act as, because that is the detail most
 * easily got wrong: changeCaseState and manageHearing are granted only to the
 * hearing-centre roles, addCaseNote to a wider caseworker bundle, and the
 * /testing-support reads need no IDAM token at all. Firing one as the wrong user
 * gives a 403, or a 404 reading "No case type found", that looks like an
 * infrastructure fault.
 *
 * Deliberately absent, each for a different reason:
 *   enforceTheOrder / confirmEviction — not registered in any deployed CCD
 *     definition; they need isDev() && ENABLE_ENFORCEMENT at bean-registration time.
 *   makeAnApplication — needs a solicitor already linked to a defendant party.
 *   createCaseLink / maintainCaseLink — pcs-api's persistence callback returns 500
 *     for every payload, including the minimal one.
 *   the case-flag events — every field is NEVER_SHOW plus a component launcher.
 */

import { manageHearingApiData } from '@data/api-data/manageHearing.api.data';
import { paymentApiData } from '@data/api-data/payment.api.data';

import { currentUserId } from './pcs-auth';
import {
  clone,
  fireEvent,
  getCase,
  manageCaseUrl,
  payAndIssue,
  startEvent,
  stateOf,
  submitEvent,
} from './pcs-case';
import { usageError } from './pcs-cli';
import { ApiInstance, call, requireOk } from './pcs-http';
import { ADVANCED_STATES, normaliseState, rejectState } from './pcs-states';

/** Which IDAM user an operation has to act as. `none` means S2S only. */
export type Actor = 'none' | 'claimant' | 'admin' | 'caseworker';

export interface OperationContext {
  /** The bare 16 digits. */
  caseRef: string;
  /** Positional arguments after the operation name. */
  args: string[];
  /** CCD data-store, carrying whichever user was minted for this operation. */
  ccd: () => ApiInstance;
  /** pcs-api's own endpoints, S2S only. */
  pcsApi: () => ApiInstance;
}

export interface Operation {
  actor: Actor;
  /** Whether it needs pcs-api's /testing-support endpoints, absent on ithc. */
  testingSupport: boolean;
  summary: string;
  run: (ctx: OperationContext) => Promise<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function requiredArg(ctx: OperationContext, index: number, what: string): string {
  return ctx.args[index] || usageError(`this operation needs ${what}.`);
}

function countOf(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

/** Drop keys whose value carries no information, so a blank is not read as data. */
function withoutEmpties(report: Record<string, unknown>): Record<string, unknown> {
  for (const [key, value] of Object.entries(report)) {
    if (value === '' || value === undefined || value === null) delete report[key];
  }
  return report;
}

/**
 * The hearing to act on.
 *
 * manageHearing's about-to-start callback resolves the editable hearing and puts its
 * id in hearing_HearingId, so the event trigger is the only reliable source: the
 * persisted case data has no hearing list, because hearingList is assembled by
 * pcs-api's case view for XUI's tabs.
 */
function hearingIdFrom(caseData: Record<string, unknown>, explicit?: string): number {
  if (explicit) {
    const parsed = Number(explicit);
    if (!Number.isInteger(parsed)) usageError(`'${explicit}' is not a hearing id.`);
    return parsed;
  }

  const hearingId = caseData.hearing_HearingId;
  if (typeof hearingId !== 'number') {
    usageError(
      'this case has no hearing to act on — add one first:',
      `  manage-case ${process.env.PCS_ENV_LABEL ?? '<env>'} <case-ref> add-hearing`,
      'If it does have one, pass the hearing id explicitly as the last argument.',
    );
  }
  return hearingId;
}

function startManageHearing(ctx: OperationContext, step: string) {
  return startEvent({ instance: ctx.ccd(), caseRef: ctx.caseRef, eventId: 'manageHearing', step });
}

/**
 * addCaseNote is only the carrier: its about-to-start callback is what attaches the
 * projected feature flags, and it is available in nearly every state.
 */
function startFlagCarrier(ctx: OperationContext) {
  return startEvent({
    instance: ctx.ccd(),
    caseRef: ctx.caseRef,
    eventId: 'addCaseNote',
    step: 'flags',
  });
}

async function mutateCaseRole(
  ctx: OperationContext,
  method: 'POST' | 'DELETE',
  step: string,
): Promise<Record<string, unknown>> {
  const caseRole = requiredArg(ctx, 0, "a case role, e.g. '[CLAIMANTSOLICITOR]'");
  const userId = requiredArg(ctx, 1, 'the IDAM user id to act on');

  const result = await call(method, ctx.ccd(), '/case-users', {
    case_users: [{ case_id: ctx.caseRef, user_id: userId, case_role: caseRole }],
  });
  requireOk(step, result);
  return { caseRole, userId };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

const reads: Record<string, Operation> = {
  inspect: {
    // The hearing-centre admin, not the claimant solicitor: the caseworker-only
    // fields are field-ACL'd, and a solicitor's read silently omits them, which
    // would report an empty case-note list as though there were none.
    actor: 'admin',
    testingSupport: false,
    summary: 'state, parties, documents, notes, review dates, links and flags',
    async run(ctx) {
      const result = await getCase(ctx.ccd(), ctx.caseRef);
      const body = result.body as {
        state?: string;
        last_state_modified_on?: string;
        data?: Record<string, unknown>;
      };
      const data = body.data ?? {};
      const defendants =
        (data.allDefendants as Array<{ id?: string; value?: Record<string, unknown> }>) ?? [];

      // No hearing count on purpose: hearingList is assembled by pcs-api's case view
      // for XUI's tabs and is absent from the persisted data, so it would read 0 even
      // for a case that has hearings. The hearing operations use the event trigger.
      //
      // Fields are ACL'd per role, so anything missing here is "not visible to this
      // user" rather than "not set" — hence naming the role and dropping blanks.
      return withoutEmpties({
        state: body.state,
        lastStateModifiedOn: body.last_state_modified_on,
        legislativeCountry: data.legislativeCountry,
        defendants: defendants.map(defendant => ({
          partyId: defendant.id ?? '',
          nameKnown: defendant.value?.nameKnown ?? '',
          firstName: defendant.value?.firstName ?? '',
          lastName: defendant.value?.lastName ?? '',
        })),
        documents: countOf(data.allDocuments),
        caseNotes: countOf(data.caseNotes),
        reviewDates: countOf(data.reviewDates),
        caseLinks: countOf(data.caseLinks),
        caseFlags: data.caseFlags,
        viewedAs: process.env.PCS_ACTOR_OVERRIDE || process.env.PCS_ADMIN_EMAIL,
        manageCaseUrl: manageCaseUrl(ctx.caseRef),
      });
    },
  },

  flags: {
    // The claimant solicitor, not the admin: this operation exists to diagnose an
    // environment, and the hearing-centre roles are exactly what is missing in the
    // environments that need diagnosing. A case's creator can always see it, and an
    // event-trigger GET does not check event permissions.
    actor: 'claimant',
    testingSupport: false,
    summary: 'the LaunchDarkly flag values in effect in this environment',
    async run(ctx) {
      // pcs-api projects the flag values onto case data, so the addCaseNote trigger
      // reports them without firing anything. That event is available in nearly
      // every state, which is why it is the one used here.
      const { caseData } = await startFlagCarrier(ctx);
      const flags = caseData.featureFlags as Record<string, string> | undefined;
      if (!flags) {
        usageError('this case type does not report feature flags on the addCaseNote trigger.');
      }
      return { featureFlags: flags };
    },
  },

  pins: {
    actor: 'none',
    testingSupport: true,
    summary: 'the defendant access codes',
    async run(ctx) {
      const result = await call(
        'GET',
        ctx.pcsApi(),
        `/testing-support/pins/${ctx.caseRef}`,
      );
      requireOk('pins', result);

      const codes = result.body as Record<string, unknown> | null;
      return {
        accessCodes: result.body,
        // Codes are written by a db-scheduler task fired when the case is issued, so
        // an empty map straight after paying means "not generated yet" rather than
        // "this case has none".
        note:
          codes && typeof codes === 'object' && Object.keys(codes).length === 0
            ? 'no access codes yet — they are generated asynchronously when the case is issued, so retry in a moment'
            : undefined,
      };
    },
  },

  'fee-info': {
    actor: 'none',
    testingSupport: true,
    summary: 'the fee and payment rows, including the service request reference',
    async run(ctx) {
      const result = await call(
        'GET',
        ctx.pcsApi(),
        `/testing-support/fee-payment-info/${ctx.caseRef}`,
      );
      requireOk('fee-info', result);
      return { feePayments: result.body };
    },
  },

  roles: {
    actor: 'claimant',
    testingSupport: false,
    summary: 'case-user roles for one user — roles [idam-user-id]',
    async run(ctx) {
      // CCD refuses an unscoped read with "Access to other user's case role
      // assignments not granted" — that needs caseworker-caa, which none of the
      // provisioned users holds. Scoping is permitted, but only to the acting user,
      // so the default comes from the token rather than from the vault's
      // PCS_SOLICITOR_AUTOMATION_UID, which in perftest names a different user.
      const userId = ctx.args[0] || (await currentUserId());
      if (!userId) usageError('could not determine a user id to query. Pass one explicitly.');

      const result = await call(
        'GET',
        ctx.ccd(),
        `/case-users?case_ids=${ctx.caseRef}&user_ids=${userId}`,
      );
      requireOk('roles', result);

      const caseUsers = (result.body as { case_users?: unknown[] }).case_users ?? [];
      return {
        userId,
        caseUsers,
        // PCS grants case access through AM role assignments written by a scheduled
        // task, so an empty list here does not mean the user has no access.
        note: caseUsers.length === 0
          ? 'no CCD case-user role for this user; PCS grants case access through AM role assignments, so check /cft-role-assignment too'
          : undefined,
      };
    },
  },
};

// ---------------------------------------------------------------------------
// Payment and state
// ---------------------------------------------------------------------------

const progression: Record<string, Operation> = {
  pay: {
    // The payment itself is S2S-only, but the state check either side of it needs a
    // user token, and the admin can see the case whatever state it is in.
    actor: 'admin',
    testingSupport: true,
    summary: 'fake the fee payment, moving PENDING_CASE_ISSUED to CASE_ISSUED',
    async run(ctx) {
      // Both endpoints derive their path from CASE_NUMBER at call time.
      process.env.CASE_NUMBER = ctx.caseRef;

      const before = await stateOf(ctx.ccd(), ctx.caseRef);
      if (before !== 'PENDING_CASE_ISSUED') {
        usageError(
          `this case is in ${before}, not PENDING_CASE_ISSUED.`,
          'The fee row still carries a service request reference, so replaying the',
          'payment would report success without changing anything. Nothing was sent.',
        );
      }

      await payAndIssue({
        instance: ctx.pcsApi(),
        feeInfoPath: paymentApiData.getFeePaymentInfoApiEndPoint(),
        paymentPath: paymentApiData.updatePaymentApiEndPoint,
        payloadFor: reference => paymentApiData.paymentUpdatePayload(reference),
      });

      // Read it back rather than asserting CASE_ISSUED: reporting a state nobody
      // checked is how a silent no-op passes for a success.
      return { state: await stateOf(ctx.ccd(), ctx.caseRef), previousState: before };
    },
  },

  'set-state': {
    actor: 'admin',
    testingSupport: false,
    summary: `move the case to another state — set-state <${ADVANCED_STATES.join('|')}>`,
    async run(ctx) {
      const target = normaliseState(requiredArg(ctx, 0, 'a target state'));

      // Validated here rather than left to the server: an invalid CaseStateOption
      // comes back as a 422 or 5xx that the wrapper would then diagnose as fixture
      // drift or a shut-down environment, neither of which is true of a typo.
      const rejection = rejectState(target, 'change');
      if (rejection) usageError(rejection);

      const moved = await fireEvent({
        instance: ctx.ccd(),
        caseRef: ctx.caseRef,
        eventId: 'changeCaseState',
        data: { targetState: target },
        step: 'change-state',
      });
      return { state: moved.state || target, requestedState: target };
    },
  },
};

// ---------------------------------------------------------------------------
// Hearings
//
// add sends no manageHearingOption on purpose: the submit handler forces ADD
// whenever showManageHearingPage is not YES, which is what lets the E2E suite's
// payload work unchanged. edit and cancel must set it, and they read different
// fields — updateHearing takes the top-level selectedHearingId, cancelHearing takes
// the hearing_ prefixed copy.
// ---------------------------------------------------------------------------

const hearings: Record<string, Operation> = {
  'add-hearing': {
    actor: 'admin',
    testingSupport: false,
    summary: 'add a hearing — add-hearing [yyyy-mm-ddThh:mm:ss]',
    async run(ctx) {
      const data = clone(manageHearingApiData.AddHearingPayload as Record<string, unknown>);
      if (ctx.args[0]) data.hearing_Date = ctx.args[0];

      await fireEvent({
        instance: ctx.ccd(),
        caseRef: ctx.caseRef,
        eventId: 'manageHearing',
        data,
        step: 'add-hearing',
      });
      return { hearing: data };
    },
  },

  'edit-hearing': {
    actor: 'admin',
    testingSupport: false,
    summary: 'move a hearing — edit-hearing [yyyy-mm-ddThh:mm:ss] [hearing-id]',
    async run(ctx) {
      const started = await startManageHearing(ctx, 'edit-hearing');
      const hearingId = hearingIdFrom(started.caseData, ctx.args[1]);

      // updateHearing re-populates the whole entity from the submitted fields, so the
      // full detail set has to go with it, not just the changed date.
      const data = clone(manageHearingApiData.AddHearingPayload as Record<string, unknown>);
      if (ctx.args[0]) data.hearing_Date = ctx.args[0];
      data.showManageHearingPage = 'YES';
      data.manageHearingOption = 'EDIT';
      data.selectedHearingId = String(hearingId);

      await submitEvent({
        instance: ctx.ccd(),
        caseRef: ctx.caseRef,
        eventId: 'manageHearing',
        data,
        token: started.token,
        step: 'edit-hearing',
      });
      return { hearingId, hearing: data };
    },
  },

  'cancel-hearing': {
    actor: 'admin',
    testingSupport: false,
    summary: 'cancel a hearing — cancel-hearing [reason] [hearing-id]',
    async run(ctx) {
      const reason = ctx.args[0] ?? 'Cancelled by /pcs:manage-case';
      const started = await startManageHearing(ctx, 'cancel-hearing');
      const hearingId = hearingIdFrom(started.caseData, ctx.args[1]);

      await submitEvent({
        instance: ctx.ccd(),
        caseRef: ctx.caseRef,
        eventId: 'manageHearing',
        data: {
          showManageHearingPage: 'YES',
          manageHearingOption: 'CANCEL',
          hearing_HearingId: hearingId,
          hearing_CancellationReason: reason,
        },
        token: started.token,
        step: 'cancel-hearing',
      });
      return { hearingId, cancellationReason: reason };
    },
  },
};

// ---------------------------------------------------------------------------
// Notes, parties and case access
// ---------------------------------------------------------------------------

const caseAdmin: Record<string, Operation> = {
  'add-note': {
    // CASE_NOTE_ROLES is the widest write bundle in the catalogue and the event has
    // no feature flag, which makes this the safest write available.
    actor: 'caseworker',
    testingSupport: false,
    summary: 'append a case note — add-note <text>',
    async run(ctx) {
      const note = requiredArg(ctx, 0, 'the note text');
      await fireEvent({
        instance: ctx.ccd(),
        caseRef: ctx.caseRef,
        eventId: 'addCaseNote',
        data: { note },
        step: 'add-note',
      });
      return { note };
    },
  },

  'set-party-email': {
    actor: 'none',
    testingSupport: true,
    summary: "redirect a party's Notify mail — set-party-email <party-id> <email>",
    async run(ctx) {
      const partyId = requiredArg(ctx, 0, 'a party id (run inspect to find one)');
      const emailAddress = requiredArg(ctx, 1, 'an email address');

      // The endpoint also forces contactByEmail=YES, which is the point of it.
      const result = await call(
        'POST',
        ctx.pcsApi(),
        `/testing-support/party/${partyId}/email-address`,
        { partyId, emailAddress },
      );
      requireOk('set-party-email', result);
      return { partyId, emailAddress };
    },
  },

  'grant-role': {
    actor: 'claimant',
    testingSupport: false,
    summary: 'grant a case role to a user — grant-role <case-role> <idam-user-id>',
    run: ctx => mutateCaseRole(ctx, 'POST', 'grant-role'),
  },

  'revoke-role': {
    actor: 'claimant',
    testingSupport: false,
    summary: 'revoke a case role from a user — revoke-role <case-role> <idam-user-id>',
    run: ctx => mutateCaseRole(ctx, 'DELETE', 'revoke-role'),
  },
};

// ---------------------------------------------------------------------------

export const OPERATIONS: Record<string, Operation> = {
  ...reads,
  ...progression,
  ...hearings,
  ...caseAdmin,
};

export function operationNames(): string[] {
  return Object.keys(OPERATIONS);
}

export function formatOperationTable(): string {
  const entries = Object.entries(OPERATIONS);
  const width = Math.max(...entries.map(([name]) => name.length));
  return entries
    .map(([name, op]) => `${name.padEnd(width)}  ${op.actor.padEnd(10)}  ${op.summary}`)
    .join('\n');
}

export function operationSummaries(): Array<Record<string, unknown>> {
  return Object.entries(OPERATIONS).map(([name, op]) => ({
    name,
    actor: op.actor,
    testingSupport: op.testingSupport,
    summary: op.summary,
  }));
}
