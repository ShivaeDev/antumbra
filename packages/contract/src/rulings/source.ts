import { Context, Data, type Effect, type Stream } from "effect";
import type {
	ProclaimRequest,
	ReclassifyRequest,
	RuleRequest,
	RulingProclaimedReceipt,
	RulingReclassifiedReceipt,
	RulingRuledReceipt,
	RulingSupersededReceipt,
	RulingWithdrawnReceipt,
	SupersedeRequest,
	WithdrawRequest,
} from "#rulings/requests.ts";
import type { OpenRulingsView, StandingRulingsView } from "#rulings/views.ts";

export class RulingFailure extends Data.TaggedError("RulingFailure")<{
	readonly message: string;
}> {}

// why: a verdict, a proclamation or a supersession that does not land is not a
// broken window — the ruling was answered already, was never asked, names a
// choice or a subject the fleet never had, or does not stand. The reason is the sentence the admiral is shown
// rather than a code to branch on.
export class RulingRefused extends Data.TaggedError("RulingRefused")<{
	readonly reason: string;
}> {}

export class RulingSource extends Context.Service<
	RulingSource,
	{
		readonly open: Effect.Effect<OpenRulingsView, RulingFailure>;
		readonly openFeed: Stream.Stream<OpenRulingsView, RulingFailure>;
		readonly proclaim: (request: ProclaimRequest) => Effect.Effect<RulingProclaimedReceipt, RulingFailure | RulingRefused>;
		readonly reclassify: (request: ReclassifyRequest) => Effect.Effect<RulingReclassifiedReceipt, RulingFailure | RulingRefused>;
		readonly rule: (request: RuleRequest) => Effect.Effect<RulingRuledReceipt, RulingFailure | RulingRefused>;
		readonly standing: Effect.Effect<StandingRulingsView, RulingFailure>;
		readonly standingFeed: Stream.Stream<StandingRulingsView, RulingFailure>;
		readonly supersede: (request: SupersedeRequest) => Effect.Effect<RulingSupersededReceipt, RulingFailure | RulingRefused>;
		readonly withdraw: (request: WithdrawRequest) => Effect.Effect<RulingWithdrawnReceipt, RulingFailure | RulingRefused>;
	}
>()("@antumbra/contract/RulingSource") {}
