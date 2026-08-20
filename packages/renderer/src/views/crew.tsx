import type { CrewMemberView } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";
import { Section, SectionHeading } from "#views/section.tsx";

export const CrewPanel = ({
	crew,
}: {
	readonly crew: ReadonlyArray<CrewMemberView>;
}) => (
	<Section>
		<SectionHeading count={crew.length} title="Crew" />
		{crew.length === 0 ? (
			<p className="text-2xs text-muted-foreground">
				Nobody hailed yet — launching a piece brings its hand aboard
			</p>
		) : (
			<ul className="flex min-w-0 flex-col gap-1">
				{crew.map((member) => (
					<li
						className="flex min-w-0 items-center gap-2 text-xs"
						key={member.agentId}
					>
						<span className="min-w-0 truncate font-medium" title={member.role}>
							{member.role}
						</span>
						<span className="shrink-0 font-mono text-2xs text-muted-foreground">
							{member.agentId.slice(0, 8)}
						</span>
						<Badge className="ml-auto" variant="outline">
							{member.status}
						</Badge>
					</li>
				))}
			</ul>
		)}
	</Section>
);
