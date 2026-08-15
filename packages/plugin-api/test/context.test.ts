import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import type { AgentBackend } from "#backend.ts";
import { makePluginHost } from "#context.ts";

const fakeBackend = (tag: string): AgentBackend => ({
	capabilities: {
		fork: false,
		liveInterrupt: false,
		multiClient: false,
	},
	openSession: () => Effect.die("unused in this test"),
	tag,
});

it.effect("collects registered backends by tag", () =>
	Effect.gen(function* () {
		const host = yield* makePluginHost;
		yield* host.context.registerAgentBackend(fakeBackend("claude"));
		yield* host.context.registerAgentBackend(fakeBackend("codex"));
		const backends = yield* host.backends;
		expect([...backends.keys()].sort()).toEqual(["claude", "codex"]);
	}),
);

it.effect("rejects a second backend with the same tag", () =>
	Effect.gen(function* () {
		const host = yield* makePluginHost;
		yield* host.context.registerAgentBackend(fakeBackend("claude"));
		const outcome = yield* host.context
			.registerAgentBackend(fakeBackend("claude"))
			.pipe(Effect.flip);
		expect(outcome._tag).toBe("DuplicateBackendTag");
	}),
);

it.effect("secrets and settings are declared but empty in v0", () =>
	Effect.gen(function* () {
		const host = yield* makePluginHost;
		const secret = yield* host.context.secrets.get("anything");
		const setting = yield* host.context.settings.get("anything");
		expect(secret._tag).toBe("None");
		expect(setting._tag).toBe("None");
	}),
);
