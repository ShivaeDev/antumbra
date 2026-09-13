import { cn } from "@antumbra/glass-components/class-names.ts";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

export const Disclosure = ({
	bare = false,
	body,
	name,
	subject,
	summary,
	trailing,
}: {
	readonly bare?: boolean;
	readonly body: React.ReactNode;
	readonly name: React.ReactNode;
	readonly subject: string;
	readonly summary: string;
	readonly trailing?: React.ReactNode;
}) => {
	const [open, setOpen] = useState(false);
	const Chevron = open ? ChevronDown : ChevronRight;
	return (
		<div className={cn("min-w-0", bare ? "" : "rounded-md border border-border bg-card")}>
			<button
				aria-expanded={open}
				className={cn(
					"flex w-full min-w-0 items-center gap-1.5 rounded-md text-left text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
					bare ? "" : cn("px-2 py-1 hover:bg-accent", open && "rounded-b-none"),
				)}
				onClick={() => setOpen(!open)}
				title={open ? `Hide ${subject}` : `Show ${subject}`}
				type="button"
			>
				<Chevron className="size-3 shrink-0 text-muted-foreground" />
				{name}
				<span className="min-w-0 flex-1 truncate text-muted-foreground">{summary}</span>
				{trailing}
			</button>
			{open ? <div className={cn("flex flex-col gap-1.5", bare ? "pt-1.5" : "border-t border-border px-2 py-1.5")}>{body}</div> : null}
		</div>
	);
};
