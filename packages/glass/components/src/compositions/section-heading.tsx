import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#shadcn/collapsible.tsx";

const ROW = "mb-3 flex h-7 items-center gap-2 border-b pb-2";

type Words = {
	readonly count?: number | undefined;
	readonly subtitle?: string | undefined;
	readonly title: string;
};

const HeadingWords = (props: Words) => (
	<>
		<h2 className="min-w-0 truncate text-sm font-medium">{props.title}</h2>
		{props.count === undefined ? null : <span className="text-xs text-muted-foreground tabular-nums">{props.count}</span>}
		{props.subtitle === undefined ? null : <span className="text-xs text-muted-foreground">{props.subtitle}</span>}
	</>
);

export const SectionHeading = (props: Words & { readonly action?: ReactNode; readonly children?: ReactNode; readonly collapsible?: boolean }) =>
	props.collapsible === true ? (
		<Collapsible>
			<div className={ROW}>
				<CollapsibleTrigger className="group flex min-w-0 items-center gap-2">
					<ChevronRightIcon className="size-4 shrink-0 text-muted-foreground group-data-[state=open]:rotate-90" />
					<HeadingWords count={props.count} subtitle={props.subtitle} title={props.title} />
				</CollapsibleTrigger>
				{props.action === undefined ? null : <div className="ml-auto">{props.action}</div>}
			</div>
			<CollapsibleContent>{props.children}</CollapsibleContent>
		</Collapsible>
	) : (
		<section>
			<div className={ROW}>
				<HeadingWords count={props.count} subtitle={props.subtitle} title={props.title} />
				{props.action === undefined ? null : <div className="ml-auto">{props.action}</div>}
			</div>
			{props.children}
		</section>
	);
