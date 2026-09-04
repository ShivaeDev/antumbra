import type { DatabaseSync } from "node:sqlite";
import { it } from "@effect/vitest";
import { Effect, Exit } from "effect";
import { expect } from "vitest";
import { applyMigrations } from "#adapters/migrator.ts";
import type { DatabaseFilePath } from "#data-dir.ts";
import { freshMigrationDatabase, withSqlite } from "#test/migration-harness.ts";
import { packagedMigrationsDirectory } from "#testing.ts";

const recordInput = (sqlite: DatabaseSync, id: string, deliveryStatus: string) =>
	sqlite
		.prepare('INSERT INTO "sessionInput" ("id", "sessionId", "requestDigest", "deliveryStatus") VALUES (?, ?, ?, ?)')
		.run(id, "session-open", `digest-${id}`, deliveryStatus);

const recordTextPart = (sqlite: DatabaseSync, inputId: string, text: string) =>
	sqlite.prepare('INSERT INTO "sessionInputPart" ("inputId", "position", "kind", "text") VALUES (?, ?, ?, ?)').run(inputId, 0, "text", text);

const refused = (database: DatabaseFilePath, act: (sqlite: DatabaseSync) => void) =>
	Exit.isFailure(Effect.runSyncExit(Effect.try(() => withSqlite(database, act))));

const openSession = Effect.gen(function* () {
	const database = freshMigrationDatabase();
	yield* applyMigrations({ database, migrationsDirectory: packagedMigrationsDirectory });
	withSqlite(database, (sqlite) => {
		sqlite
			.prepare('INSERT INTO "agent" ("id", "role", "charter", "status") VALUES (?, ?, ?, ?)')
			.run("agent-one", "hand", "sound the shallows", "alive");
		sqlite
			.prepare('INSERT INTO "agentSession" ("id", "agentId", "cwd", "status", "rootSessionId", "parentSessionId") VALUES (?, ?, ?, ?, ?, ?)')
			.run("session-open", "agent-one", "/tmp/agent-one", "open", "session-open", null);
	});
	return database;
});

it.effect("admits a session input only while it is pending", () =>
	Effect.gen(function* () {
		const database = yield* openSession;
		const record = (deliveryStatus: string) =>
			refused(database, (sqlite) => recordInput(sqlite, `input-${deliveryStatus}`, deliveryStatus)) ? "refused" : "admitted";

		expect(record("accepted")).toBe("refused");
		expect(record("pending")).toBe("admitted");
	}),
);

it.effect("holds session input parts to well-formed immutable text", () =>
	Effect.gen(function* () {
		const database = yield* openSession;
		withSqlite(database, (sqlite) => recordInput(sqlite, "input-one", "pending"));
		const record = (text: string) => (refused(database, (sqlite) => recordTextPart(sqlite, "input-one", text)) ? "refused" : "admitted");

		expect(record("")).toBe("refused");
		expect(record("sound the shallows")).toBe("admitted");
		expect(
			refused(database, (sqlite) => sqlite.prepare('UPDATE "sessionInputPart" SET "text" = ? WHERE "inputId" = ?').run("rewritten", "input-one")),
		).toBe(true);
	}),
);
