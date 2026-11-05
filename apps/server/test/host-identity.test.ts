import { it } from "@antumbra/app-testing/entry.ts";
import { Forbidden, Unauthorized } from "@shivaedev/errors/taxonomy.ts";
import { Effect, Exit } from "effect";
import { expect } from "vitest";

it.app("a runner credential grants runner calls and refuses owner calls and its next request after revocation", function* ({ host }) {
	const server = yield* host();
	const runners = [];
	for (const connect of [server.credentials, server.unixCredentials]) {
		const runner = yield* connect(server.machineToken);
		expect(yield* runner["runner.cursor"]({ logId: "identity-story" })).toBe(-1);
		expect(yield* Effect.flip(runner["settings.counts"]({}))).toBeInstanceOf(Forbidden);
		runners.push(runner);
	}
	yield* server.revoke;
	for (const runner of runners) expect(yield* Effect.flip(runner["runner.cursor"]({ logId: "identity-story" }))).toBeInstanceOf(Unauthorized);
});

it.app("missing and invalid credentials cannot read owner settings", function* ({ host }) {
	const server = yield* host();
	for (const connect of [server.credentials, server.unixCredentials]) {
		const anonymous = yield* connect();
		expect(yield* Effect.flip(anonymous["settings.counts"]({}))).toBeInstanceOf(Unauthorized);
		const invalid = yield* connect("invalid-credential");
		expect(Exit.isFailure(yield* Effect.exit(invalid["settings.counts"]({})))).toBe(true);
	}
});

it.app("the published host removes its Unix socket on scope release", function* ({ host }) {
	const server = yield* host();
	expect(yield* server.socketExists).toBe(true);
	yield* server.stop;
	expect(yield* server.socketExists).toBe(false);
});
