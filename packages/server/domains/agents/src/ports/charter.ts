import type { Effect } from "effect";
import { Context } from "effect";
import type { birth } from "#rows/birth.ts";

export interface Chartered {
	readonly text: string;
	readonly constrainedPrompt: string | null;
}

export class Charter extends Context.Service<Charter, { readonly compose: (held: typeof birth.Row.Type) => Effect.Effect<Chartered> }>()(
	"@antumbra/port/charter",
) {}
