/**
 * The process boundary for both runners.
 *
 * Exactly one JSON object goes to stdout, because the wrapper scripts parse it;
 * everything a human reads goes to stderr. Nothing in here knows about CCD.
 */

/** Commentary for a human. Never stdout — that channel carries the result. */
export function say(message: string): void {
  process.stderr.write(`${message}\n`);
}

/** A variable the wrapper script is responsible for exporting. */
export function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — the wrapper script should have exported it`);
  }
  return value;
}

/**
 * A problem with what the caller asked for, rather than with the environment.
 *
 * Exits 2 to match the wrapper scripts' convention, having written the explanation
 * to stderr and nothing to stdout. The wrapper sees no result object and passes the
 * code straight through, so its own diagnosis does not bury this message.
 */
export function usageError(...lines: string[]): never {
  for (const line of lines) say(line);
  process.exit(2);
}

/** Signals that a result has been written and unwinding should stop quietly. */
export class Emitted extends Error {
  constructor() {
    super('result already emitted');
  }
}

/**
 * Write the result and stop.
 *
 * Sets exitCode and throws rather than calling process.exit: the wrapper captures
 * stdout through a pipe, where Node's writes are asynchronous, and exiting straight
 * after a write can truncate anything over the pipe buffer — a 422 that echoes case
 * data is easily large enough. Draining happens as the process winds down.
 */
export function emit(payload: unknown): never {
  const ok = (payload as { ok?: boolean }).ok !== false;
  process.stdout.write(`${JSON.stringify(payload)}\n`);
  process.exitCode = ok ? 0 : 1;
  throw new Emitted();
}

/** Write to stdout directly, for output that is not a result object — a table. */
export function print(text: string): never {
  process.stdout.write(`${text}\n`);
  process.exit(0);
}

/**
 * Run a runner's main.
 *
 * An Emitted unwind exits quietly with the code emit already set. Anything else
 * still produces a result object, so the wrapper always has something to translate
 * rather than falling back to "the runner produced no output".
 */
export function runMain(main: () => Promise<void>, step = 'runner'): void {
  main().catch((error: unknown) => {
    if (error instanceof Emitted) return;
    process.stdout.write(
      `${JSON.stringify({
        ok: false,
        step: stepOf(error) ?? step,
        status: statusOf(error),
        endpoint: '',
        body: { message: error instanceof Error ? error.message : String(error) },
      })}\n`,
    );
    process.exitCode = 1;
  });
}

/** Tags a rejection with the step it happened in, for the wrapper's error table. */
export function withStep<T>(step: string, work: () => Promise<T>): Promise<T> {
  return work().catch((error: unknown) => {
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
      pcsStep: step,
    });
  });
}

function stepOf(error: unknown): string | undefined {
  return (error as { pcsStep?: string })?.pcsStep;
}

/**
 * The HTTP status behind a thrown error.
 *
 * The IDAM and S2S helpers reject rather than returning a status, so without this a
 * rejected password surfaces as "HTTP 0" and the wrapper's credential guidance
 * never fires.
 */
function statusOf(error: unknown): number {
  const candidates = [
    (error as { status?: unknown })?.status,
    (error as { statusCode?: unknown })?.statusCode,
    (error as { response?: { status?: unknown } })?.response?.status,
    (error as { cause?: { status?: unknown } })?.cause?.status,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'number') return candidate;
  }
  // Often the message is the only place it appears, e.g. "… -> 401".
  const match = /\b(4\d{2}|5\d{2})\b/.exec(error instanceof Error ? error.message : '');
  return match ? Number(match[1]) : 0;
}
