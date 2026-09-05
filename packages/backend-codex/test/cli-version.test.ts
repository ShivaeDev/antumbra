import { expect, it } from "@effect/vitest";
import { Effect, Logger, Option, RcRef } from "effect";
import { PINNED_CLI_VERSION } from "#protocol.ts";
import { makeCodexServers } from "#server.ts";
import { makeFakeAppServer } from "#test/fake.ts";
import { openThreadSession } from "#thread.ts";

const INSTALLED = "0.147.0";

const olderCli = () =>
	makeFakeAppServer({
		scripted: (method) => (method === "initialize" ? Option.some({ userAgent: `codex-cli/${INSTALLED} (test)` }) : Option.none()),
	});

const warnings = () => {
	const said: unknown[] = [];
	return {
		layer: Logger.layer([
			Logger.make(({ logLevel, message }) => {
				if (logLevel === "Warn") {
					said.push(message);
				}
			}),
		]),
		said,
	};
};

const session = (sessionId: string) => ({
	cwd: "/moorage",
	effort: Option.none(),
	model: Option.none(),
	resume: Option.none(),
	sessionId,
	tools: [],
});

it.live("the backend names the pin and the installed version once, however many app-servers it starts", () =>
	Effect.gen(function* () {
		const heard = warnings();
		yield* Effect.scoped(
			Effect.gen(function* () {
				const servers = yield* makeCodexServers({ skills: "/antumbra/skills", spawn: () => olderCli().process });
				yield* Effect.scoped(RcRef.get(servers));
				yield* Effect.scoped(RcRef.get(servers));
			}),
		).pipe(Effect.provide(heard.layer));

		expect(heard.said).toEqual([[expect.any(String), { pinned: PINNED_CLI_VERSION, version: INSTALLED }]]);
	}),
);

it.live("two sessions on one app-server hear it once", () =>
	Effect.gen(function* () {
		const heard = warnings();
		const fake = olderCli();
		yield* Effect.scoped(
			Effect.gen(function* () {
				const servers = yield* makeCodexServers({ skills: "/antumbra/skills", spawn: () => fake.process });
				const live = yield* RcRef.get(servers);
				yield* openThreadSession(live, session("session-1"));
				yield* openThreadSession(live, session("session-2"));
			}),
		).pipe(Effect.provide(heard.layer));

		expect(heard.said).toHaveLength(1);
	}),
);
