import { Context, type Effect } from "effect";
import type { GhOperation, GhUnavailable } from "#errors.ts";
export interface GhCommand {
	readonly args: ReadonlyArray<string>;
	readonly executable: string;
	readonly operation: GhOperation;
	readonly timeoutMillis: number;
}
export class GhProcess extends Context.Service<
	GhProcess,
	{
		readonly run: (command: GhCommand) => Effect.Effect<unknown, GhUnavailable>;
	}
>()("@antumbra/edge-github/GhProcess") {}
