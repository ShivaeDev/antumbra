import type { Effect, Option, PubSub } from "effect";
import type { Request } from "#requests.ts";
import type { RpcNotification } from "#rpc.ts";
import type { ThreadClaims } from "#thread-claims.ts";
import type { ToolRegistry } from "#tool-registry.ts";

export interface CodexServer {
	readonly exited: Effect.Effect<void>;
	readonly notifications: PubSub.PubSub<RpcNotification>;
	readonly request: Request;
	readonly threads: ThreadClaims;
	readonly tools: ToolRegistry;
	readonly version: Option.Option<string>;
}
