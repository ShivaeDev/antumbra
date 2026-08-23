import { ArrowLeft, ExternalLink as ExternalLinkIcon } from "lucide-react";
import { openWindow } from "#adapters/trpc-windows.ts";
import { Badge } from "#components/ui/badge.tsx";
import { Button, buttonVariants } from "#components/ui/button.tsx";
import { cn } from "#lib/utils.ts";
import type { QuayChange } from "#quay/changes.ts";
import { changeNumber } from "#quay/marks.ts";
import { ExternalLink } from "#views/external-link.tsx";
import { QuayDescription } from "#views/quay-description.tsx";
import { QuayDismiss } from "#views/quay-dismiss.tsx";
import { QuayStatus } from "#views/quay-status.tsx";
import { QuayWork } from "#views/quay-work.tsx";
import { SectionHeading } from "#views/section.tsx";
import { whenLabel } from "#voyages/labels.ts";

const OriginSession = ({
	item,
	onError,
}: {
	readonly item: QuayChange;
	readonly onError: (message: string) => void;
}) => {
	const sessionId = item.originSessionId;
	if (sessionId === null) {
		return (
			<span className="text-xs text-muted-foreground">No linked session</span>
		);
	}
	return (
		<Button
			aria-label="Open originating session"
			className="h-auto justify-start px-0 py-0 font-mono"
			onClick={() => openWindow({ role: "transcript", sessionId }, onError)}
			title={`Open session ${sessionId}`}
			type="button"
			variant="link"
		>
			Session {sessionId.slice(0, 8)}
		</Button>
	);
};

const DetailHeader = ({
	item,
	onError,
}: {
	readonly item: QuayChange;
	readonly onError: (message: string) => void;
}) => {
	const number = changeNumber(item.change);
	return (
		<header className="flex flex-wrap items-start gap-3 border-border border-b pb-4">
			<div className="min-w-0 flex-1">
				<div className="mb-1 flex flex-wrap items-center gap-1.5">
					<Badge className="font-mono" variant="outline">
						{item.change.repoName}
					</Badge>
					{number === "" ? null : (
						<span className="font-mono text-xs text-muted-foreground">
							{number}
						</span>
					)}
				</div>
				<h2 className="text-lg font-medium wrap-anywhere">
					{item.change.title}
				</h2>
			</div>
			<QuayDismiss item={item} onError={onError} />
			{item.change.url === null ? null : (
				<ExternalLink
					className={cn(buttonVariants({ variant: "default" }), "no-underline")}
					url={item.change.url}
				>
					Open pull request <ExternalLinkIcon aria-hidden="true" />
				</ExternalLink>
			)}
		</header>
	);
};

export const QuayDetail = ({
	item,
	onBack,
	onError,
}: {
	readonly item: QuayChange;
	readonly onBack: () => void;
	readonly onError: (message: string) => void;
}) => {
	return (
		<div className="flex min-h-full flex-col gap-6 p-4 sm:p-6">
			<Button
				className="w-fit md:hidden"
				onClick={onBack}
				size="sm"
				variant="ghost"
			>
				<ArrowLeft /> Back to pull requests
			</Button>
			<DetailHeader item={item} onError={onError} />
			<QuayStatus item={item} />
			<QuayDescription item={item} />
			<section className="flex flex-col gap-2">
				<SectionHeading title="Branch" />
				<p className="text-xs">
					<code>{item.headRef}</code>
					<span className="px-2 text-muted-foreground">into</span>
					<code>{item.baseRef}</code>
				</p>
				{item.headSha === null ? null : (
					<p className="font-mono text-2xs text-muted-foreground">
						Commit {item.headSha.slice(0, 12)}
					</p>
				)}
			</section>
			<QuayWork item={item} />
			<section className="grid gap-3 border-border border-t pt-4 sm:grid-cols-2">
				<div>
					<p className="text-2xs text-muted-foreground">Originating session</p>
					<OriginSession item={item} onError={onError} />
				</div>
				<div>
					<p className="text-2xs text-muted-foreground">Latest host activity</p>
					<time className="text-xs" dateTime={item.change.activityAt}>
						{whenLabel(item.change.activityAt)}
					</time>
					<p className="text-2xs text-muted-foreground">
						Observed {whenLabel(item.change.observedAt)} via {item.change.host}
					</p>
				</div>
			</section>
		</div>
	);
};
