export const buttonStyle: React.CSSProperties = {
	background: "#2e323a",
	border: "none",
	borderRadius: "4px",
	color: "#e4e2dd",
	cursor: "pointer",
	fontSize: "0.75rem",
	padding: "0.2rem 0.6rem",
};

export const inputStyle: React.CSSProperties = {
	background: "#20242c",
	border: "1px solid #2e323a",
	borderRadius: "4px",
	color: "#e4e2dd",
	padding: "0.35rem 0.5rem",
};

export const mutedStyle: React.CSSProperties = {
	color: "#8a8f98",
	fontSize: "0.75rem",
};

export const rowStyle: React.CSSProperties = {
	alignItems: "baseline",
	display: "flex",
	gap: "0.5rem",
};

export const columnStyle: React.CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "0.4rem",
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
	padding: "0.5rem 0.7rem",
};

export const pillStyle = (colour: string): React.CSSProperties => ({
	border: `1px solid ${colour}`,
	borderRadius: "999px",
	color: colour,
	fontSize: "0.7rem",
	padding: "0 0.45rem",
});

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
