import { Database } from "@antumbra/persistence";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { flagshipCaptain } from "#test/flagship-fixtures.ts";
import { callTool } from "#test/harness.ts";

it.effectApp("the flagship's captain opens a voyage on the fleet's default", function* ({ scripted }) {
	const { captain } = yield* flagshipCaptain(scripted);
	const db = yield* Database;

	const outcome = yield* callTool(captain, "open_voyage", {
		context: "the shoals are unnamed",
		name: "Name the shoals",
		northStar: "every shoal has a name",
	});

	const opened = (yield* db.Voyage.where({
		name: "Name the shoals",
	}).all())[0];
	expect(outcome).toEqual({
		ok: true,
		text: `opened voyage ${opened?.id} · captain on scripted · crew on scripted`,
	});
	expect(opened).toMatchObject({ kind: "voyage", northStar: "every shoal has a name" });
	expect(yield* db.AgentRoleSettings.where({ scope: opened?.id ?? "" }).all()).toMatchObject([
		{ backend: null, effort: null, model: null, role: "captain" },
		{ backend: null, effort: null, model: null, role: "crew" },
	]);
});

it.effectApp("a voyage opens on the backend, model and effort the admiral named for each role", function* ({ scripted }) {
	const { captain } = yield* flagshipCaptain(scripted);
	const db = yield* Database;

	const outcome = yield* callTool(captain, "open_voyage", {
		captainBackend: "claude",
		captainEffort: "high",
		captainModel: "opus",
		context: "the shoals are unnamed",
		crewBackend: "codex",
		crewEffort: "medium",
		crewModel: "gpt-5",
		name: "Name the shoals",
		northStar: "every shoal has a name",
	});

	const opened = (yield* db.Voyage.where({
		name: "Name the shoals",
	}).all())[0];
	expect(outcome).toEqual({
		ok: true,
		text: `opened voyage ${opened?.id} · captain on claude with opus at high effort · crew on codex with gpt-5 at medium effort`,
	});
	expect(yield* db.AgentRoleSettings.where({ scope: opened?.id ?? "" }).all()).toMatchObject([
		{ backend: "claude", effort: "high", model: "opus", role: "captain" },
		{ backend: "codex", effort: "medium", model: "gpt-5", role: "crew" },
	]);
});

it.effectApp("a voyage asked for on a backend the fleet has no name for is refused, not opened", function* ({ scripted }) {
	const { captain } = yield* flagshipCaptain(scripted);
	const db = yield* Database;

	const refusal = yield* callTool(captain, "open_voyage", {
		captainBackend: "bottled-ship",
		context: "the shoals are unnamed",
		name: "Name the shoals",
		northStar: "every shoal has a name",
	});

	expect(refusal).toEqual({
		ok: false,
		text: "open_voyage: the fleet has no backend named bottled-ship — it names claude, codex, opencode",
	});
	expect(yield* db.Voyage.where({ name: "Name the shoals" }).all()).toEqual([]);
});

it.effectApp("a voyage asked for without a north star is refused, not opened", function* ({ scripted }) {
	const { captain } = yield* flagshipCaptain(scripted);
	const db = yield* Database;

	const refusal = yield* callTool(captain, "open_voyage", {
		context: "the shoals are unnamed",
		name: "Name the shoals",
	});

	expect(refusal.ok).toBe(false);
	expect(refusal.text).toContain("open_voyage");
	expect(yield* db.Voyage.where({ name: "Name the shoals" }).all()).toEqual([]);
});
