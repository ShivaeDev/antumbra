export interface ReportInput {
	readonly authorAgentId?: string;
	readonly body: string;
	readonly pieceId: string;
	readonly title: string;
}

export interface ReportRow {
	readonly authorAgentId: string | null;
	readonly body: string;
	readonly id: string;
	readonly title: string;
}
