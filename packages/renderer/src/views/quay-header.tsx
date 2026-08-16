import type { HostCapabilityView } from "@antumbra/contract";
import { useState } from "react";
import { refreshChanges } from "#adapters/trpc-quay.ts";
import {
	buttonStyle,
	columnStyle,
	headingStyle,
	mutedStyle,
	rowStyle,
} from "#views/styles.ts";

// why: a host that cannot act says so in its own words — signed in as whom, or
// what to run — so the reason a change cannot be adopted is read before the
// attempt rather than after it.
const HostLine = ({ host }: { readonly host: HostCapabilityView }) => (
	<span
		style={{ ...mutedStyle, color: host.available ? "#8a8f98" : "#ff9f5c" }}
	>
		{host.tag} · {host.detail}
	</span>
);

export const QuayHeader = ({
	hosts,
	onError,
}: {
	readonly hosts: ReadonlyArray<HostCapabilityView>;
	readonly onError: (message: string) => void;
}) => {
	const [asking, setAsking] = useState(false);
	// why: the button rings the watcher; what a pass costs stays the cadence's
	// decision, so it settles as soon as the ring lands, not when news arrives.
	const ring = () => {
		setAsking(true);
		refreshChanges(() => setAsking(false), onError);
	};
	return (
		<div style={columnStyle}>
			<div style={rowStyle}>
				<h2 style={headingStyle}>the quay</h2>
				<button
					disabled={asking}
					onClick={ring}
					style={{ ...buttonStyle, opacity: asking ? 0.5 : 1 }}
					type="button"
				>
					{asking ? "asking…" : "refresh"}
				</button>
			</div>
			{hosts.length === 0 ? (
				<span style={mutedStyle}>no change host is registered</span>
			) : null}
			{hosts.map((host) => (
				<HostLine host={host} key={host.tag} />
			))}
		</div>
	);
};
