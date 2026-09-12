import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { beforeEach, vi } from "vitest";
import { findOnLoginPath } from "#adapters/login-shell.ts";
import { backends } from "#backends.ts";

vi.mock("#adapters/login-shell.ts", () => ({ findOnLoginPath: vi.fn() }));
vi.mock("#backends/codex/chatgpt-bundle.ts", () => ({ bundledCodex: Effect.succeed(Option.none()) }));

beforeEach(() => {
	vi.mocked(findOnLoginPath).mockReturnValue(Effect.succeed(Option.none()));
});

it.effect("omits unavailable CLI backends while retaining the embedded Pi backend", () =>
	Effect.gen(function* () {
		const registered = yield* backends({ cwd: "/tmp/antumbra", skills: "/tmp/antumbra/skills", plugin: "/tmp/antumbra/opencode/caller-session.js" });
		expect([...registered.keys()]).toEqual(["pi"]);
	}).pipe(Effect.provide(NodeServices.layer)),
);

it.live("registers all installed CLI backends without opening a provider session", () =>
	Effect.gen(function* () {
		vi.mocked(findOnLoginPath).mockImplementation((name) => Effect.succeed(Option.some(`/cli/${name}`)));
		const registered = yield* backends({ cwd: "/tmp/antumbra", skills: "/tmp/antumbra/skills", plugin: "/tmp/antumbra/opencode/caller-session.js" });
		expect([...registered.keys()]).toEqual(["claude", "codex", "opencode", "pi"]);
	}).pipe(Effect.provide(NodeServices.layer)),
);
