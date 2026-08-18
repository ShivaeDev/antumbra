export interface ArtifactInput {
	readonly authorAgentId?: string;
	readonly pieceId: string;
	readonly supersedesArtifactId?: string;
	readonly title: string;
	readonly uri: string;
}

export interface ArtifactRow {
	readonly authorAgentId: string | null;
	readonly id: string;
	readonly pieceId: string;
	readonly supersededByArtifactId: string | null;
	readonly title: string;
	readonly uri: string;
}

export type ArtifactActor =
	| { readonly _tag: "admiral" }
	| { readonly _tag: "agent"; readonly agentId: string };

export interface ArtifactSupersessionInput {
	readonly actor: ArtifactActor;
	readonly successorArtifactId: string;
	readonly supersededArtifactId: string;
}

export type ArtifactLanding =
	| {
			readonly _tag: "landed";
			readonly artifact: ArtifactRow;
			readonly otherCurrentArtifacts: ReadonlyArray<ArtifactRow>;
	  }
	| {
			readonly _tag: "superseded";
			readonly artifact: ArtifactRow;
			readonly supersededArtifactId: string;
	  };

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
