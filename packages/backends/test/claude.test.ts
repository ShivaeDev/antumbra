import { makePluginHost } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { claudePlugin } from "#claude/plugin.ts";

it.effect("the claude plugin registers its backend through the host", () =>
	Effect.gen(function* () {
		const host = yield* makePluginHost;
		yield* Effect.orDie(claudePlugin.activate(host.context));
		const backends = yield* host.backends;
		const claude = backends.get("claude");
		expect(claude).toBeDefined();
		expect(claude?.capabilities).toEqual({
			fork: true,
			liveInterrupt: true,
			multiClient: false,
			steer: false,
		});
	}),
);
