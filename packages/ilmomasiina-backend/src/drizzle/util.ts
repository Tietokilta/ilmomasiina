/* eslint-disable import/prefer-default-export */
import { randomBytes } from 'crypto';

/**
 * Portable way to sort NULLs first across databases.
 *
 * Postgres considers NULLs greater than all other values, MySQL and SQLite consider them less than all other values.
 * https://www.postgresql.org/docs/8.3/queries-order.html
 * https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html
 * https://www.sqlite.org/datatype3.html#comparisons
 */
export function ascNullsFirst() {
  return 'ASC NULLS FIRST';
}

// 5 * 12 bits per ID = 60 bits of entropy
export const RANDOM_ID_LENGTH = 12;

// Base32 (RFC4648) alphabet in lowercase
export const RANDOM_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

export function generateRandomId() {
  // Could probably use Math.random() as well, but might as well make it secure.
  const bytes = randomBytes(RANDOM_ID_LENGTH);
  return Array.from(bytes)
    // eslint-disable-next-line no-bitwise
    .map((b: number) => RANDOM_ID_ALPHABET[b & 31])
    .join('');
}
