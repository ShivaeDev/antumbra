import { Cause, Effect, Exit } from "effect";
import { useEffect, useId, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { renderMermaid } from "#adapters/mermaid.ts";
import { ExternalLink } from "#views/external-link.tsx";

const MermaidDiagram = ({ source }: { readonly source: string }) => {
	const id = `outcome-${useId().replaceAll(":", "")}`;
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
		return (
			<span className="text-2xs text-muted-foreground">
				Rendering the diagram…
			</span>
		);
	}
	if (rendered._tag === "failed") {
		return (
			<span className="text-2xs text-destructive wrap-anywhere">
				{rendered.message}
			</span>
		);
	}
	return (
		<span
			className="block"
			data-mermaid={true}
			dangerouslySetInnerHTML={{ __html: rendered.svg }}
		/>
	);
};

// why: Reports and Artifacts are both agent-authored Markdown, so one viewer
// renders both — a second rendering path would be a second security posture.
export const OutcomeMarkdownView = ({
	markdown,
}: {
	readonly markdown: string;
}) => (
	<div className="markdown min-w-0 overflow-x-auto rounded-md border border-border bg-card px-3 py-2.5">
		<Markdown
			components={{
				a: ({ children, href }) =>
					href === undefined || href === "" ? (
						<span>{children}</span>
					) : (
						<ExternalLink url={href}>{children}</ExternalLink>
					),
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
