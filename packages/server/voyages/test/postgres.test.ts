import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { FLAGSHIP_REQUEST, VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Open } from "@antumbra/server-voyages/contract.ts";
import { invalidationKeys } from "@shivaedev/changes/keys.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { opening } from "#test/opening.ts";

const reef = VoyageId.make("voyage:reef");
const openReef = { ...opening, requestId: Request.make(reef) };
const request = (name: string) => Request.make(name);

postgresApp.it("opens a voyage with its chosen roles and controlled time", [], function* ({ api, history, clock, published }) {
	const at = new Date(yield* clock.now()).toISOString();
	yield* api["voyages.open"]({
		...openReef,
		name: "  Chart the reef  ",
		northStar: " every shoal is known  ",
		captainBackend: "claude",
		captainModel: "opus",
		captainEffort: "high",
		crewBackend: "codex",
		crewModel: "gpt-5",
		crewEffort: "medium",
	});
	expect(yield* answered(api["voyages.byId"]({ id: reef }), "voyages.byId")).toEqual({
		id: reef,
		kind: "voyage",
		name: opening.name,
		northStar: opening.northStar,
		context: opening.context,
		openedAt: at,
		focusedAt: null,
		quietedAt: null,
	});
	expect(yield* history.roles(reef)).toEqual([
		{ id: `${reef}/captain`, scope: reef, role: "captain", backend: "claude", model: "opus", effort: "high" },
		{ id: `${reef}/crew`, scope: reef, role: "crew", backend: "codex", model: "gpt-5", effort: "medium" },
	]);
	expect(yield* published()).toEqual(expect.arrayContaining([...invalidationKeys(Open.invalidates(openReef, 1))]));
});

postgresApp.it("lists voyages oldest first and returns null for an unknown id", [], function* ({ api, clock, history }) {
	yield* api["voyages.open"](openReef);
	yield* api["voyages.open"]({ ...opening, name: "Sound the shallows", requestId: request("voyage:aaa") });
	yield* clock.advance(60_000);
	yield* history.rebuild();
	expect((yield* answered(api["voyages.list"]({}), "voyages.list")).map((row) => row.name)).toEqual(["Chart the reef", "Sound the shallows"]);
	expect(yield* answered(api["voyages.byId"]({ id: VoyageId.make("missing") }), "voyages.byId")).toBeNull();
});

postgresApp.it("rejects blank openings and unknown revisions without history or refreshes", [], function* ({ api, history, published }) {
	for (const patch of [{ name: "   " }, { northStar: "  " }]) {
		const rejected = yield* Effect.flip(api["voyages.open"]({ ...openReef, ...patch }));
		expect(rejected).toMatchObject({ _tag: "Blank", field: "name" in patch ? "name" : "northStar" });
	}
	const unknown = { id: reef, requestId: request("unknown") };
	for (const act of [api["voyages.setFocus"]({ ...unknown, focused: true }), api["voyages.quiet"](unknown), api["voyages.resume"](unknown)]) {
		expect(yield* Effect.flip(act)).toMatchObject({ _tag: "Unknown", id: reef });
	}
	expect(yield* answered(api["voyages.list"]({}), "voyages.list")).toEqual([]);
	expect(yield* history.read(reef)).toEqual([]);
	expect(yield* history.roles(reef)).toEqual([]);
	expect(yield* published()).toEqual([]);
});

postgresApp.it("recognizes repeated flagship requests without adding history", [], function* ({ api, history, published }) {
	const input = { ...opening, kind: "flagship" as const, requestId: FLAGSHIP_REQUEST };
	const first = yield* api["voyages.open"](input);
	const keys = yield* published();
	expect(yield* Effect.flip(api["voyages.open"](input))).toMatchObject({ _tag: "AlreadyDone", requestId: FLAGSHIP_REQUEST, seq: first });
	expect(yield* history.read(VoyageId.make(FLAGSHIP_REQUEST))).toHaveLength(1);
	expect(yield* answered(api["voyages.list"]({}), "voyages.list")).toHaveLength(1);
	expect(yield* published()).toEqual(keys);
});

postgresApp.it("rebuilds voyages and role choices from typed history", [], function* ({ api, history, clock }) {
	yield* api["voyages.open"](openReef);
	yield* clock.advance(60_000);
	yield* api["voyages.setFocus"]({ id: reef, focused: true, requestId: request("focus") });
	yield* api["voyages.quiet"]({ id: reef, requestId: request("quiet") });
	const rows = yield* answered(api["voyages.list"]({}), "voyages.list");
	const progress = yield* answered(api["voyages.progress"]({ id: reef }), "voyages.progress");
	const roles = yield* history.roles(reef);
	yield* history.rebuild();
	expect(yield* answered(api["voyages.list"]({}), "voyages.list")).toEqual(rows);
	expect(yield* history.roles(reef)).toEqual(roles);
	expect(yield* answered(api["voyages.progress"]({ id: reef }), "voyages.progress")).toEqual(progress);
	expect((yield* history.read(reef)).map((event) => event.value._tag)).toEqual(["VoyageOpened", "FocusSet", "QuietSet"]);
});

postgresApp.it(
	"discards an appended change and its refresh keys when the transaction is rejected",
	[],
	function* ({ api, history, rollback, published, clearPublished }) {
		yield* api["voyages.open"](openReef);
		yield* clearPublished();
		const before = yield* answered(api["voyages.byId"]({ id: reef }), "voyages.byId");
		yield* rollback(history.append(request("rolled-back-focus"), { _tag: "FocusSet", id: reef, focusedAt: "2026-11-03T12:00:00.000Z" }));
		expect(yield* answered(api["voyages.byId"]({ id: reef }), "voyages.byId")).toEqual(before);
		expect(yield* history.read(reef)).toHaveLength(1);
		expect(yield* published()).toEqual([]);
	},
);
