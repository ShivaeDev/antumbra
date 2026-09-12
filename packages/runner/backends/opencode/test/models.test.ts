import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { listOpencodeModels } from "#models.ts";
import { makeOpencodeServer } from "#server.ts";
import { makeFakeOpencode } from "#test/fake.ts";
import { makeToolSessions } from "#tool-sessions.ts";

it.effect("names every provider's models provider/model and offers the variants each one takes", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const server = yield* makeOpencodeServer(makeFakeOpencode().connect, makeToolSessions([]));
			expect(yield* listOpencodeModels(server)).toEqual([
				{ efforts: ["low", "high", "max"], id: "opencode-go/gpt-5.6-luna", isDefault: true, name: "GPT-5.6 Luna" },
				{ efforts: [], id: "opencode-go/qwen3.7-max", isDefault: false, name: "Qwen3.7 Max" },
				{ efforts: [], id: "opencode/big-pickle", isDefault: true, name: "Big Pickle" },
			]);
		}),
	),
);
