import { answered, it } from "@antumbra/app-testing/entry.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { RepoId } from "#ids.ts";
import { all } from "#queries/all.ts";

const reef = RepoId.make("repo:reef");
const shoal = RepoId.make("repo:shoal");

it.app("updates a registered source without changing its identity or position", function* (app) {
	const live = yield* app.live(all, {});
	yield* app.api.repos.register({ requestId: Id.Request.make(reef), source: "/reefs/one.git/", defaultRef: "main" });
	const first = yield* answered(app.api.repos.byId({ id: reef }));
	yield* app.clock.advance(60_000);
	yield* app.api.repos.register({ requestId: Id.Request.make(shoal), source: "git@example.test:shoals.git", defaultRef: "main" });
	yield* app.api.repos.register({ source: "/reefs/one.git/", defaultRef: "trunk" });
	yield* app.settle();
	const stored = yield* answered(app.api.repos.all({}));
	expect(stored.map((row) => row.id)).toEqual([reef, shoal]);
	expect(stored[0]).toEqual({ ...first, defaultRef: "trunk" });
	expect(stored[0]?.name).toBe("one");
	expect(stored[1]?.name).toBe("shoals");
	expect((yield* live.seen).at(-1)).toEqual(stored);
	expect(yield* answered(app.api.repos.byIds({ ids: [shoal, reef] }))).toEqual(stored);
});

it.app("refuses sources whose berth slug is already registered", function* (app) {
	yield* app.api.repos.register({ source: "/reefs/Reef-Charts", defaultRef: "main" });
	const refusal = yield* Effect.flip(app.api.repos.register({ source: "git@example.test:crew/reef-charts.git", defaultRef: "trunk" }));
	expect(refusal).toMatchObject({ _tag: "SlugTaken", registeredSource: "/reefs/Reef-Charts", slug: "reef-charts" });
	expect(yield* answered(app.api.repos.all({}))).toMatchObject([{ source: "/reefs/Reef-Charts", defaultRef: "main" }]);
});

it.app("forgets one registration and leaves another available", function* (app) {
	yield* app.api.repos.register({ requestId: Id.Request.make(reef), source: "/reefs/one", defaultRef: "main" });
	yield* app.api.repos.register({ requestId: Id.Request.make(shoal), source: "/reefs/two", defaultRef: "trunk" });
	yield* app.api.repos.forget({ id: reef });
	yield* app.api.repos.forget({ id: reef });
	expect(yield* answered(app.api.repos.byId({ id: reef }))).toBeNull();
	expect(yield* answered(app.api.repos.all({}))).toMatchObject([{ id: shoal, source: "/reefs/two" }]);
});

it.app("keeps the registration boundary's raw string inputs", function* (app) {
	yield* app.api.repos.register({ source: "", defaultRef: "" });
	expect(yield* answered(app.api.repos.all({}))).toMatchObject([{ name: "repo", source: "", defaultRef: "" }]);
});
