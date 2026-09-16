/**
 * Fixture discovery.
 *
 * The "fixture case types" are the claim payloads the two Playwright suites
 * already curate. They are read out of the live modules rather than catalogued
 * here, so adding a payload to any of the four sources makes it appear in
 * --list with no change to this tooling.
 *
 * pcs-api's modules are reached through its tsconfig aliases. pcs-frontend's are
 * reached by absolute path, because its clone location is only known at runtime —
 * and its tree uses relative imports throughout, so it needs no alias support.
 */

import { submitCaseApiData } from '@data/api-data/submitCase.api.data';
import { submitCaseApiDataWales } from '@data/api-data/submitCaseWales.api.data';

export type FixtureRepo = 'api' | 'web';

export interface Fixture {
  id: string;
  repo: FixtureRepo;
  country: string;
  constName: string;
  source: string;
  claimantType: string;
  fields: number;
  /**
   * How many document references the payload carries.
   *
   * Non-zero means the fixture needs a document store holding those exact UUIDs,
   * which rules it out locally: cftlib has no dm-store, and CCD asks CDAM about
   * every document it is given.
   */
  documents: number;
  payload: Record<string, unknown>;
}

interface Source {
  repo: FixtureRepo;
  label: string;
  container: Record<string, unknown> | undefined;
}

function frontendSources(): Source[] {
  const dir = process.env.PCS_FRONTEND_UI_DIR;
  if (!dir) return [];

  const load = (file: string): Record<string, unknown> | undefined => {
    try {
      return require(`${dir}/data/api-data/${file}`);
    } catch {
      return undefined;
    }
  };

  const england = load('submitCase.api.data');
  const wales = load('submitCaseWales.api.data');

  return [
    {
      repo: 'web',
      label: 'pcs-frontend/src/test/ui/data/api-data/submitCase.api.data.ts',
      container: england?.submitCaseApiData as Record<string, unknown> | undefined,
    },
    {
      repo: 'web',
      label: 'pcs-frontend/src/test/ui/data/api-data/submitCaseWales.api.data.ts',
      container: wales?.submitCaseApiDataWales as Record<string, unknown> | undefined,
    },
  ];
}

function sources(): Source[] {
  return [
    {
      repo: 'api',
      label: 'pcs-api/src/e2eTest/data/api-data/submitCase.api.data.ts',
      container: submitCaseApiData as unknown as Record<string, unknown>,
    },
    {
      repo: 'api',
      label: 'pcs-api/src/e2eTest/data/api-data/submitCaseWales.api.data.ts',
      container: submitCaseApiDataWales as unknown as Record<string, unknown>,
    },
    ...frontendSources(),
  ];
}

/**
 * A payload is any member that is an object carrying a legislativeCountry. That
 * predicate drops the two non-payload members every module has —
 * submitCaseEventName (a string) and submitCaseApiEndPoint (a function).
 */
function isPayload(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { legislativeCountry?: unknown }).legislativeCountry === 'string'
  );
}

/**
 * submitCasePayloadCaseFileView -> case-file-view; submitCasePayload -> base.
 * The leading match is case-insensitive because one key in the Wales module is
 * spelled submitcaseNonRentSecureSingleDefendant.
 */
function slugFor(key: string): string {
  const rest = key.replace(/^submitcase/i, '').replace(/^payload/i, '');
  if (!rest) return 'base';
  return rest
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function claimantTypeOf(payload: Record<string, unknown>): string {
  const claimantType = payload.claimantType as { value?: { code?: string } } | undefined;
  return claimantType?.value?.code ?? '';
}

/**
 * Count document references anywhere in the payload.
 *
 * A CCD Document is recognised by its document_url, whatever it is nested under —
 * the fixtures put them in notice_Documents, tenancy_TenancyLicenceDocuments,
 * rentArrears_StatementDocuments, walesDocs_*, additionalDocuments[].document and
 * more, so matching on key names would miss some.
 */
function countDocuments(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce<number>((total, item) => total + countDocuments(item), 0);
  }
  if (typeof value !== 'object' || value === null) return 0;

  const record = value as Record<string, unknown>;
  if (typeof record.document_url === 'string') return 1;

  return Object.values(record).reduce<number>((total, item) => total + countDocuments(item), 0);
}

