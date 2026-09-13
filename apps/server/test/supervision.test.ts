import { type App, answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { ScriptedHost } from "@antumbra/app-testing/host.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";

const BROKEN = "the change host broke";

const registerRepo = (app: App, id: string, name: string) =>
	app.api.repos.register({ requestId: Request.make(RepoId.make(id)), source: `https://github.com/example/${name}.git`, defaultRef: "main" });

const watchingStopped = (app: App) =>
	eventually(app.api.supervision.stoppedLoops({}), (held) => held.some((row) => row.loop === "watching" && row.state === "stopped"));

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
	const repos = yield* eventually(app.api.repos.all({}), (rows) => rows.length === 2);
	expect(repos.map((row) => row.name)).toEqual(["reef", "shoal"]);
});

it.app("resuming a stopped loop by hand re-forks it and it works again", function* (app) {
	const host = yield* ScriptedHost;
	yield* host.setBroken(BROKEN);
	yield* registerRepo(app, "repo:reef", "reef");
	yield* watchingStopped(app);
	expect(yield* answered(app.api.changes.hostCapabilities({}))).toEqual([]);
	yield* host.setBroken(null);
	yield* app.api.supervision.resumeLoop({ loop: "watching" });
	const settled = yield* eventually(app.api.supervision.stoppedLoops({}), (held) => held.every((row) => row.state === "resumed"));
	expect(settled.map((row) => row.loop)).toEqual(["watching"]);
	const seen = yield* eventually(app.api.changes.hostCapabilities({}), (rows) => rows.some((row) => row.host === "scripted"));
	expect(seen.map((row) => row.available)).toEqual([true]);
});
