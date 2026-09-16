/**
 * One HTTP helper, shaped to consume the api-data modules' instance configs
 * directly so the header sets and base URLs come from pcs-api's E2E tree rather
 * than being restated here.
 */

import { emit } from './pcs-cli';

/**
 * An axios-style instance config as the api-data modules produce it.
 *
 * `headers` is deliberately loose: several of those modules are typed as
 * AxiosRequestConfig, whose header type is a union far wider than a string map, and
 * narrowing it here would reject them. call() coerces the values.
 */
export interface ApiInstance {
  baseURL?: string;
  headers?: Record<string, unknown>;
}

export interface CallResult {
  status: number;
  body: unknown;
  url: string;
}

export async function call(
  method: string,
  instance: ApiInstance,
  path: string,
  body?: unknown,
): Promise<CallResult> {
  const url = `${instance.baseURL ?? ''}${path}`;

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(instance.headers ?? {})) {
    if (value !== undefined && value !== null) headers[key] = String(value);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let parsed: unknown = text;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { status: response.status, body: parsed, url };
}

export interface FailureDetail {
  [key: string]: unknown;
}

/**
 * Report a failed call and stop. The step name is what the wrapper's error table
 * keys on, so it should name the operation rather than the transport.
 */
export function fail(step: string, result: CallResult, detail: FailureDetail = {}): never {
  emit({
    ok: false,
    step,
    status: result.status,
    endpoint: result.url,
    body: result.body,
    ...detail,
  });
}

/** Stop unless the call succeeded. */
export function requireOk(step: string, result: CallResult, detail: FailureDetail = {}): void {
  if (result.status < 200 || result.status >= 300) {
    fail(step, result, detail);
  }
}
