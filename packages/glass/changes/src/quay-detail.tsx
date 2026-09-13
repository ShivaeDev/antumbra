import { cn } from "@antumbra/glass-components/class-names.ts";
import { ExternalLink } from "@antumbra/glass-components/external-link.tsx";
import { SectionHeading } from "@antumbra/glass-components/section.tsx";
import { Badge } from "@antumbra/glass-components/ui/badge.tsx";
import { Button, buttonVariants } from "@antumbra/glass-components/ui/button.tsx";
import { ArrowLeft, ExternalLink as ExternalLinkIcon } from "lucide-react";
import type { ChangesApi, QuayChange } from "#glass.ts";
import { changeNumber } from "#marks.ts";
import { QuayDescription } from "#quay-description.tsx";
import { QuayDismiss } from "#quay-dismiss.tsx";
import { QuayPublication } from "#quay-publication.tsx";
import { QuayStatus } from "#quay-status.tsx";
import { QuayWork } from "#quay-work.tsx";
import { whenLabel } from "#time.ts";

const OriginSession = ({ item, onOpenSession }: { readonly item: QuayChange; readonly onOpenSession: (sessionId: string) => void }) => {
	const sessionId = item.originSessionId;
	if (sessionId === null) {
		return <span className="text-xs text-muted-foreground">No linked session</span>;
	}
	if (item.archivedAt !== null) {
		return <span className="font-mono text-xs text-muted-foreground">Session {sessionId}</span>;
	}
	return (
		<Button
			aria-label="Open originating session"
			className="h-auto justify-start px-0 py-0 font-mono"
			onClick={() => onOpenSession(sessionId)}
			title={`Open session ${sessionId}`}
			type="button"
			variant="link"
		>
			Session {sessionId}
		</Button>
	);
};

const DetailHeader = ({ item, api }: { readonly item: QuayChange; readonly api: ChangesApi }) => {
	const number = changeNumber(item);
	return (
		<header className="flex flex-wrap items-start gap-3 border-border border-b pb-4">
			<div className="min-w-0 flex-1">
				<div className="mb-1 flex flex-wrap items-center gap-1.5">
					<Badge className="font-mono" variant="outline">
						{item.repoName}
					</Badge>
					{number === "" ? null : <span className="font-mono text-xs text-muted-foreground">{number}</span>}
				</div>
				<h2 className="text-lg font-medium wrap-anywhere">{item.title}</h2>
			</div>
			<QuayDismiss item={item} api={api} />
			{item.url === null ? null : (
				<ExternalLink className={cn(buttonVariants({ variant: "default" }), "no-underline")} url={item.url}>
					Open pull request <ExternalLinkIcon aria-hidden="true" />
				</ExternalLink>
			)}
		</header>
	);
};

export const QuayDetail = ({
	api,
	item,
	onBack,
	onOpenSession,
}: {
	readonly item: QuayChange;
	readonly onBack: () => void;
	readonly api: ChangesApi;
	readonly onOpenSession: (sessionId: string) => void;
}) => {
	return (
		<div className="flex min-h-full flex-col gap-6 p-4 sm:p-6">
			<Button className="w-fit md:hidden" onClick={onBack} size="sm" variant="ghost">
				<ArrowLeft /> Back to pull requests
			</Button>
			<DetailHeader item={item} api={api} />
			<QuayStatus item={item} />
			<QuayPublication api={api} item={item} />
			<QuayDescription item={item} />
			<section className="flex flex-col gap-2">
				<SectionHeading title="Branch" />
				<p className="text-xs">
					<code>{item.headRef}</code>
					<span className="px-2 text-muted-foreground">into</span>
					<code>{item.baseRef}</code>
				</p>
				{item.headSha === null ? null : <p className="font-mono text-2xs text-muted-foreground">Commit {item.headSha.slice(0, 12)}</p>}
			</section>
			<QuayWork item={item} />
			<section className="grid gap-3 border-border border-t pt-4 sm:grid-cols-2">
				<div>
					<p className="text-2xs text-muted-foreground">Originating session</p>
					<OriginSession item={item} onOpenSession={onOpenSession} />
				</div>
				<div>
					<p className="text-2xs text-muted-foreground">Latest host activity</p>
					<time className="text-xs" dateTime={item.activityAt}>
						{whenLabel(item.activityAt)}
					</time>
					<p className="text-2xs text-muted-foreground">
						Observed {whenLabel(item.observedAt)} via {item.host}
					</p>
				</div>
			</section>
		</div>
	);
};
