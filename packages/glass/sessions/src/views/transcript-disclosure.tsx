import { cn } from "@antumbra/glass-components/class-names.ts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@antumbra/glass-components/shadcn/collapsible.tsx";
import { ChevronRightIcon } from "lucide-react";

export const Disclosure = ({
	bare = false,
	body,
	name,
	summary,
	trailing,
}: {
	readonly bare?: boolean;
	readonly body: React.ReactNode;
	readonly name: React.ReactNode;
	readonly summary: string;
	readonly trailing?: React.ReactNode;
}) => (
	<Collapsible className={cn("min-w-0", bare ? undefined : "rounded-md border bg-card")}>
		<CollapsibleTrigger
			className={cn(
				"group flex h-8 w-full min-w-0 items-center gap-1 rounded-md text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
				bare ? undefined : "px-3 hover:bg-accent",
			)}
		>
			<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground group-data-[state=open]:rotate-90" />
			{name}
			<span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{summary}</span>
			{trailing}
		</CollapsibleTrigger>
		<CollapsibleContent className={cn("flex min-w-0 flex-col gap-3", bare ? "pt-3" : "border-t px-3 py-3")}>{body}</CollapsibleContent>
	</Collapsible>
);
