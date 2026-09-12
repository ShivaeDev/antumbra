import { port } from "@antumbra/platform-feature/port.ts";
import type { Effect } from "effect";
import type { birth } from "#rows/birth.ts";

export interface Chartered {
	readonly text: string;
	readonly constrainedPrompt: string | null;
}

export class Charter extends port<Charter, { readonly compose: (held: typeof birth.Row.Type) => Effect.Effect<Chartered> }>()("charter") {}
