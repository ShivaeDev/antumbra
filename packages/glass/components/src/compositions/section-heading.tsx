import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "#class-names.ts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#shadcn/collapsible.tsx";

const ROW = "mb-3 flex h-7 items-center gap-2 border-b pb-2";

type Heading = {
	readonly action?: ReactNode;
	readonly count?: number | undefined;
	readonly subtitle?: string | undefined;
	readonly title: string;
};

const HeadingWords = (props: Heading) => (
	<>
		<h2 className="min-w-0 truncate text-sm font-medium">{props.title}</h2>
		{props.count === undefined ? null : <span className="text-xs text-muted-foreground tabular-nums">{props.count}</span>}
		{props.subtitle === undefined ? null : <span className="text-xs text-muted-foreground">{props.subtitle}</span>}
		{props.action === undefined ? null : <div className="ml-auto">{props.action}</div>}
	</>
);

export const SectionHeading = (props: Heading & { readonly children?: ReactNode; readonly collapsible?: boolean }) =>
	props.collapsible === true ? (
		<Collapsible>
			<CollapsibleTrigger className={cn(ROW, "group w-full")}>
				<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground group-data-[state=open]:rotate-90" />
				<HeadingWords action={props.action} count={props.count} subtitle={props.subtitle} title={props.title} />
			</CollapsibleTrigger>
			<CollapsibleContent>{props.children}</CollapsibleContent>
		</Collapsible>
	) : (
		<section>
			<div className={ROW}>
				<HeadingWords action={props.action} count={props.count} subtitle={props.subtitle} title={props.title} />
			</div>
			{props.children}
		</section>
	);
