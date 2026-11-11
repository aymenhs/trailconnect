// A stand-in for the mysql2 client, for tests of `db.ts` without a database.
//
// Drizzle builds the real SQL and hands it to `client.query`; this records each
// statement and answers from the test's `respond` callback. That is enough to
// check what a query filters on (a leak is usually a missing WHERE clause) and
// what a function does with the rows it gets back. It does not execute SQL, so
// it proves nothing about MySQL semantics — that still needs a real database.

import { getTableColumns, type Table } from "drizzle-orm";

export type RecordedQuery = { sql: string; params: unknown[] };

/** Rows (for a SELECT) or a result header (for a write). */
export type QueryAnswer =
  | { rows: unknown[][] }
  | { insertId?: number; affectedRows?: number };

export type Responder = (query: RecordedQuery) => QueryAnswer | undefined;

const EMPTY_WRITE = { insertId: 1, affectedRows: 1 };

export function createRecordingClient(respond: Responder = () => undefined) {
  const queries: RecordedQuery[] = [];
  const query = async (
    statement: string | { sql: string },
    params: unknown[] = []
  ) => {
    const sql = typeof statement === "string" ? statement : statement.sql;
    const recorded = { sql, params };
    queries.push(recorded);
    const answer = respond(recorded);
    if (answer && "rows" in answer) return [answer.rows, []];
    if (/^\s*select/i.test(sql)) return [[], []];
    return [{ ...EMPTY_WRITE, ...answer }, []];
  };
  return { client: { query, execute: query }, queries };
}

/** MySQL's text form of a date, which is what the driver hands to drizzle. */
function toDriverValue(value: unknown): unknown {
  if (!(value instanceof Date)) return value;
  return value.toISOString().replace("T", " ").replace("Z", "");
}

/**
 * A full-table row in column order, as `db.select().from(table)` expects it
 * back. Columns missing from `values` come back as null.
 */
export function tableRow(
  table: Table,
  values: Record<string, unknown>
): unknown[] {
  return Object.keys(getTableColumns(table)).map(key =>
    toDriverValue(values[key] ?? null)
  );
}

/** The recorded statements touching `table`, e.g. "`events`". */
export function queriesOn(queries: RecordedQuery[], table: string) {
  return queries.filter(query => query.sql.includes(`from \`${table}\``));
}
