import { type Ruling, Rulings } from "@antumbra/rulings";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { type Ladder, withLadder } from "#test/captain-verdict-fixtures.ts";
import { callTool } from "#test/harness.ts";

const PLOT = { context: "sound the shallows first, then buoy the channel" };

const charter = (voyageId: string, title: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		return yield* domain.voyages.charterPiece({
			charter: `do ${title}`,
			dependsOn: [],
			expectation: `${title} is landed`,
			role: "hand",
			title,
			voyageId,
		});
	});

const openApproval = Effect.gen(function* () {
	const rulings = yield* Rulings;
	const open = yield* rulings.open();
	return Option.getOrThrow(Option.fromUndefinedOr(open.find((ruling) => ruling.kind === "approval")));
});

const approveChoiceOf = (asked: Ruling): string => asked.choices.find((choice) => choice.label === "approve")?.id ?? "";

const approve = (ladder: Ladder) =>
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		yield* callTool(ladder.captain, "request_approval", PLOT);
		const asked = yield* openApproval;
		yield* rulings.rule({ answer: "sail it", by: "admiral", choiceId: approveChoiceOf(asked), rulingId: asked.id });
		return asked;
	});

it.live("a captain puts the plot as it stands before the admiral", () =>
	withLadder((ladder) =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const alpha = yield* charter(ladder.voyageId, "alpha");
			const bravo = yield* charter(ladder.voyageId, "bravo");
			const parked = yield* charter(ladder.voyageId, "charlie");
			const abandoned = yield* charter(ladder.voyageId, "delta");
			yield* domain.voyages.park(parked.id);
			yield* domain.voyages.landPieceVerdict(abandoned.id, "abandoned");

			const outcome = yield* callTool(ladder.captain, "request_approval", PLOT);

			const asked = yield* openApproval;
			expect(outcome).toEqual({
				ok: true,
				text: `approval ${asked.id} requested for 2 piece(s) — the admiral answers with approve or redirect, and the answer reaches you as mail`,
			});
			expect(asked.approvedPieceIds).toEqual([alpha.id, bravo.id].sort());
			expect(asked.context).toBe(PLOT.context);
			expect(asked.requester).toEqual({ agentId: ladder.captainAgentId, kind: "agent" });
			const read = yield* callTool(ladder.captain, "read_voyage", {});
			expect(read.text).toContain(`## Approval\n- approved: none yet\n- asked: ${asked.id} at `);
			expect(read.text).toContain(`— ${[alpha.id, bravo.id].sort().join(", ")}`);
		}),
	),
);

it.live("approving a second plot supersedes the first and read_voyage shows the new set", () =>
	withLadder((ladder) =>
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const rulings = yield* Rulings;
			const alpha = yield* charter(ladder.voyageId, "alpha");
			const bravo = yield* charter(ladder.voyageId, "bravo");
			yield* domain.voyages.park(bravo.id);
			const first = yield* approve(ladder);
			yield* domain.voyages.unpark(bravo.id);

			const second = yield* approve(ladder);

			expect(Option.getOrThrow((yield* rulings.get(first.id)).supersession).byRulingId).toBe(second.id);
			const read = yield* callTool(ladder.captain, "read_voyage", {});
			expect(read.text).toContain(`- approved: ${second.id} at `);
			expect(read.text).toContain(`— ${[alpha.id, bravo.id].sort().join(", ")}`);
			expect(read.text).not.toContain("- asked:");
			expect(read.text).not.toContain(first.id);
		}),
	),
);

it.live("an empty plot, a plot still before the admiral, and a plot already approved are each refused", () =>
	withLadder((ladder) =>
		Effect.gen(function* () {
			const rulings = yield* Rulings;
			const empty = yield* callTool(ladder.captain, "request_approval", PLOT);
			yield* charter(ladder.voyageId, "alpha");
			yield* callTool(ladder.captain, "request_approval", PLOT);
			const asked = yield* openApproval;

			const twice = yield* callTool(ladder.captain, "request_approval", PLOT);
			yield* rulings.rule({ answer: "sail it", by: "admiral", choiceId: approveChoiceOf(asked), rulingId: asked.id });
			const unchanged = yield* callTool(ladder.captain, "request_approval", PLOT);

			expect(empty).toEqual({
				ok: false,
				text: `request_approval: PlotEmpty: voyage ${ladder.voyageId} has no piece that is neither parked nor abandoned — charter or unpark before you ask`,
			});
			expect(twice).toEqual({
				ok: false,
				text: `request_approval: ApprovalAlreadyOpen: approval ${asked.id} on voyage ${ladder.voyageId} is still before the admiral`,
			});
			expect(unchanged).toEqual({
				ok: false,
				text: `request_approval: PlotUnchanged: the plot of voyage ${ladder.voyageId} is the set approval ${asked.id} already approved — change it before you ask again`,
			});
		}),
	),
);

it.live("no captain rules on an approval, the flagship included", () =>
	withLadder((ladder) =>
		Effect.gen(function* () {
			const rulings = yield* Rulings;
			yield* charter(ladder.voyageId, "alpha");
			yield* callTool(ladder.captain, "request_approval", PLOT);
			const asked = yield* openApproval;
			const verdict = { answer: "sail it", choice: "approve", rulingId: asked.id };

			const byCaptain = yield* callTool(ladder.captain, "rule_on", verdict);
			const byFlagship = yield* callTool(ladder.flagship, "rule_on", verdict);

			const refused = {
				ok: false,
				text: `approval ${asked.id} waits on the admiral alone — a plot is approved from the window, never by a captain`,
			};
			expect(byCaptain).toEqual(refused);
			expect(byFlagship).toEqual(refused);
			expect(Option.isNone((yield* rulings.get(asked.id)).answer)).toBe(true);
		}),
	),
);
