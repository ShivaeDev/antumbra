import type { CrewMemberView } from "@antumbra/contract";
import {
	columnStyle,
	headingStyle,
	mutedStyle,
	rowStyle,
} from "#views/styles.ts";

export const CrewPanel = ({
	crew,
}: {
	readonly crew: ReadonlyArray<CrewMemberView>;
}) => (
	<div style={columnStyle}>
		<h2 style={headingStyle}>crew</h2>
		{crew.length === 0 ? (
			<span style={mutedStyle}>nobody hailed yet</span>
		) : null}
		{crew.map((member) => (
			<div key={member.agentId} style={rowStyle}>
				<strong>{member.role}</strong>
				<span style={mutedStyle}>{member.agentId.slice(0, 8)}</span>
				<span style={mutedStyle}>{member.status}</span>
			</div>
		))}
	</div>
);
