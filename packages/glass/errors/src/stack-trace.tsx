import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@antumbra/glass-components/shadcn/collapsible.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@antumbra/glass-components/shadcn/tooltip.tsx";
import { CheckIcon, ChevronRightIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";

const COPIED_MILLIS = 2000;

const CopyTrace = ({ trace }: { readonly trace: string }) => {
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), COPIED_MILLIS);
		return () => clearTimeout(timer);
	}, [copied]);
	const write = () => {
		void navigator.clipboard?.writeText(trace);
		setCopied(true);
	};
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button aria-label="Copy" className="ml-auto" onClick={write} size="icon-sm" variant="ghost">
					{copied ? <CheckIcon /> : <CopyIcon />}
				</Button>
			</TooltipTrigger>
			<TooltipContent>Copy</TooltipContent>
		</Tooltip>
	);
};

export const StackTrace = ({ trace }: { readonly trace: string }) => (
	<Collapsible>
		<div className="flex h-8 items-center gap-1">
			<CollapsibleTrigger className="group flex items-center gap-1 text-xs text-muted-foreground">
				<ChevronRightIcon className="size-4 group-data-[state=open]:rotate-90" />
				Stack trace
			</CollapsibleTrigger>
			<CopyTrace trace={trace} />
		</div>
		<CollapsibleContent>
			<pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{trace}</pre>
		</CollapsibleContent>
	</Collapsible>
);
