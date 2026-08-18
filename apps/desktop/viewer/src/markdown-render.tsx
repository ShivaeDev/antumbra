import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "#viewer/mermaid-diagram.tsx";
import type { ArtifactViewerInput } from "#viewer/model.ts";

const textOf = (value: ReactNode): string => {
	if (typeof value === "string" || typeof value === "number")
		return String(value);
	if (Array.isArray(value)) return value.map(textOf).join("");
	if (isValidElement<{ readonly children?: ReactNode }>(value)) {
		return textOf(value.props.children);
	}
	return "";
};

const diagramCode =
	(
		input: ArtifactViewerInput,
		nextIndex: () => number,
	): NonNullable<Components["code"]> =>
	({ className, children }) => {
		if (className !== "language-mermaid") {
			return <code className={className}>{children}</code>;
		}
		const index = nextIndex();
		return (
			<MermaidDiagram
				digest={input.digest}
				index={index}
				source={textOf(children)}
			/>
		);
	};

const markdownComponents = (input: ArtifactViewerInput): Components => {
	let diagramIndex = 0;
	return {
		code: diagramCode(input, () => diagramIndex++),
	};
};

export const ArtifactDocument = ({
	input,
}: {
	readonly input: ArtifactViewerInput;
}) => (
	<main>
		<h1>{input.title}</h1>
		<ReactMarkdown
			components={markdownComponents(input)}
			remarkPlugins={[remarkGfm]}
			skipHtml
			urlTransform={(url) => url}
		>
			{input.markdown}
		</ReactMarkdown>
	</main>
);
