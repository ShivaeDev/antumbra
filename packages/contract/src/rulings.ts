import { Context, Data, type Effect, type Stream } from "effect";
import type { RuleRequest, RulingRuledReceipt } from "#rulings-requests.ts";
import type { OpenRulingsView } from "#rulings-views.ts";

export class RulingFailure extends Data.TaggedError("RulingFailure")<{
	readonly message: string;
}> {}

// why: a verdict that does not land is not a broken window — the ruling was
// answered already, was never asked, or names a choice it never offered. The
// reason is the sentence the admiral is shown rather than a code to branch on.
export class RulingRefused extends Data.TaggedError("RulingRefused")<{
	readonly reason: string;
}> {}

export class RulingSource extends Context.Service<
	RulingSource,
	{
		readonly open: Effect.Effect<OpenRulingsView, RulingFailure>;
		readonly openFeed: Stream.Stream<OpenRulingsView, RulingFailure>;
		readonly rule: (
			request: RuleRequest,
		) => Effect.Effect<RulingRuledReceipt, RulingFailure | RulingRefused>;
	}
>()("@antumbra/contract/RulingSource") {}
