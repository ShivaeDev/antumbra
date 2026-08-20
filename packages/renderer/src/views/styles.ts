export const buttonStyle: React.CSSProperties = {
	background: "#2e323a",
	border: "none",
	borderRadius: "4px",
	color: "#e4e2dd",
	cursor: "pointer",
	fontSize: "0.75rem",
	padding: "0.2rem 0.6rem",
};

// why: a field sizes itself from its longest option or its default columns, so
// without a floor of its own it decides how wide the pane holding it must be.
export const inputStyle: React.CSSProperties = {
	background: "#20242c",
	border: "1px solid #2e323a",
	borderRadius: "4px",
	color: "#e4e2dd",
	maxWidth: "100%",
	minWidth: 0,
	padding: "0.35rem 0.5rem",
};

export const mutedStyle: React.CSSProperties = {
	color: "#8a8f98",
	fontSize: "0.75rem",
};

// why: every row is a flex line and a flex child at once. A child that keeps
// its content width pushes the pane, the pane pushes the window, and the whole
// layout scrolls sideways — so rows shrink and their prose breaks instead.
export const rowStyle: React.CSSProperties = {
	alignItems: "baseline",
	display: "flex",
	gap: "0.5rem",
	minWidth: 0,
	overflowWrap: "break-word",
};

export const columnStyle: React.CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "0.4rem",
	minWidth: 0,
	overflowWrap: "break-word",
};

export const headingStyle: React.CSSProperties = {
	fontSize: "0.85rem",
	margin: 0,
};

export const cardStyle: React.CSSProperties = {
	background: "#1b1e24",
	border: "1px solid #2e323a",
	borderRadius: "6px",
	display: "flex",
	flexDirection: "column",
	gap: "0.3rem",
	minWidth: 0,
	overflowWrap: "break-word",
	padding: "0.5rem 0.7rem",
};

// why: a branch, a path or a session id has no place to break, so it ends in
// an ellipsis inside the room the row has. The whole of it stays one hover
// away rather than one pane-width away.
export const ellipsisStyle: React.CSSProperties = {
	minWidth: 0,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
};

export const pillStyle = (colour: string): React.CSSProperties => ({
	border: `1px solid ${colour}`,
	borderRadius: "999px",
	color: colour,
	fontSize: "0.7rem",
	padding: "0 0.45rem",
});

// why: diagnostics are for the admiral who goes looking, so a chip sits a
// shade below the muted text the row already uses and stays monospace, which
// is how raw stored words read as raw rather than as product language.
export const chipStyle: React.CSSProperties = {
	border: "1px solid #2a2e35",
	borderRadius: "3px",
	color: "#6f757e",
	fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
	fontSize: "0.65rem",
	padding: "0 0.3rem",
	whiteSpace: "nowrap",
};

export const linkStyle: React.CSSProperties = {
	color: "#7c9cff",
	cursor: "pointer",
	textDecoration: "underline",
};

export const quietButtonStyle: React.CSSProperties = {
	...buttonStyle,
	background: "none",
	color: "#7c9cff",
	padding: 0,
};
