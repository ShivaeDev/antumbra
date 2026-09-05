import { makePluginHost } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { opencodePlugin } from "#plugin.ts";

const hostFinding = (opencode: Option.Option<string>) => makePluginHost({ findExecutable: () => Effect.succeed(opencode) });

it.effect("registers the backend for the opencode CLI it finds", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const host = yield* hostFinding(Option.some("/opt/homebrew/bin/opencode"));
			yield* Effect.orDie(
				opencodePlugin({ cwd: "/tmp/antumbra", plugin: "/antumbra/opencode/caller-session.js", skills: "/antumbra/plugin", tools: [] }).activate(
					host.context,
				),
			);
			const backend = (yield* host.backends).get("opencode");
			expect(backend?.capabilities).toEqual({
				imageInput: false,
			});
			expect(backend?.capacity).toBeUndefined();
		}),
	),
);

it.effect("registers nothing when no opencode CLI is found", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const host = yield* hostFinding(Option.none());
			yield* Effect.orDie(
				opencodePlugin({ cwd: "/tmp/antumbra", plugin: "/antumbra/opencode/caller-session.js", skills: "/antumbra/plugin", tools: [] }).activate(
					host.context,
				),
			);
			expect([...(yield* host.backends).keys()]).toEqual([]);
		}),
	),
);
