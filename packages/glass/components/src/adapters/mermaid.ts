import { Data, Effect } from "effect";

export class MermaidRenderError extends Data.TaggedError("MermaidRenderError")<{
	readonly message: string;
}> {}

export const renderMermaid = (id: string, source: string): Effect.Effect<string, MermaidRenderError> =>
	Effect.tryPromise({
		catch: (cause) => new MermaidRenderError({ message: String(cause) }),
		try: () =>
			import("mermaid").then(({ default: mermaid }) => {
				mermaid.initialize({ suppressErrorRendering: true });
				return mermaid.render(id, source);
			}),
	}).pipe(Effect.map(({ svg }) => svg));
