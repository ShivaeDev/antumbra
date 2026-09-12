import { port } from "@antumbra/platform-feature/port.ts";
import type { Effect } from "effect";
import type { birth } from "#rows/birth.ts";

export interface Chartered {
	readonly text: string;
	readonly constrainedPrompt: string | null;
}

export type Born = typeof birth.Row.Type;

export class Charter extends port<Charter, { readonly compose: (born: Born) => Effect.Effect<Chartered> }>()("charter") {}
