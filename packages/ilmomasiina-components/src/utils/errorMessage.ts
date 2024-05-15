import { TFunction, TOptions } from 'i18next';

import { ApiError } from '../api';

function errorString(
  part: 'title' | 'description',
  t: TFunction,
  error: ApiError,
  prefix: string | undefined,
  params: TOptions = {},
): string {
  // First try e.g. errors.SignupsClosed, then errors.403, then errors.default
  const types: string[] = [];
  if (error.code) types.push(error.code);
  if (error.status) types.push(String(error.status));
  types.push('default');

  // First try e.g. editSignup.errors.default, then errors.default
  const prefixes: string[] = [];
  if (prefix) prefixes.push(prefix);
  prefixes.push('errors');

  // Order, same examples:
  // - editSignup.errors.SignupsClosed
  // - errors.SignupsClosed
  // - editSignup.errors.403
  // - errors.403
  // - editSignup.errors.default
  // - errors.default
  const keys = types.flatMap((type) => prefixes.map((pre) => `${pre}.${type}.${part}`));
  // @ts-expect-error TODO: fix this
  return t(keys, params);
}

/** Localizes an error title.
 *
 * @param t The translation function `t`.
 * @param error The API error object thrown.
 * @param prefix Optional translation key prefix that specializes the error message to the relevant app function.
 * Don't end this with a period.
 * @param params Optional parameters for the translation function.
 */
export function errorTitle(t: TFunction, error: ApiError, prefix?: string, params?: TOptions) {
  return errorString('title', t, error, prefix, params);
}

/** Localizes an error description.
 *
 * @param t The translation function `t`.
 * @param error The API error object thrown.
 * @param prefix Optional translation key prefix that specializes the error message to the relevant app function.
 * Don't end this with a period.
 * @param params Optional parameters for the translation function.
 */
export function errorDesc(t: TFunction, error: ApiError, prefix?: string, params?: TOptions) {
  return errorString('description', t, error, prefix, params);
}
