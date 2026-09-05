import type { Ruling } from "@antumbra/rulings";
import { expect, it } from "@effect/vitest";
import { Option } from "effect";
import { frontierOf } from "#frontier.ts";
import { RELEASED, world } from "#test/piece-ladder-fixtures.ts";

const REEF = "voyage-1";

const asked = (id: string, over: Partial<Pick<Ruling, "parked" | "requester" | "subjects">> = {}): Ruling => ({
	answer: Option.none(),
	choices: [],
	context: `context of ${id}`,
	contexts: [],
	createdAt: RELEASED,
	declared: { radius: "voyage", urgency: "pressing" },
	gatedPieceIds: [],
	id,
	parked: Option.none(),
	question: `question ${id}`,
	radius: "voyage",
	reclassifications: [],
	recommendation: Option.none(),
	requester: { agentId: "agent-hand", kind: "agent" },
	rung: Option.some("captain"),
	subjects: [{ id: REEF, kind: "voyage" }],
	supersession: Option.none(),
	urgency: "pressing",
	withdrawal: Option.none(),
	...over,
});

it("the frontier is what agents asked about the voyage and nothing else", () => {
	const built = world({
		openRulings: [
			asked("by-a-hand"),
			asked("by-the-flagship", { requester: { by: "flagship", kind: "authority" } }),
			asked("about-another-ship", { subjects: [{ id: "voyage-2", kind: "voyage" }] }),
			asked("about-a-piece-only", {
				subjects: [
					{ id: "alpha", kind: "piece" },
					{ kind: "tag", tag: "charts" },
				],
			}),
			asked("about-the-ship-and-more", {
				subjects: [
					{ id: "alpha", kind: "piece" },
					{ id: REEF, kind: "voyage" },
				],
			}),
		],
	});

	expect(frontierOf(built, REEF).map((ruling) => ruling.id)).toEqual(["by-a-hand", "about-the-ship-and-more"]);
	expect(frontierOf(built, "voyage-2").map((ruling) => ruling.id)).toEqual(["about-another-ship"]);
});

it("leaves a request parked for later off the frontier", () => {
	const built = world({
		openRulings: [asked("still-asked"), asked("left-for-later", { parked: Option.some({ at: RELEASED, note: "after the survey lands" }) })],
	});

	expect(frontierOf(built, REEF).map((ruling) => ruling.id)).toEqual(["still-asked"]);
});
