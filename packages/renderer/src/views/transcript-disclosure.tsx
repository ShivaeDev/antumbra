import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "#lib/utils.ts";

// why: most of a transcript is evidence rather than narration. An entry states
// itself in one line and keeps the whole of what it carries behind a click, so
// the reading stays skimmable without anything being dropped.
export const Disclosure = ({
	body,
	name,
	subject,
	summary,
	trailing,
}: {
	readonly body: React.ReactNode;
	readonly name: React.ReactNode;
	readonly subject: string;
	readonly summary: string;
	readonly trailing?: React.ReactNode;
}) => {
	const [open, setOpen] = useState(false);
	const Chevron = open ? ChevronDown : ChevronRight;
	return (
		<div className="min-w-0 rounded-md border border-border bg-card">
			<button
				aria-expanded={open}
				className={cn(
					"flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40",
					open && "rounded-b-none",
				)}
				onClick={() => setOpen(!open)}
				title={open ? `Hide ${subject}` : `Show ${subject}`}
				type="button"
			>
				<Chevron className="size-3 shrink-0 text-muted-foreground" />
				{name}
				<span className="min-w-0 flex-1 truncate text-muted-foreground">
					{summary}
				</span>
				{trailing}
			</button>
			{open ? (
				<div className="flex flex-col gap-1.5 border-t border-border px-2 py-1.5">
					{body}
				</div>
			) : null}
		</div>
	);
};
