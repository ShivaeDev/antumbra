import { flagship, serverProcess } from "@antumbra/app-testing/process.ts";
import { Unauthorized } from "@shivaedev/errors/taxonomy.ts";
import { Effect, Option } from "effect";
import * as RpcMessage from "effect/rpc/RpcMessage";
import { expect } from "vitest";

serverProcess.it("answers the protocol ping on its announced websocket", [], function* ({ listen }) {
	const server = yield* listen;
	expect(yield* server.ping).toEqual([RpcMessage.constPong]);
});
serverProcess.it("answers a live query with its configured token", [], function* ({ listen }) {
	const server = yield* listen;
	expect(Option.isSome(yield* server.defaults())).toBe(true);
});
serverProcess.it("refuses a live query with the wrong token", [], function* ({ listen }) {
	const server = yield* listen;
	expect(yield* Effect.flip(server.defaults("wrong-token"))).toBeInstanceOf(Unauthorized);
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
	function* ({ listen, postgresExists, legacyJournalExists }) {
		const server = yield* listen;
		yield* server.keepConnected;
		expect(yield* server.stop).toBe(0);
		const again = yield* listen;
		expect(Option.isSome(yield* again.defaults())).toBe(true);
		expect(yield* postgresExists).toBe(true);
		expect(yield* legacyJournalExists).toBe(false);
	},
);
serverProcess.it("exits 2 without announcing a port when no data directory is supplied", [], function* ({ withoutDirectory }) {
	expect(yield* withoutDirectory).toEqual({ code: 2, announced: [] });
});
