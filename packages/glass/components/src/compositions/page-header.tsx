import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "#shadcn/tooltip.tsx";

const TITLE = "truncate text-lg font-semibold";

export const PageHeader = ({
	actions,
	back,
	description,
	title,
	titleTooltip,
}: {
	readonly actions?: ReactNode;
	readonly back?: ReactNode;
	readonly description?: ReactNode;
	readonly title: string;
	readonly titleTooltip?: boolean;
}) => (
	<header className="mb-6 flex items-start justify-between gap-4">
		<div className="flex min-w-0 items-start gap-2">
			{back}
			<div className="min-w-0">
				{titleTooltip === true ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<h1 className={TITLE}>{title}</h1>
						</TooltipTrigger>
						<TooltipContent>{title}</TooltipContent>
					</Tooltip>
				) : (
					<h1 className={TITLE}>{title}</h1>
				)}
				{description === undefined ? null : (
					<p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">{description}</p>
				)}
			</div>
		</div>
		{actions === undefined ? null : <div className="flex shrink-0 items-center gap-2">{actions}</div>}
	</header>
);
