import { Context, type Stream } from "effect";
import type { CostsView } from "#costs/views.ts";
import type { SightFailure } from "#sight.ts";

export class CostSource extends Context.Service<
	CostSource,
	{
		readonly costsFeed: Stream.Stream<CostsView, SightFailure>;
	}
>()("@antumbra/contract/CostSource") {}
