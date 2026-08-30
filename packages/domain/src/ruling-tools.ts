import { bind, requestRulingSpec } from "@antumbra/agent-tools";
import type { DirectTool, DirectToolOutcome } from "@antumbra/plugin-api";
import { type Ruling, type RulingRequest, Rulings } from "@antumbra/rulings";
import type { RulingAuthority } from "@antumbra/vocabulary/ruling";
import { Effect } from "effect";
import { CaptainMembership } from "#captain-membership.ts";
import { heldSaid, makeRulingHold } from "#ruling-hold.ts";
import { choiceOf } from "#ruling-inputs.ts";
import { rungAsked } from "#ruling-station.ts";
import { subjectsOf } from "#ruling-subjects.ts";
import { answered } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

const holds = (ruling: Ruling): string => (ruling.gatedPieceIds.length === 0 ? "" : `; holds ${ruling.gatedPieceIds.length} piece(s)`);

const said = (ruling: Ruling): string =>
	`ruling ${ruling.id} requested — ${ruling.radius} radius, ${ruling.urgency}${holds(ruling)}. The answer reaches you as mail; nothing here waits for it.`;

type Ask = (typeof requestRulingSpec)["input"]["Type"];

const requestOf = (identity: SessionIdentity, input: Ask, gates: ReadonlyArray<string>, rung: RulingAuthority): RulingRequest => ({
	choices: (input.choices ?? []).map(choiceOf),
	context: input.context,
	gates,
	question: input.question,
	radius: input.radius,
	requester: { agentId: identity.agentId, kind: "agent" },
	rung,
	subjects: subjectsOf(identity, input.tags),
	urgency: input.urgency,
});

// why: urgency decides whether the asker holds. A blocking call is the answer's
// own road back and returns only when the ruling lands; every other urgency
// returns at once and hears the answer as mail.
export const makeRulingToolCompiler = Effect.gen(function* () {
	const membership = yield* CaptainMembership;
	const rulings = yield* Rulings;
	const hold = yield* makeRulingHold;
	const world = yield* VoyageWorldSource;
	// why: the rung a request waits on is the asker's station read off the
	// record, never something the asker names. A record nobody can read leaves
	// the question with the admiral, who meets every open ruling in the window.
	const rungFor = (identity: SessionIdentity) =>
		world.read.pipe(
			Effect.map((rows) => rungAsked(rows, identity)),
			Effect.orElseSucceed((): RulingAuthority => "admiral"),
		);
	const requestFrom = (identity: SessionIdentity, input: Ask, gates: ReadonlyArray<string>): Effect.Effect<DirectToolOutcome> =>
		Effect.gen(function* () {
			const request = requestOf(identity, input, gates, yield* rungFor(identity));
			return request.urgency === "blocking"
				? yield* answered(identity, requestRulingSpec.name, hold(request), heldSaid)
				: yield* answered(identity, requestRulingSpec.name, rulings.request(request), said);
		});
	// why: a hold reaches only the asker's own voyage — crew and captain alike
	// may hold sibling pieces, and an agent on no voyage holds nothing. The
	// membership read refuses before the request is written, so a request
	// naming another ship's work lands no row at all.
	return (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(requestRulingSpec, (input) => {
			const gates = input.gates ?? [];
			return gates.length === 0
				? requestFrom(identity, input, gates)
				: membership.onOwnDeps(identity, gates, () => requestFrom(identity, input, gates));
		}),
	];
});
