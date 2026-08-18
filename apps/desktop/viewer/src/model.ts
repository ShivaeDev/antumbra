export interface ArtifactViewerInput {
	readonly artifactId: string;
	readonly byteSize: number;
	readonly digest: string;
	readonly markdown: string;
	readonly title: string;
}
