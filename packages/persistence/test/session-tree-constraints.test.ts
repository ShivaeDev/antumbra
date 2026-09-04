import type { DatabaseSync } from "node:sqlite";
import { it } from "@effect/vitest";
import { Effect, Exit } from "effect";
import { expect } from "vitest";
import { applyMigrations } from "#adapters/migrator.ts";
import type { DatabaseFilePath } from "#data-dir.ts";
import { freshMigrationDatabase, withSqlite } from "#test/migration-harness.ts";
import { packagedMigrationsDirectory } from "#testing.ts";

interface SessionNode {
	readonly id: string;
	readonly parentSessionId: string | null;
	readonly rootSessionId: string;
}

const openNode = (sqlite: DatabaseSync, node: SessionNode) =>
	sqlite
		.prepare('INSERT INTO "agentSession" ("id", "agentId", "cwd", "status", "rootSessionId", "parentSessionId") VALUES (?, ?, ?, ?, ?, ?)')
		.run(node.id, "agent-one", "/tmp/agent-one", "open", node.rootSessionId, node.parentSessionId);

const refused = (database: DatabaseFilePath, act: (sqlite: DatabaseSync) => void) =>
	Exit.isFailure(Effect.runSyncExit(Effect.try(() => withSqlite(database, act))));

const openRootedFleet = Effect.gen(function* () {
	const database = freshMigrationDatabase();
	yield* applyMigrations({ database, migrationsDirectory: packagedMigrationsDirectory });
	withSqlite(database, (sqlite) => {
		sqlite
			.prepare('INSERT INTO "agent" ("id", "role", "charter", "status") VALUES (?, ?, ?, ?)')
			.run("agent-one", "hand", "sound the shallows", "alive");
		openNode(sqlite, { id: "session-open", parentSessionId: null, rootSessionId: "session-open" });
		sqlite.prepare('INSERT INTO "sessionEvent" ("sessionId", "seq", "kind", "payload") VALUES (?, ?, ?, ?)').run("session-open", 0, "raw", "opened");
	});
	return database;
});

it.effect("holds the Session tree and its events to referential truth", () =>
	Effect.gen(function* () {
		const database = yield* openRootedFleet;

		expect(
			refused(database, (sqlite) =>
				sqlite
					.prepare('INSERT INTO "sessionEvent" ("sessionId", "seq", "kind", "payload") VALUES (?, ?, ?, ?)')
					.run("session-missing", 0, "raw", "orphan"),
			),
		).toBe(true);
		expect(
			refused(database, (sqlite) =>
				openNode(sqlite, { id: "session-orphan-child", parentSessionId: "session-missing", rootSessionId: "session-open" }),
			),
		).toBe(true);
		expect(refused(database, (sqlite) => sqlite.prepare('DELETE FROM "agentSession" WHERE "id" = ?').run("session-open"))).toBe(true);
	}),
);

it.effect("admits one open root per Agent while welcoming subsessions", () =>
	Effect.gen(function* () {
		const database = yield* openRootedFleet;
		const openSession = (node: SessionNode) => (refused(database, (sqlite) => openNode(sqlite, node)) ? "refused" : "admitted");

		expect(openSession({ id: "session-rival-root", parentSessionId: null, rootSessionId: "session-rival-root" })).toBe("refused");
		expect(openSession({ id: "session-child", parentSessionId: "session-open", rootSessionId: "session-open" })).toBe("admitted");
		expect(openSession({ id: "session-grandchild", parentSessionId: "session-child", rootSessionId: "session-open" })).toBe("admitted");
	}),
);
