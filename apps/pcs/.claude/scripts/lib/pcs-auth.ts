/**
 * Tokens and identity.
 *
 * Uses @hmcts/playwright-common's IdamUtils and ServiceAuthUtils directly rather
 * than the getAccessToken()/getS2SToken() wrappers in global-setup.config.ts: those
 * hardcode the AAT claimant solicitor, and these tools need several users — and a
 * different set entirely against the local IDAM simulator.
 *
 * Both helpers set the process.env variables the api-data header builders read, so
 * "acting as" a user is a side effect on the environment, matching how the E2E suite
 * works.
 */

import { IdamUtils, ServiceAuthUtils } from '@hmcts/playwright-common';

import { env, withStep } from './pcs-cli';

/**
 * Lease an S2S token for pcs_api.
 *
 * ServiceAuthUtils treats S2S_SECRET as optional and, when it is absent, posts to
 * /testing-support/lease with no Authorization header — which non-prod S2S and the
 * cftlib stub both accept, so no TOTP is needed.
 */
export async function mintS2SToken(): Promise<string> {
  // Coerced because playwright-common ships ESM-only types that the e2eTest
  // tsconfig's moduleResolution cannot see, so its return type is invisible here.
  const token = String(
    await withStep('s2s-lease', () =>
      new ServiceAuthUtils().retrieveToken({ microservice: 'pcs_api' }),
    ),
  );
  process.env.SERVICE_AUTH_TOKEN = token;
  return token;
}

/** A password-grant IDAM token for one user. */
export async function mintIdamToken(email: string): Promise<string> {
  return String(
    await withStep('idam-token', () =>
      new IdamUtils().generateIdamToken({
        username: email,
        password: env('PCS_IDAM_PASSWORD'),
        grantType: 'password',
        clientId: env('PCS_IDAM_CLIENT_ID'),
        clientSecret: env('PCS_IDAM_CLIENT_SECRET'),
        scope: 'profile openid roles',
      }),
    ),
  );
}

/** Become this user for every subsequent CCD call. */
export async function actAs(email: string): Promise<string> {
  const token = await mintIdamToken(email);
  process.env.BEARER_TOKEN = token;
  return token;
}

/**
 * The acting user's own IDAM id, read from the token rather than from the vault.
 *
 * PCS_SOLICITOR_AUTOMATION_UID is per-environment and can disagree with the user the
 * token actually belongs to — in perftest it does, and CCD then rejects a /case-users
 * read as being for "another user". The uid claim cannot disagree.
 */
export async function currentUserId(): Promise<string> {
  const token = process.env.BEARER_TOKEN ?? '';

  const claims = token.split('.')[1];
  if (claims) {
    try {
      const payload = JSON.parse(Buffer.from(claims, 'base64url').toString('utf8')) as {
        uid?: string;
      };
      if (payload.uid) return payload.uid;
    } catch {
      // Malformed token — fall through to userinfo.
    }
  }

  // The local IDAM simulator omits uid from the token and only serves it here.
  const response = await fetch(`${process.env.IDAM_WEB_URL ?? ''}/o/userinfo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return '';
  return ((await response.json()) as { uid?: string }).uid ?? '';
}
