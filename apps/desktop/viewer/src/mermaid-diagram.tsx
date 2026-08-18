import { Effect, Fiber } from "effect";
import { useEffect, useState } from "react";
import { renderMermaid } from "#viewer/adapters/mermaid.ts";

type Rendering =
	| { readonly _tag: "pending" }
	| { readonly _tag: "rendered"; readonly svg: string }
	| { readonly _tag: "refused"; readonly reason: string };

export const MermaidDiagram = ({
	digest,
	index,
	source,
}: {
	readonly digest: string;
	readonly index: number;
	readonly source: string;
}) => {
	const [rendering, setRendering] = useState<Rendering>({ _tag: "pending" });
	useEffect(() => {
		const fiber = Effect.runFork(
			renderMermaid(`artifact-${digest.slice(0, 12)}-${index}`, source).pipe(
				Effect.match({
					onFailure: (failure) =>
						setRendering({ _tag: "refused", reason: failure.detail }),
					onSuccess: (svg) => setRendering({ _tag: "rendered", svg }),
				}),
			),
		);
		return () => void Effect.runFork(Fiber.interrupt(fiber));
	}, [digest, index, source]);
	return rendering._tag === "rendered" ? (
		<div
			className="diagram"
			dangerouslySetInnerHTML={{ __html: rendering.svg }}
		/>
	) : (
		<pre className="diagram-error">
			<code>{source}</code>
			{rendering._tag === "refused" ? (
				<>
					<br />
					Diagram unavailable: {rendering.reason}
				</>
			) : null}
		</pre>
	);
};
