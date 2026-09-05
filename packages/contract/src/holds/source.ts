import { Context, type Stream } from "effect";
import type { HoldsView } from "#holds/views.ts";
import type { SightFailure } from "#sight.ts";

export class HoldSource extends Context.Service<
	HoldSource,
	{
		readonly holdsFeed: Stream.Stream<HoldsView, SightFailure>;
	}
>()("@antumbra/contract/HoldSource") {}
