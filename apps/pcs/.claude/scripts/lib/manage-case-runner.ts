/**
 * Entry point for apps/pcs/.claude/scripts/manage-case.
 *
 * Parses the runner arguments, mints the token the chosen operation needs, runs it,
 * and emits one result object. The operations themselves live in pcs-operations.ts.
 */

import { paymentApiData } from '@data/api-data/payment.api.data';
import { submitCaseEventTokenApiData } from '@data/api-data/submitCaseEventToken.api.data';

import { actAs, mintS2SToken } from './pcs-auth';
import { dashed } from './pcs-case';
import { emit, env, print, runMain, say, usageError } from './pcs-cli';
import { ApiInstance } from './pcs-http';
import {
  Actor,
  formatOperationTable,
  OPERATIONS,
  operationNames,
  operationSummaries,
} from './pcs-operations';

interface Args {
  list: boolean;
  check: boolean;
  json: boolean;
  caseRef: string;
  operation: string;
  operationArgs: string[];
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    list: false,
    check: false,
    json: false,
    caseRef: '',
    operation: '',
    operationArgs: [],
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--list':      args.list = true; break;
      case '--check':     args.check = true; break;
      case '--json':      args.json = true; break;
      case '--case':      args.caseRef = argv[++i] ?? ''; break;
      case '--operation': args.operation = argv[++i] ?? ''; break;
      case '--arg':       args.operationArgs.push(argv[++i] ?? ''); break;
      default:
        throw new Error(`unknown runner argument: ${argv[i]}`);
    }
  }
  return args;
}

/** CCD data-store, carrying whichever IDAM token was minted for this operation. */
function ccdInstance(): ApiInstance {
  return submitCaseEventTokenApiData.submitCaseEventTokenApiInstance();
}

/** pcs-api's own endpoints. This header set is S2S only — no IDAM token. */
function pcsApiInstance(): ApiInstance {
  return paymentApiData.paymentApiInstance();
}

const ACTOR_EMAIL_VARS: Record<Exclude<Actor, 'none'>, string> = {
  claimant: 'PCS_CLAIMANT_EMAIL',
  admin: 'PCS_ADMIN_EMAIL',
  caseworker: 'PCS_CASEWORKER_EMAIL',
};

/**
 * The user to act as. --as overrides the operation's default, which is needed when a
 * hearing-centre role is scoped to a region the default user is not assigned to.
 */
function resolveActor(actor: Actor): string | undefined {
  if (actor === 'none') return undefined;
  return process.env.PCS_ACTOR_OVERRIDE || env(ACTOR_EMAIL_VARS[actor]);
}

/** CCD wants the bare 16 digits; a reference pasted out of XUI carries dashes. */
function normaliseCaseRef(input: string): string {
  const bare = input.replace(/[^0-9]/g, '');
  if (bare.length !== 16) usageError(`'${input}' is not a 16-digit case reference.`);
  return bare;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) {
    if (args.json) emit({ ok: true, operations: operationSummaries() });
    print(formatOperationTable());
  }

  const operation = OPERATIONS[args.operation];
  if (!operation) {
    usageError(
      `unknown operation: ${args.operation || '(none given)'}`,
      `valid: ${operationNames().join(', ')}`,
    );
  }

  // The wrapper asks for this before setting anything up: it needs to know which user
  // to fetch secrets for, and whether the environment serves /testing-support.
  if (args.check) {
    emit({
      ok: true,
      operation: args.operation,
      actor: operation.actor,
      testingSupport: operation.testingSupport,
      summary: operation.summary,
    });
  }

  const caseRef = normaliseCaseRef(args.caseRef);
  process.env.CASE_NUMBER = caseRef;

  await mintS2SToken();

  const email = resolveActor(operation.actor);
  if (email) {
    await actAs(email);
    say(`Acting as ${email}`);
  }

  const result = await operation.run({
    caseRef,
    args: args.operationArgs,
    ccd: ccdInstance,
    pcsApi: pcsApiInstance,
  });

  emit({
    ok: true,
    operation: args.operation,
    caseId: caseRef,
    caseReference: dashed(caseRef),
    environment: process.env.PCS_ENV_LABEL ?? '',
    ...result,
  });
}

runMain(main);
