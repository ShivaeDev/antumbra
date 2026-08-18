import { Data, Effect } from "effect";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false });

export class MermaidRenderFailed extends Data.TaggedError(
	"MermaidRenderFailed",
)<{ readonly detail: string }> {}

export const renderMermaid = (
	id: string,
	source: string,
): Effect.Effect<string, MermaidRenderFailed> =>
	Effect.tryPromise({
		try: () => mermaid.render(id, source).then(({ svg }) => svg),
		catch: (cause) =>
			new MermaidRenderFailed({
				detail:
					cause instanceof Error
						? cause.message
						: "diagram could not be rendered",
			}),
	});
