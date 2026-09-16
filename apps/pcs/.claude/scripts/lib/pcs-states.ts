/**
 * The PCS case states, and which of them anything can actually reach.
 *
 * Shared by both runners so `create-case <fixture> <state>` and
 * `manage-case <ref> set-state <state>` accept and reject exactly the same set.
 * Derived from pcs-api's State.java and CaseStateOption.java.
 */

/** The three states the make-a-claim journey produces, in the order it reaches them. */
export const CLAIM_STATES = [
  'AWAITING_SUBMISSION_TO_HMCTS',
  'PENDING_CASE_ISSUED',
  'CASE_ISSUED',
] as const;

/**
 * CaseStateOption — every state changeCaseState can target, and the only ones.
 * Note the absence of CASE_ISSUED: it is a valid pre-state for the event but not a
 * target, so a case cannot be moved back to it once it has left.
 */
export const ADVANCED_STATES = [
  'JUDICIAL_REFERRAL',
  'HEARING_READINESS',
  'PREPARE_FOR_HEARING_CONDUCT_HEARING',
  'DECISION_OUTCOME',
  'CASE_PROGRESSION',
  'ALL_FINAL_ORDERS_ISSUED',
  'CASE_STAYED',
  'BREATHING_SPACE',
] as const;

/** Declared in State.java but written by no event in pcs-api. */
export const UNREACHABLE_STATES = ['AWAITING_RESUBMISSION_TO_HMCTS', 'CLOSED'] as const;

export const ALL_STATES: readonly string[] = [...CLAIM_STATES, ...ADVANCED_STATES];

/** Accepts CASE_ISSUED and case-issued alike. */
export function normaliseState(input: string): string {
  return input.trim().toUpperCase().replace(/-/g, '_');
}

export function isAdvancedState(state: string): boolean {
  return (ADVANCED_STATES as readonly string[]).includes(state);
}

export function isUnreachableState(state: string): boolean {
  return (UNREACHABLE_STATES as readonly string[]).includes(state);
}

/**
 * Explains why a state cannot be used, or returns null when it can. `via` narrows
 * the answer: changeCaseState can only reach the advanced eight, so set-state has to
 * reject CASE_ISSUED even though create-case accepts it.
 */
export function rejectState(state: string, via: 'create' | 'change'): string | null {
  if (isUnreachableState(state)) {
    return `${state} is declared in State.java but no event in pcs-api ever writes it, `
      + 'so no case can be put into it.';
  }

  if (via === 'change') {
    if (isAdvancedState(state)) return null;
    if (state === 'CASE_ISSUED') {
      return 'changeCaseState cannot target CASE_ISSUED — it is a valid state to move *from*, '
        + 'but not to, so a case cannot return to it.\n'
        + 'To issue a case that is still in PENDING_CASE_ISSUED, use the pay operation.';
    }
    if ((CLAIM_STATES as readonly string[]).includes(state)) {
      return `${state} is reached by the make-a-claim journey, not by changeCaseState. `
        + 'Create a case in it with /pcs:create-case instead.';
    }
    return `unknown state: ${state}\nvalid: ${ADVANCED_STATES.join(', ')}`;
  }

  if (ALL_STATES.includes(state)) return null;
  return `unknown state: ${state}\nvalid: ${ALL_STATES.join(', ')}`;
}
