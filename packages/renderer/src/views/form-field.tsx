import { type ReactNode, useId } from "react";

// why: a field hands its control the id its label points at, so a form built
// from these is labelled for a screen reader without every call site inventing
// an id of its own.
export const FormField = ({
	children,
	label,
}: {
	readonly children: (id: string) => ReactNode;
	readonly label: string;
}) => {
	const id = useId();
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<label
				className="text-2xs font-medium text-muted-foreground"
				htmlFor={id}
			>
				{label}
			</label>
			{children(id)}
		</div>
	);
};

export const textAreaClass =
	"min-h-14 w-full min-w-0 resize-y rounded-md border border-border bg-input px-2 py-1.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/40";
