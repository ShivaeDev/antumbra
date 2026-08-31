export interface RegisteredRepo {
	readonly defaultRef: string;
	readonly id: string;
	readonly name: string;
	readonly source: string;
}

export interface RepoRegistration {
	readonly defaultRef: string;
	readonly source: string;
}
