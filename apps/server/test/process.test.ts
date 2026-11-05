import { flagship, serverProcess } from "@antumbra/app-testing/process.ts";
import { Forbidden } from "@shivaedev/errors/taxonomy.ts";
import { Effect, Exit, Option } from "effect";
import { expect } from "vitest";

serverProcess.it("answers a live query with its configured token", [], function* ({ listen }) {
	const server = yield* listen;
	expect(Option.isSome(yield* server.defaults())).toBe(true);
});
serverProcess.it("refuses a live query with the wrong token", [], function* ({ listen }) {
	const server = yield* listen;
	expect(Exit.isFailure(yield* Effect.exit(server.defaults("wrong-token")))).toBe(true);
});
serverProcess.it("serves the fleet's role settings", [], function* ({ listen }) {
	const server = yield* listen;
	expect(Option.map(yield* server.defaults(), (rows) => rows.map((row) => row.role))).toEqual(
		Option.some(["flagship", "captain", "crew", "smoother"]),
	);
});
serverProcess.it("hails the flagship captain through the derived socket client", [], function* ({ listen }) {
	const server = yield* listen;
	expect(Option.getOrNull(yield* server.hail)).toMatchObject({ role: "captain", voyageId: flagship });
});
serverProcess.it(
	"exits cleanly on SIGTERM and retains PostgreSQL without creating a legacy journal",
	[],
	function* ({ listen, postgresExists, legacyJournalExists, story }) {
		const server = yield* listen;
		story.tell("open TCP and Unix live readings");
		yield* server.keepConnected(false);
		yield* server.keepConnected(true);
		expect(yield* server.runnerCursor).toBe(-1);
		expect(yield* server.nativeCursor).toBe(-1);
		story.tell("commit a runner log cursor");
		expect(yield* server.ingest).toBe(5);
		expect(yield* server.stop).toBe(0);
		story.tell("restart the host and read the same runner cursor");
		const again = yield* listen;
		expect(again.runnerToken).toBe(server.runnerToken);
		expect(yield* again.nativeCursor).toBe(5);
		expect(Option.isSome(yield* again.defaults())).toBe(true);
		expect(yield* postgresExists).toBe(true);
		expect(yield* legacyJournalExists).toBe(false);
	},
);
serverProcess.it("exits 2 without announcing a port when no data directory is supplied", [], function* ({ withoutDirectory }) {
	expect(yield* withoutDirectory).toEqual({ code: 2, announced: [] });
});

serverProcess.it("refuses owner readings to the persistent runner credential", [], function* ({ listen }) {
	const server = yield* listen;
	expect(yield* Effect.flip(server.runnerSettings)).toBeInstanceOf(Forbidden);
});
