/**
 * Transaction utilities for database operations
 */

import { db } from "./index";

type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Execute a callback within a database transaction
 * Automatically commits on success, rolls back on error
 *
 * @example
 * await withTransaction(async (tx) => {
 *   await tx.delete(apiKeys).where(eq(apiKeys.userId, userId));
 *   await tx.delete(users).where(eq(users.id, userId));
 * });
 */
export async function withTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return db.transaction(callback);
}

export type { TransactionClient };
