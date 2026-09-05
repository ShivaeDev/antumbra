import { Kernel } from "@antumbra/kernel";
import { it } from "@antumbra/testing";
import { Voyages } from "@antumbra/voyages";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { callTool, type ScriptedBackend, sessionFor } from "#test/harness.ts";
import { onVoyage, proclaimed, seedAsker, unruled } from "#test/ruling-fixtures.ts";
import { openReefVoyage, terminalIntent } from "#test/voyage-fixtures.ts";

const HAND: SpawnFields = {
	agentId: "agent-hand",
	backend: "scripted",
	charter: "sound the shallows",
	role: "hand",
	runner: "local",
	sessionId: "session-hand",
};

const anotherVoyage = Effect.gen(function* () {
	const voyageRecords = yield* Voyages;
	return yield* voyageRecords.open({
		context: "the shoals are unnamed",
		name: "Name the shoals",
		northStar: "every shoal has a name",
	});
});

const captainOnVoyage = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const voyage = yield* openReefVoyage;
		yield* seedAsker;
		const hailed = yield* domain.voyages.hail(voyage.id);
		expect(yield* terminalIntent(hailed.intentId)).toBe("succeeded");
		const captain = yield* sessionFor(scripted, hailed.agentId);
		return { captain, voyageId: voyage.id };
	});

it.effectApp("read_rulings serves in full what binds the reader and nothing else", function* ({ scripted }) {
	const { captain, voyageId } = yield* captainOnVoyage(scripted);
	const elsewhere = yield* anotherVoyage;
	const ours = yield* proclaimed("which reading do we trust?", "trust the soundings", { radius: "voyage", subjects: onVoyage(voyageId) });
	yield* proclaimed("may any voyage dredge?", "never", {
		radius: "fleet",
		subjects: [],
	});
	yield* proclaimed("may the shoals be renamed?", "yes", {
		radius: "voyage",
		subjects: onVoyage(elsewhere.id),
	});
	yield* unruled("may we anchor overnight?", {
		radius: "voyage",
		subjects: onVoyage(voyageId),
	});

	const outcome = yield* callTool(captain, "read_rulings", {});
	expect(outcome.ok).toBe(true);
	expect(outcome.text).toContain(
		[
			`## ${ours.id} — binds one voyage`,
			"Question: which reading do we trust?",
			"Context: context of: which reading do we trust?",
			"Answer: trust the soundings — ruled by the admiral on",
		].join("\n"),
	);
	expect(outcome.text).toContain("binds the whole fleet");
	expect(outcome.text).toContain("may any voyage dredge?");
	expect(outcome.text).not.toContain("renamed");
	expect(outcome.text).not.toContain("anchor overnight");
});

it.effectApp("a tag widens the read to precedent about a concept", function* ({ scripted }) {
	const { captain } = yield* captainOnVoyage(scripted);
	yield* proclaimed("how deep do we sound?", "to the keel and a fathom", {
		radius: "voyage",
		subjects: [{ kind: "tag", tag: "surveying" }],
	});
	const bare = yield* callTool(captain, "read_rulings", {});
	expect(bare).toEqual({ ok: true, text: "no standing rulings bind you" });
	const widened = yield* callTool(captain, "read_rulings", {
		tags: ["surveying"],
	});
	expect(widened.ok).toBe(true);
	expect(widened.text).toContain("how deep do we sound?");
});

it.effectApp("an agent on no piece or voyage is bound by fleet rulings alone", function* ({ scripted }) {
	const kernel = yield* Kernel;
	const domain = yield* AgentDomain;
	yield* seedAsker;
	yield* proclaimed("may any voyage dredge?", "never", {
		radius: "fleet",
		subjects: [],
	});
	const spawned = yield* kernel.submit(domain.spawn, HAND);
	expect(yield* terminalIntent(spawned.id)).toBe("succeeded");
	const live = yield* sessionFor(scripted, HAND.agentId);
	const outcome = yield* callTool(live, "read_rulings", undefined);
	expect(outcome.ok).toBe(true);
	expect(outcome.text).toContain("may any voyage dredge?");
	expect(outcome.text).toContain("Answer: never");
});
