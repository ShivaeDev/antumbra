import { type App, answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { ScriptedHost } from "@antumbra/app-testing/host.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Exit, Stream } from "effect";
import { expect } from "vitest";
import { forgetRunning } from "#supervision/forget.ts";
import { supervise } from "#supervision/loops.ts";

const BROKEN = "the change host broke";
const UNOPENABLE = "the loop would not open";

const registerRepo = (app: App, id: string, name: string) =>
	app.api.repos.register({ requestId: Request.make(RepoId.make(id)), source: `https://github.com/example/${name}.git`, defaultRef: "main" });

const watchingStopped = (app: App) =>
	eventually(
		app.api.supervision.stoppedLoops({}),
		(held) => held.some((row) => row.loop === "watching" && row.state === "stopped"),
		"the watching loop to be recorded as stopped",
	);

it.app("a defect stops the loop it happened in, records it, and leaves the rest of the app running", function* (app) {
	const host = yield* ScriptedHost;
	yield* host.setBroken(BROKEN);
	yield* registerRepo(app, "repo:reef", "reef");
	const held = yield* watchingStopped(app);
	const entry = held.find((row) => row.loop === "watching");
	if (entry === undefined) return yield* Effect.die("the watching loop was not recorded");
	expect(entry.message).toContain(BROKEN);
	expect(entry.trace).toContain(BROKEN);
	expect(held.filter((row) => row.state === "stopped").map((row) => row.loop)).toEqual(["watching"]);
	yield* registerRepo(app, "repo:shoal", "shoal");
	const repos = yield* eventually(app.api.repos.all({}), (rows) => rows.length === 2, "two repos to be listed");
	expect(repos.map((row) => row.name)).toEqual(["reef", "shoal"]);
});

it.app("resuming a stopped loop by hand re-forks it and it works again", function* (app) {
	const host = yield* ScriptedHost;
	yield* host.setBroken(BROKEN);
	yield* registerRepo(app, "repo:reef", "reef");
	yield* watchingStopped(app);
	expect(yield* answered(app.api.changes.hostCapabilities({}), "the host capabilities to be read")).toEqual([]);
	yield* host.setBroken(null);
	yield* app.api.supervision.resumeLoop({ loop: "watching" });
	const settled = yield* eventually(
		app.api.supervision.stoppedLoops({}),
		(held) => held.every((row) => row.state === "resumed"),
		"every stopped-loop row to show resumed",
	);
	expect(settled.map((row) => row.loop)).toEqual(["watching"]);
	const seen = yield* eventually(
		app.api.changes.hostCapabilities({}),
		(rows) => rows.some((row) => row.host === "scripted"),
		"the scripted host to appear in host capabilities",
	);
	expect(seen.map((row) => row.available)).toEqual([true]);
});

it.app("a record an earlier boot left behind is cleared for a loop that runs again", function* (app) {
	yield* app.api.supervision.failLoop({
		loop: "mailing",
		message: "an earlier boot",
		requestId: Request.make("loop-failed:mailing:1"),
		trace: "an earlier trace",
	});
	yield* eventually(app.api.supervision.stoppedLoops({}), (held) => held.length === 1, "one stopped-loop row to be recorded");
	yield* forgetRunning({ refresh: Effect.void, running: (loop) => loop === "mailing", start: () => Effect.void });
	expect(yield* answered(app.api.supervision.stoppedLoops({}), "the stopped loops to be read")).toEqual([]);
});

it.app("resuming a loop that is still broken records the new stop and leaves resume working", function* (app) {
	const host = yield* ScriptedHost;
	yield* host.setBroken(BROKEN);
	yield* registerRepo(app, "repo:reef", "reef");
	const held = yield* watchingStopped(app);
	const first = held.find((row) => row.loop === "watching")?.at ?? 0;
	yield* app.clock.advance(1000);
	yield* app.api.supervision.resumeLoop({ loop: "watching" });
	yield* eventually(
		app.api.supervision.stoppedLoops({}),
		(rows) => rows.some((row) => row.loop === "watching" && row.state === "stopped" && row.at > first),
		"the watching loop to be recorded stopped again",
	);
	yield* host.setBroken(null);
	yield* app.api.supervision.resumeLoop({ loop: "watching" });
	const seen = yield* eventually(
		app.api.changes.hostCapabilities({}),
		(rows) => rows.some((row) => row.host === "scripted"),
		"the scripted host to appear in host capabilities",
	);
	expect(seen.map((row) => row.available)).toEqual([true]);
});

it.app("a defect while a loop opens is recorded and a later resume still re-forks it", function* (app) {
	const charting = { name: "charting", open: Effect.die(new Error(UNOPENABLE)) };
	yield* supervise([charting], Stream.empty);
	const held = yield* eventually(
		app.api.supervision.stoppedLoops({}),
		(rows) => rows.some((row) => row.loop === "charting"),
		"the charting loop to be recorded as stopped",
	);
	const first = held.find((row) => row.loop === "charting");
	expect(first?.message).toContain(UNOPENABLE);
	expect(first?.trace).toContain(UNOPENABLE);
	yield* app.clock.advance(1000);
	yield* app.api.supervision.resumeLoop({ loop: "charting" });
	yield* eventually(
		app.api.supervision.stoppedLoops({}),
		(rows) => rows.some((row) => row.loop === "charting" && row.state === "stopped" && row.at > (first?.at ?? 0)),
		"the charting loop to be recorded stopped again",
	);
});

it.app("a loop whose work ends on its own is recorded so the stop is visible", function* (app) {
	const ending = { name: "charting", open: Effect.succeed({ refresh: Effect.void, await: Effect.void }) };
	yield* supervise([ending], Stream.empty);
	const held = yield* eventually(
		app.api.supervision.stoppedLoops({}),
		(rows) => rows.some((row) => row.loop === "charting"),
		"the charting loop to be recorded as stopped",
	);
	expect(held.find((row) => row.loop === "charting")?.message).toBe("charting ended.");
});

it.app("two loops that share a name refuse to assemble", function* (app) {
	const open = Effect.succeed({ refresh: Effect.void, await: Effect.never });
	const exit = yield* Effect.exit(
		supervise(
			[
				{ name: "charting", open },
				{ name: "charting", open },
			],
			Stream.empty,
		),
	);
	expect(Exit.isFailure(exit)).toBe(true);
	expect(yield* answered(app.api.supervision.stoppedLoops({}), "the stopped loops to be read")).toEqual([]);
});
