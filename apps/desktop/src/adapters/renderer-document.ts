import { Data, Effect } from "effect";

const RENDERER_URL_FLAG = "--renderer-url=";
const DEV_RENDERER_DOCUMENT = "http://localhost:5183/";

export class RendererDocumentRefused extends Data.TaggedError(
	"RendererDocumentRefused",
)<{ readonly reason: "ambiguous_override" | "invalid_override" }> {}

interface RendererDocumentInput {
	readonly arguments: ReadonlyArray<string>;
	readonly bundled: string;
	readonly isPackaged: boolean;
}

// why: the dev server has one launcher-owned document; a command-line flag is
// never authority to replace packaged UI or name any other network principal.
export const selectRendererDocument = (input: RendererDocumentInput) => {
	if (input.isPackaged) {
		return Effect.succeed(input.bundled);
	}
	const overrides = input.arguments.filter((argument) =>
		argument.startsWith(RENDERER_URL_FLAG),
	);
	if (overrides.length === 0) {
		return Effect.succeed(input.bundled);
	}
	if (overrides.length !== 1) {
		return new RendererDocumentRefused({ reason: "ambiguous_override" });
	}
	return Effect.gen(function* () {
		const candidate = yield* Effect.try({
			catch: () => new RendererDocumentRefused({ reason: "invalid_override" }),
			try: () => new URL(overrides[0]?.slice(RENDERER_URL_FLAG.length) ?? ""),
		});
		if (candidate.toString() !== DEV_RENDERER_DOCUMENT) {
			return yield* new RendererDocumentRefused({
				reason: "invalid_override",
			});
		}
		return DEV_RENDERER_DOCUMENT;
	});
};
