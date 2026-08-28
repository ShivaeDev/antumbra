import type { RulingSubjectView, RulingView } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";
import { rulingSubjectLabel } from "#rulings/labels.ts";
import { MarkdownView } from "#views/markdown-view.tsx";
import { RulingAxes } from "#views/ruling-axes.tsx";
import { RulingReclassifications } from "#views/ruling-reclassifications.tsx";
import { RulingReclassify } from "#views/ruling-reclassify.tsx";
import { RulingVerdict } from "#views/ruling-verdict.tsx";
import { whenLabel } from "#voyages/labels.ts";

const subjectKey = (subject: RulingSubjectView): string =>
	`${subject.kind}:${subject.label}`;

export const RulingCard = ({
	onError,
	ruling,
}: {
	readonly onError: (message: string) => void;
	readonly ruling: RulingView;
}) => (
	<li className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-card px-3 py-2.5">
		<div className="flex min-w-0 flex-wrap items-center gap-2">
			<RulingAxes ruling={ruling} />
			<span className="min-w-0 truncate font-mono text-2xs text-muted-foreground">
				{ruling.requesterAgentId}
			</span>
			<span className="ml-auto shrink-0 text-2xs text-muted-foreground tabular-nums">
				asked {whenLabel(ruling.requestedAt)}
			</span>
		</div>
		{ruling.subjects.length === 0 ? null : (
			<div className="flex min-w-0 flex-wrap items-center gap-1">
				{ruling.subjects.map((subject) => (
					<Badge key={subjectKey(subject)} variant="secondary">
						{rulingSubjectLabel[subject.kind]}: {subject.label}
					</Badge>
				))}
			</div>
		)}
		<h3 className="min-w-0 text-sm font-medium">{ruling.question}</h3>
		{/* why: the context is the asker's own prose and is read in the same
		register every other agent-written passage is. */}
		<MarkdownView
			className="text-xs text-muted-foreground"
			markdown={ruling.context}
		/>
		<RulingReclassifications reclassifications={ruling.reclassifications} />
		<RulingReclassify onError={onError} ruling={ruling} />
		<RulingVerdict onError={onError} ruling={ruling} />
	</li>
);
