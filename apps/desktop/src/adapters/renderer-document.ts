const RENDERER_URL_FLAG = "--renderer-url=";

interface RendererDocumentInput {
	readonly arguments: ReadonlyArray<string>;
	readonly bundled: string;
	readonly isPackaged: boolean;
}

export const selectRendererDocument = (input: RendererDocumentInput): string => {
	if (input.isPackaged) {
		return input.bundled;
	}
	const override = input.arguments.find((argument) => argument.startsWith(RENDERER_URL_FLAG));
	return override?.slice(RENDERER_URL_FLAG.length) ?? input.bundled;
};
