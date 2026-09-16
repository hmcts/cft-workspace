/**
 * Entry point for apps/pcs/.claude/scripts/create-case.
 *
 * Creates one case from a named fixture and drives it up the state ladder as far as
 * the caller asked. Each rung adds one step to the one below it:
 *
 *   AWAITING_SUBMISSION_TO_HMCTS   createPossessionClaim
 *   PENDING_CASE_ISSUED            + resumePossessionClaim, carrying the fixture
 *   CASE_ISSUED                    + the faked Pay-hub callback
 *   the eight advanced states      + changeCaseState, as a hearing-centre admin
 */

import { createCaseApiData } from '@data/api-data/createCase.api.data';
import { createCaseEventTokenApiData } from '@data/api-data/createCaseEventToken.api.data';
import { createCaseApiWalesData } from '@data/api-data/createCaseWales.api.data';
import { paymentApiData } from '@data/api-data/payment.api.data';
import { submitCaseApiData } from '@data/api-data/submitCase.api.data';
import { submitCaseEventTokenApiData } from '@data/api-data/submitCaseEventToken.api.data';

import { actAs, mintS2SToken } from './pcs-auth';
import {
  clone,
  createCase,
  dashed,
  fireEvent,
  manageCaseUrl,
  payAndIssue,
  stateOf,
} from './pcs-case';
import { emit, env, print, runMain, say, usageError } from './pcs-cli';
import { ApiInstance } from './pcs-http';
import {
  discoverFixtures,
  Fixture,
  FixtureLookupError,
  formatFixtureTable,
  resolveFixture,
} from './pcs-fixtures';
import { ALL_STATES, isAdvancedState, normaliseState, rejectState } from './pcs-states';

interface Args {
  list: boolean;
  check: boolean;
  json: boolean;
  fixture: string;
  state: string;
}

/** What the requested state implies about how far up the ladder to climb. */
interface Plan {
  target: string;
  submit: boolean;
  pay: boolean;
  changeState: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { list: false, check: false, json: false, fixture: '', state: 'CASE_ISSUED' };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--list':    args.list = true; break;
      case '--check':   args.check = true; break;
      case '--json':    args.json = true; break;
      case '--fixture': args.fixture = argv[++i] ?? ''; break;
      case '--state':   args.state = argv[++i] ?? ''; break;
      default:
        throw new Error(`unknown runner argument: ${argv[i]}`);
    }
  }
  return args;
}

function planFor(requested: string): Plan {
  const target = normaliseState(requested);
  const rejection = rejectState(target, 'create');
  if (rejection) usageError(rejection);

  const changeState = isAdvancedState(target);
  return {
    target,
    submit: target !== 'AWAITING_SUBMISSION_TO_HMCTS',
    pay: target === 'CASE_ISSUED' || changeState,
    changeState,
  };
}

function listFixtures(fixtures: Fixture[], json: boolean): never {
  if (json) {
    emit({
      ok: true,
      fixtures: fixtures.map(({ payload, ...rest }) => rest),
      states: ALL_STATES,
    });
  }
  print(formatFixtureTable(fixtures));
}

function findFixture(fixtures: Fixture[], query: string): Fixture {
  if (!query) usageError('no fixture given. Run with --list to see what is available.');

  try {
    return resolveFixture(fixtures, query);
  } catch (error) {
    if (!(error instanceof FixtureLookupError)) throw error;

    if (error.candidates.length === 1) {
      usageError(
        `'${error.query}' is not a fixture id. Did you mean:`,
        `  ${error.candidates[0].id}  (${error.candidates[0].constName})`,
      );
    }
    usageError(
      `no single fixture matches '${error.query}'.`,
      ...(error.candidates.length
        ? ['', 'It could be any of:', ...error.candidates.map(c => `  ${c.id}  (${c.constName})`)]
        : ['Run with --list to see every fixture.']),
    );
  }
}

/** CCD data-store, carrying whichever IDAM token was minted most recently. */
function ccdInstance(): ApiInstance {
  return submitCaseEventTokenApiData.submitCaseEventTokenApiInstance();
}

/**
 * The create payload paired with the fixture, chosen from the fixture's own
 * legislativeCountry rather than from the module it came out of.
 *
 * The endpoint and header set always come from pcs-api's England module: the Wales
 * module derives its path from PCS_API_CHANGE_ID rather than CASE_TYPE_SUFFIX, which
 * would disagree with the event-token GET if only one of the two were set.
 */
