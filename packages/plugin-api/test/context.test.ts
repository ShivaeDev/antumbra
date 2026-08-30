import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import type { AgentBackend } from "#backend.ts";
import type { ChangeHost } from "#change-host.ts";
import { makePluginHost } from "#context.ts";
import { noSessionAudit } from "#session-audit.ts";

const fakeBackend = (tag: string): AgentBackend => ({
	audit: noSessionAudit,
	capabilities: {
		fork: false,
		imageInput: false,
		liveInterrupt: false,
		multiClient: false,
	},
	openSession: () => Effect.die("unused in this test"),
	tag,
});

const fakeChangeHost = (tag: string): ChangeHost => ({
	adopt: () => Effect.die("unused in this test"),
	capability: Effect.succeed({ available: true, detail: "scripted" }),
	observe: () => Effect.die("unused in this test"),
	open: () => Effect.die("unused in this test"),
	supports: () => true,
	tag,
});

const emptyHost = makePluginHost({
	findExecutable: () => Effect.succeed(Option.none<string>()),
});

it.effect("collects registered backends by tag", () =>
	Effect.gen(function* () {
		const host = yield* emptyHost;
		yield* host.context.registerAgentBackend(fakeBackend("claude"));
		yield* host.context.registerAgentBackend(fakeBackend("codex"));
		const backends = yield* host.backends;
		expect([...backends.keys()].sort()).toEqual(["claude", "codex"]);
	}),
);

it.effect("rejects a second backend with the same tag", () =>
	Effect.gen(function* () {
		const host = yield* emptyHost;
		yield* host.context.registerAgentBackend(fakeBackend("claude"));
		const outcome = yield* host.context.registerAgentBackend(fakeBackend("claude")).pipe(Effect.flip);
		expect(outcome._tag).toBe("DuplicateBackendTag");
	}),
);

it.effect("collects registered change hosts by tag", () =>
	Effect.gen(function* () {
		const host = yield* emptyHost;
		yield* host.context.registerChangeHost(fakeChangeHost("github"));
		const hosts = yield* host.changeHosts;
		expect([...hosts.keys()]).toEqual(["github"]);
	}),
);

it.effect("rejects a second change host with the same tag", () =>
	Effect.gen(function* () {
		const host = yield* emptyHost;
		yield* host.context.registerChangeHost(fakeChangeHost("github"));
		const outcome = yield* host.context.registerChangeHost(fakeChangeHost("github")).pipe(Effect.flip);
		expect(outcome._tag).toBe("DuplicateChangeHostTag");
	}),
);

it.effect("secrets and settings are declared but empty in v0", () =>
	Effect.gen(function* () {
		const host = yield* emptyHost;
		const secret = yield* host.context.secrets.get("anything");
		const setting = yield* host.context.settings.get("anything");
		expect(secret._tag).toBe("None");
		expect(setting._tag).toBe("None");
	}),
);
