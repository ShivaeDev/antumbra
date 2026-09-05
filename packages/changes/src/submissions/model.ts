export interface SubmitChangeInput {
	readonly agentId: string;
	readonly pieceId: string;
	readonly repoName: string;
	readonly sessionId: string;
}

export interface AdoptChangeInput {
	readonly agentId: string | null;
	readonly pieceId: string;
	readonly repoName: string;
	readonly url: string;
}

export interface OpenChangeInput extends SubmitChangeInput {
	readonly base: string | null;
	readonly body: string;
	readonly draft: boolean;
	readonly title: string;
}

export interface Proposal {
	readonly base: string | null;
	readonly body: string;
	readonly draft: boolean;
	readonly title: string;
}

export interface RepoBerth {
	readonly agentId: string;
	readonly branch: string;
	readonly id: string;
	readonly path: string;
	readonly runner: string;
	readonly slug: string;
	readonly source: string;
}
