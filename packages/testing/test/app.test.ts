import { BoardScope, EntryInput } from "@antumbra/boards";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Clock, Option } from "effect";
import { TestClock } from "effect/testing";

it.effectApp("uses TestClock unless live time is requested", function* () {
	const before = yield* Clock.currentTimeMillis;
	yield* TestClock.adjust(100);
	expect(yield* Clock.currentTimeMillis).toBe(before + 100);
});

it.effectApp("uses the system clock when requested", { clock: "live" }, function* () {
	expect(yield* Clock.currentTimeMillis).toBeGreaterThan(1_000_000_000_000);
});

it.effectApp("keeps both Board registers in write order", function* ({ boards, db }) {
	const voyageId = "testing-board-voyage";
	yield* db.Voyage.create({
		captainBackend: "scripted",
		context: "the reef is uncharted",
		crewBackend: "scripted",
		id: voyageId,
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
	const scope = BoardScope.Voyage({ voyageId });
	yield* boards.write(scope, EntryInput.Note({ authorAgentId: Option.none(), body: "sail the eastern approach first", register: "smooth" }));
	yield* boards.write(scope, EntryInput.Note({ authorAgentId: Option.some("agent-1"), body: "the swell is running", register: "rough" }));
	expect(yield* boards.read(scope)).toMatchObject([
		{ authorAgentId: null, body: "sail the eastern approach first", register: "smooth", seq: 1 },
		{ authorAgentId: "agent-1", body: "the swell is running", register: "rough", seq: 2 },
	]);
});

it.effectApp("refreshes a registered source instead of duplicating it", function* ({ repos }) {
	const first = yield* repos.register({ defaultRef: "main", source: "/testing/reefs/one" });
	const again = yield* repos.register({ defaultRef: "trunk", source: "/testing/reefs/one" });
	expect(again).toEqual({
		defaultRef: "trunk",
		id: first.id,
		name: "one",
		source: "/testing/reefs/one",
	});
});
