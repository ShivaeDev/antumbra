import type { ReactNode } from "react";

export const PageHeader = ({
	actions,
	description,
	title,
}: {
	readonly actions?: ReactNode;
	readonly description?: string | undefined;
	readonly title: string;
}) => (
	<header className="mb-6 flex items-start justify-between gap-4">
		<div className="min-w-0">
			<h1 className="truncate text-lg font-semibold">{title}</h1>
			{description === undefined ? null : <p className="text-xs text-muted-foreground">{description}</p>}
		</div>
		{actions === undefined ? null : <div className="flex shrink-0 items-center gap-2">{actions}</div>}
	</header>
);
