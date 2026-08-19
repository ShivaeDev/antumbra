import { Cause, Effect, Exit } from "effect";
import { useEffect, useId, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { renderMermaid } from "#adapters/mermaid.ts";
import { cardStyle, mutedStyle } from "#views/styles.ts";

const MermaidDiagram = ({ source }: { readonly source: string }) => {
	const id = `artifact-${useId().replaceAll(":", "")}`;
	const [rendered, setRendered] = useState<
		| { readonly _tag: "failed"; readonly message: string }
		| { readonly _tag: "ready"; readonly svg: string }
		| { readonly _tag: "rendering" }
	>({ _tag: "rendering" });

	useEffect(() => {
		setRendered({ _tag: "rendering" });
		return Effect.runCallback(renderMermaid(id, source), {
			onExit: Exit.match({
				onFailure: (cause) =>
					setRendered({ _tag: "failed", message: Cause.pretty(cause) }),
				onSuccess: (svg) => setRendered({ _tag: "ready", svg }),
			}),
		});
	}, [id, source]);

	if (rendered._tag === "rendering") {
		return <span style={mutedStyle}>rendering diagram…</span>;
	}
	if (rendered._tag === "failed") {
		return <span style={{ color: "#ff7c7c" }}>{rendered.message}</span>;
	}
	return (
		<span
			data-mermaid={true}
			dangerouslySetInnerHTML={{ __html: rendered.svg }}
			style={{ display: "block" }}
		/>
	);
};

export const ArtifactMarkdownView = ({
	markdown,
}: {
	readonly markdown: string;
}) => (
	<div style={{ ...cardStyle, overflowX: "auto", padding: "0.8rem 1rem" }}>
		<Markdown
			components={{
				code: ({ children, className, ...props }) => {
					const source = String(children).replace(/\n$/, "");
					return className === "language-mermaid" ? (
						<MermaidDiagram source={source} />
					) : (
						<code className={className} {...props}>
							{children}
						</code>
					);
				},
			}}
			remarkPlugins={[remarkGfm]}
		>
			{markdown}
		</Markdown>
	</div>
);
