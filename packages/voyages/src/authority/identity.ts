import type { Option } from "effect";

export interface AuthorityIdentity {
	readonly agentId: string;
	readonly pieceId: Option.Option<string>;
	readonly voyageId: Option.Option<string>;
}
