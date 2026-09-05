import type { OpenSessionOptions } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option, RcRef, Ref } from "effect";
import { opencodeBackend } from "#backend.ts";
import { makeOpencodeServer } from "#server.ts";
import { type FakeOpencode, makeFakeOpencode } from "#test/fake.ts";
import { makeToolSessions } from "#tool-sessions.ts";

const session = (constrainedPrompt?: string): OpenSessionOptions => ({
	constrainedPrompt,
	cwd: "/moorage",
	effort: Option.none(),
	model: Option.none(),
	resume: Option.none(),
	sessionId: "antumbra-session",
	tools: [],
});

const counted = (fake: FakeOpencode, starts: Ref.Ref<number>) =>
	RcRef.make({ acquire: makeOpencodeServer(Ref.update(starts, (count) => count + 1).pipe(Effect.andThen(fake.connect)), makeToolSessions([])) });

it.effect("a constrained session opens on its own server while ordinary sessions share theirs", () =>
	Effect.gen(function* () {
		const starts = yield* Ref.make(0);
		const plain = makeFakeOpencode();
		const narrow = makeFakeOpencode();
		const backend = opencodeBackend({ constrained: yield* counted(narrow, starts), ordinary: yield* counted(plain, starts) });
		yield* backend.openSession(session());
		yield* backend.openSession(session());
		expect(plain.calls.map((call) => call.path)).toEqual(["/session", "/session"]);
		expect(narrow.calls).toEqual([]);
		expect(yield* Ref.get(starts)).toBe(1);
		yield* backend.openSession(session("Smooth this board."));
		expect(narrow.calls.map((call) => call.path)).toEqual(["/session"]);
		expect(yield* Ref.get(starts)).toBe(2);
	}),
);