export function discoverFixtures(): Fixture[] {
  const found: Fixture[] = [];

  for (const source of sources()) {
    if (!source.container) continue;

    for (const key of Object.keys(source.container)) {
      let value: unknown;
      try {
        // Several payloads are getters, so reading is what materialises them.
        value = source.container[key];
      } catch {
        continue;
      }
      if (!isPayload(value)) continue;

      const country = String(value.legislativeCountry);
      found.push({
        id: `${source.repo}/${country.toLowerCase()}/${slugFor(key)}`,
        repo: source.repo,
        country,
        constName: key,
        source: source.label,
        claimantType: claimantTypeOf(value),
        fields: Object.keys(value).length,
        documents: countDocuments(value),
        payload: value,
      });
    }
  }

  // Two keys in one module could in principle kebab to the same slug — differing
  // only in capitalisation, say. Suffix the duplicates with an index so each stays
  // addressable by an exact id; appending the slug again would give both the same
  // new id and leave neither resolvable.
  const counts = new Map<string, number>();
  for (const fixture of found) {
    counts.set(fixture.id, (counts.get(fixture.id) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  for (const fixture of found) {
    if ((counts.get(fixture.id) ?? 0) > 1) {
      const nth = (seen.get(fixture.id) ?? 0) + 1;
      seen.set(fixture.id, nth);
      fixture.id = `${fixture.id}-${nth}`;
    }
  }

  return found.sort((a, b) => a.id.localeCompare(b.id));
}

export class FixtureLookupError extends Error {
  constructor(
    readonly query: string,
    readonly candidates: Fixture[],
    readonly reason: 'ambiguous' | 'unknown',
  ) {
    super(`could not resolve fixture '${query}'`);
  }
}

/**
 * Exact id, then the raw const name, then a unique suffix match. Ambiguity is an
 * error with the candidates listed — never a guess, because england/base exists
 * in both repos and the two payloads differ.
 */
export function resolveFixture(fixtures: Fixture[], query: string): Fixture {
  const wanted = query.trim().replace(/^\/+|\/+$/g, '');
  const lower = wanted.toLowerCase();

  const exact = fixtures.filter(f => f.id === lower);
  if (exact.length === 1) return exact[0];

  const byConst = fixtures.filter(f => f.constName === wanted);
  if (byConst.length === 1) return byConst[0];
  if (byConst.length > 1) throw new FixtureLookupError(query, byConst, 'ambiguous');

  const bySuffix = fixtures.filter(f => f.id === lower || f.id.endsWith(`/${lower}`));
  if (bySuffix.length === 1) return bySuffix[0];
  if (bySuffix.length > 1) throw new FixtureLookupError(query, bySuffix, 'ambiguous');

  // Compare with separators stripped too, so a mis-hyphenated 'case-fileview'
  // still points at case-file-view rather than just saying "run --list".
  const bare = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const wantedBare = bare(wanted);
  const near = fixtures.filter(
    f =>
      f.id.includes(lower) ||
      f.constName.toLowerCase().includes(lower) ||
      bare(f.id).includes(wantedBare) ||
      bare(f.constName).includes(wantedBare),
  );
  throw new FixtureLookupError(query, near, near.length ? 'ambiguous' : 'unknown');
}

export function formatFixtureTable(fixtures: Fixture[]): string {
  const width = Math.max(2, ...fixtures.map(f => f.id.length));
  const lines = [
    `${"ID".padEnd(width)}  COUNTRY  FIELDS  DOCS  CLAIMANT TYPE                      SOURCE CONST`,
  ];
  for (const f of fixtures) {
    lines.push(
      [
        f.id.padEnd(width),
        f.country.padEnd(7),
        String(f.fields).padStart(6),
        String(f.documents).padStart(4),
        (f.claimantType || '-').padEnd(34),
        f.constName,
      ].join('  '),
    );
  }
  return lines.join('\n');
}
