import { Effect } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import type { SqlError } from "effect/unstable/sql/SqlError";

export interface UpgradeStep {
	readonly number: number;
	readonly apply: (sql: SqlClient) => Effect.Effect<void, SqlError>;
}

const journalSubject: UpgradeStep = {
	number: 1,
	apply: Effect.fn("journal.upgrade.journalSubject")(function* (sql: SqlClient) {
		const columns = yield* sql`SELECT "name" FROM pragma_table_info('journal')`;
		if (!columns.some((column) => column.name === "subject")) yield* sql`ALTER TABLE "journal" ADD COLUMN "subject" TEXT`;
		yield* sql`CREATE INDEX IF NOT EXISTS "journal_subject" ON "journal" ("name", "subject", "seq" DESC)`;
	}),
};

export const steps: readonly UpgradeStep[] = [journalSubject];

export const pendingUpgrades = Effect.fn("journal.pendingUpgrades")(function* (sql: SqlClient, declared: readonly UpgradeStep[]) {
	const rows = yield* sql`PRAGMA user_version`;
	const reached = Number(rows[0]?.user_version ?? 0);
	const pending: UpgradeStep[] = [];
	for (const step of declared) {
		if (step.number > reached) pending.push(step);
	}
	return pending;
});

export const applyUpgrades = Effect.fn("journal.applyUpgrades")(function* (sql: SqlClient, pending: readonly UpgradeStep[]) {
	for (const step of pending) {
		yield* step.apply(sql);
		yield* sql.unsafe(`PRAGMA user_version = ${step.number}`);
	}
});
