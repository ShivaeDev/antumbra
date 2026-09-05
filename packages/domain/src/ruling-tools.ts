import { addContextSpec, bind, requestRulingSpec } from "@antumbra/agent-tools";
import type { DirectTool, DirectToolOutcome } from "@antumbra/plugin-api";
import { type Ruling, type RulingRequest, Rulings } from "@antumbra/rulings";
import { RulingHolds } from "@antumbra/rulings/holds/service";
import type { RulingAuthority } from "@antumbra/vocabulary/ruling";
import { Effect } from "effect";
import { VoyageAuthority } from "#authority/service.ts";
import { CaptainMembership } from "#captain-membership.ts";
import { heldSaid } from "#ruling-hold-answer.ts";
import { choiceOf } from "#ruling-inputs.ts";
import { subjectsOf } from "#ruling-subjects.ts";
import { answered } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

const holds = (ruling: Ruling): string => (ruling.gatedPieceIds.length === 0 ? "" : `; holds ${ruling.gatedPieceIds.length} piece(s)`);

const said = (ruling: Ruling): string =>
	`ruling ${ruling.id} requested — ${ruling.radius} radius, ${ruling.urgency}${holds(ruling)}. The answer reaches you as mail; nothing here waits for it.`;

const appended = (ruling: Ruling): string => `context added to ruling ${ruling.id} — it stands beside the original context for whoever answers.`;

type Ask = (typeof requestRulingSpec)["input"]["Type"];
type Added = (typeof addContextSpec)["input"]["Type"];

const holdsAgain = (ruling: Ruling, identity: SessionIdentity): boolean =>
	ruling.urgency === "blocking" && ruling.requester.kind === "agent" && ruling.requester.agentId === identity.agentId;

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

export const makeRulingToolCompiler = Effect.gen(function* () {
	const membership = yield* CaptainMembership;
	const rulings = yield* Rulings;
	const hold = yield* RulingHolds;
	const authority = yield* VoyageAuthority;
	const rungFor = (identity: SessionIdentity) => authority.rungAsked(identity).pipe(Effect.orElseSucceed((): RulingAuthority => "admiral"));
	const requestFrom = (identity: SessionIdentity, input: Ask, gates: ReadonlyArray<string>): Effect.Effect<DirectToolOutcome> =>
		Effect.gen(function* () {
			const request = requestOf(identity, input, gates, yield* rungFor(identity));
			return request.urgency === "blocking"
				? yield* answered(identity, requestRulingSpec.name, hold.requestAndHold(request), heldSaid)
				: yield* answered(identity, requestRulingSpec.name, rulings.request(request), said);
		});
	const contextFrom = (identity: SessionIdentity, input: Added): Effect.Effect<DirectToolOutcome> =>
		Effect.gen(function* () {
			const holding = yield* rulings.get(input.rulingId).pipe(
				Effect.map((ruling) => holdsAgain(ruling, identity)),
				Effect.orElseSucceed(() => false),
			);
			const given = { authorAgentId: identity.agentId, body: input.context, rulingId: input.rulingId };
			return holding
				? yield* answered(identity, addContextSpec.name, hold.addContextAndHold(given), heldSaid)
				: yield* answered(identity, addContextSpec.name, rulings.addContext(given), appended);
		});
	return (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(addContextSpec, (input: Added) => contextFrom(identity, input)),
		bind(requestRulingSpec, (input) => {
			const gates = input.gates ?? [];
			return gates.length === 0
				? requestFrom(identity, input, gates)
				: membership.onOwnDeps(identity, gates, () => requestFrom(identity, input, gates));
		}),
	];
});
