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

// why: a report is reached through the pieces it was landed against, so a
// reading carries them and leaves the question of who may see it to whoever
// knows the reader's authority.
export interface ReportReading extends ReportRow {
	readonly pieceIds: ReadonlyArray<string>;
}
