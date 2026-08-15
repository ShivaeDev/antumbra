export interface CharterInput {
	readonly charter: string;
	readonly dependsOn: ReadonlyArray<string>;
	readonly expectation: string;
	readonly role: string;
	readonly title: string;
	readonly voyageId: string;
}

export interface PieceRow {
	readonly charter: string;
	readonly expectation: string;
	readonly id: string;
	readonly launchedAt: Date | null;
	readonly parkedAt: Date | null;
	readonly role: string;
	readonly title: string;
}

export interface EdgeRow {
	readonly fromPieceId: string;
	readonly toPieceId: string;
}