function createPayloadFor(fixture: Fixture): unknown {
  const wales = fixture.country.toLowerCase() === 'wales';
  return clone((wales ? createCaseApiWalesData : createCaseApiData).createCasePayload);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const fixtures = discoverFixtures();

  if (args.list) listFixtures(fixtures, args.json);

  const fixture = findFixture(fixtures, args.fixture);
  const plan = planFor(args.state);

  // Refused here rather than at submit: cftlib runs no document store, and CCD asks
  // CDAM about every document it is given, so a document-bearing fixture fails after
  // the case has already been created. --list reports the count per fixture.
  if (fixture.documents > 0 && process.env.PCS_ENV_KIND === 'local') {
    usageError(
      `${fixture.id} carries ${fixture.documents} document reference(s), which the local stack cannot accept.`,
      '',
      'cftlib has no document store, and CCD calls CDAM to check every document it',
      'is given — so this fails after the case has been created, not before.',
      'Pick a fixture with 0 in the DOCS column of --list, or use a real environment.',
    );
  }

  // Resolution is a pure disk read, so a typo fails here rather than after the
  // wrapper has asked for the VPN and an Azure login.
  if (args.check) {
    emit({
      ok: true,
      fixture: fixture.id,
      constName: fixture.constName,
      legislativeCountry: fixture.country,
      state: plan.target,
      needsSubmit: plan.submit,
      needsPayment: plan.pay,
      needsAdmin: plan.changeState,
    });
  }

  const claimant = env('PCS_CLAIMANT_EMAIL');
  const caseType = env('PCS_CASE_TYPE');

  say(`Fixture   ${fixture.id}  (${fixture.constName})`);
  say(`Case type ${caseType}`);
  say(`Target    ${plan.target}`);
  say('');

  await mintS2SToken();
  await actAs(claimant);
  say(`Acting as ${claimant}`);

  say(`Creating a ${fixture.country} case …`);
  const created = await createCase({
    instance: createCaseEventTokenApiData.createCaseEventTokenApiInstance(),
    eventId: createCaseApiData.createCaseEventName,
    triggerPath: createCaseEventTokenApiData.createCaseEventTokenApiEndPoint,
    createPath: createCaseApiData.createCaseApiEndPoint,
    data: createPayloadFor(fixture),
  });

  // Every downstream endpoint builds its path from CASE_NUMBER at call time.
  process.env.CASE_NUMBER = created.id;
  let state = created.state;
  say(`Created   ${dashed(created.id)}  (${state})`);

  if (plan.submit) {
    say('Submitting the claim …');
    const submitted = await fireEvent({
      instance: ccdInstance(),
      caseRef: created.id,
      eventId: submitCaseApiData.submitCaseEventName,
      data: clone(fixture.payload),
      step: 'submit',
    });
    state = submitted.state || state;
    say(`Submitted (${state})`);
  }

  if (plan.pay) {
    say('Faking the fee payment to issue the case …');
    await payAndIssue({
      instance: paymentApiData.paymentApiInstance(),
      feeInfoPath: paymentApiData.getFeePaymentInfoApiEndPoint(),
      paymentPath: paymentApiData.updatePaymentApiEndPoint,
      payloadFor: reference => paymentApiData.paymentUpdatePayload(reference),
    });

    // Read the state back rather than asserting CASE_ISSUED: reporting a state nobody
    // checked is how a silent no-op passes for a success.
    state = (await stateOf(ccdInstance(), created.id)) || state;
    say(`Issued    (${state})`);
  }

  if (plan.changeState) {
    state = await moveToTargetState(created.id, plan.target, fixture);
  }

  emit({
    ok: true,
    caseId: created.id,
    caseReference: dashed(created.id),
    state,
    requestedState: plan.target,
    fixture: fixture.id,
    constName: fixture.constName,
    source: fixture.source,
    legislativeCountry: fixture.country,
    caseType,
    environment: process.env.PCS_ENV_LABEL ?? '',
    actedAs: claimant,
    manageCaseUrl: manageCaseUrl(created.id),
    // Repeated runs with the same solicitor accumulate case roles; this is the call
    // the E2E suite's deleteCaseRole action uses to clear one.
    cleanup: {
      method: 'DELETE',
      url: `${process.env.DATA_STORE_URL_BASE ?? ''}/case-users`,
      body: {
        case_users: [
          {
            case_id: created.id,
            user_id: process.env.PCS_SOLICITOR_AUTOMATION_UID ?? '',
            case_role: '[CLAIMANTSOLICITOR]',
          },
        ],
      },
    },
  });
}

/**
 * The last rung: changeCaseState, which is granted only to the hearing-centre roles.
 * Those are AM organisational roles, hence a different user from the claimant, and
 * they are scoped by region — so a Welsh case is refused where the provisioned admin
 * belongs to an English one.
 *
 * The event's EventEnablingCondition is evaluated only when XUI builds its trigger
 * list, so this works whatever LaunchDarkly says.
 */
async function moveToTargetState(caseId: string, target: string, fixture: Fixture): Promise<string> {
  const admin = env('PCS_ADMIN_EMAIL');

  if (fixture.country.toLowerCase() === 'wales') {
    say('');
    say('Note: this is a Welsh case, and the hearing-centre admin available here is');
    say('assigned to an English region. changeCaseState is likely to be refused —');
    say('the case will still exist in CASE_ISSUED if it is.');
    say('');
  }

  say(`Moving to ${target} as ${admin} …`);
  await actAs(admin);

  const moved = await fireEvent({
    instance: ccdInstance(),
    caseRef: caseId,
    eventId: 'changeCaseState',
    data: { targetState: target },
    step: 'change-state',
  });
  say(`Now       ${moved.state || target}`);
  return moved.state || target;
}

runMain(main);
