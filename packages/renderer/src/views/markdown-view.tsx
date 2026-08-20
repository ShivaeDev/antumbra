import { Cause, Effect, Exit } from "effect";
import { useEffect, useId, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { renderMermaid } from "#adapters/mermaid.ts";
import { cn } from "#lib/utils.ts";
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
			<span className="text-xs text-muted-foreground">rendering diagram…</span>
		);
	}
	if (rendered._tag === "failed") {
		return <span className="text-xs text-destructive">{rendered.message}</span>;
	}
	return (
		<span
			className="block"
			// why: mermaid returns the SVG it just built from the fenced source; it
			// is the renderer's own output, not a document fetched from anywhere.
			dangerouslySetInnerHTML={{ __html: rendered.svg }}
			data-mermaid={true}
		/>
	);
};

// why: everything an agent writes as Markdown — a Report, an Artifact, a line
// of narration in a transcript — goes through this one component, so there is
// exactly one place where agent text becomes markup and one security posture.
export const MarkdownView = ({
	className,
	markdown,
}: {
	readonly className?: string;
	readonly markdown: string;
}) => (
	<div className={cn("markdown min-w-0 wrap-anywhere", className)}>
		<Markdown
			components={{
				a: ({ children, href }) =>
					href === undefined || href === "" ? (
						<span>{children}</span>
					) : (
						<ExternalLink url={href}>{children}</ExternalLink>
					),
				// why: react-markdown hands every component the syntax node it came
				// from. It is not an attribute, and passing it on writes
				// node="[object Object]" into the markup.
				code: ({ children, className: codeClass, node: _node, ...props }) => {
					const source = String(children).replace(/\n$/, "");
					return codeClass === "language-mermaid" ? (
						<MermaidDiagram source={source} />
					) : (
						<code className={codeClass} {...props}>
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
