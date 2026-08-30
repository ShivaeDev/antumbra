export interface ArtifactInput {
	readonly authorAgentId?: string;
	readonly path: string;
	readonly pieceId: string;
	readonly supersedesArtifactId?: string;
	readonly title: string;
}

export interface ArtifactRow {
	readonly authorAgentId: string | null;
	readonly basename: string;
	readonly byteSize: number;
	readonly digest: string;
	readonly id: string;
	readonly pieceId: string;
	readonly supersededByArtifactId: string | null;
	readonly title: string;
}

export type ArtifactActor = { readonly _tag: "admiral" } | { readonly _tag: "agent"; readonly agentId: string };

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

export interface ArtifactPublication {
	readonly agentId: string;
	readonly basename: string;
	readonly byteSize: number;
	readonly digest: string;
	readonly moorageRoot: string;
}

export interface ArtifactMarkdown {
	readonly artifactId: string;
	readonly byteSize: number;
	readonly digest: string;
	readonly markdown: string;
	readonly title: string;
}
