import { makePluginHost } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { vi } from "vitest";
import { codexPlugin } from "#plugin.ts";

// why: whether a ChatGPT app is installed is a fact about the machine running
// the test, so the fallback answers none and the login PATH is what each case
// varies.
vi.mock("#adapters/chatgpt-bundle.ts", () => ({
	bundledCodex: Effect.succeed(Option.none()),
}));

const hostFinding = (codex: Option.Option<string>) =>
	makePluginHost({ findExecutable: () => Effect.succeed(codex) });

it.effect("the codex plugin registers its backend for the CLI it finds", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const host = yield* hostFinding(Option.some("/opt/homebrew/bin/codex"));
			yield* Effect.orDie(
				codexPlugin({ cwd: "/tmp/antumbra" }).activate(host.context),
			);
			const backends = yield* host.backends;
			const backend = backends.get("codex");
			expect(backend?.capabilities.imageInput).toBe(true);
			const capacity = backend?.capacity;
			expect(capacity).toBeDefined();
			if (capacity !== undefined) {
				expect(yield* capacity.current).toEqual(Option.none());
			}
		}),
	),
);

it.effect("the codex plugin registers nothing when no CLI is found", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const host = yield* hostFinding(Option.none());
			yield* Effect.orDie(
				codexPlugin({ cwd: "/tmp/antumbra" }).activate(host.context),
			);
			const backends = yield* host.backends;
			expect([...backends.keys()]).toEqual([]);
		}),
	),
);
