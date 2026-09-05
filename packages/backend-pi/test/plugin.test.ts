import { makePluginHost } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { piPlugin } from "#plugin.ts";

it.effect("registers the backend without looking for an executable, because pi runs in this process", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const host = yield* makePluginHost({ findExecutable: () => Effect.succeed(Option.none()) });
			yield* Effect.orDie(piPlugin({ skills: "/app/skills" }).activate(host.context));
			const backend = (yield* host.backends).get("pi");
			expect(backend?.capabilities).toEqual({ imageInput: false });
			expect(backend?.capacity).toBeUndefined();
		}),
	),
);
