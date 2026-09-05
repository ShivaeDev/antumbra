import { makePluginHost } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { claudePlugin } from "#plugin.ts";

const hostFinding = (claude: Option.Option<string>) => makePluginHost({ findExecutable: () => Effect.succeed(claude) });

it.effect("the claude plugin registers its backend for the CLI it finds", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const host = yield* hostFinding(Option.some("/opt/homebrew/bin/claude"));
			yield* Effect.orDie(claudePlugin().activate(host.context));
			const backends = yield* host.backends;
			const backend = backends.get("claude");
			expect(backend?.capabilities).toEqual({
				imageInput: false,
			});
			const capacity = backend?.capacity;
			expect(capacity).toBeDefined();
			if (capacity !== undefined) {
				expect(yield* capacity.current).toEqual(Option.none());
			}
		}),
	),
);

it.effect("the claude plugin registers nothing when no CLI is found", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const host = yield* hostFinding(Option.none());
			yield* Effect.orDie(claudePlugin().activate(host.context));
			const backends = yield* host.backends;
			expect([...backends.keys()]).toEqual([]);
		}),
	),
);
