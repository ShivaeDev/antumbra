export interface ArtifactInput {
	readonly authorAgentId?: string;
	readonly pieceId: string;
	readonly title: string;
	readonly uri: string;
}

export interface ArtifactRow {
	readonly authorAgentId: string | null;
	readonly id: string;
	readonly title: string;
	readonly uri: string;
}

export interface ExternalPublication {
	readonly _tag: "external";
	readonly uri: string;
}

export interface LocalPublication {
	readonly _tag: "local";
	readonly agentId: string;
	readonly moorageRoot: string;
	readonly uri: string;
}

export type ArtifactPublication = ExternalPublication | LocalPublication;
