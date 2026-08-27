const SessionStartPermitTypeId = Symbol(
	"@antumbra/session-fabric/SessionStartPermit",
);

export interface SessionStartPermit {
	readonly [SessionStartPermitTypeId]: true;
}

export const sessionStartPermit: SessionStartPermit = {
	[SessionStartPermitTypeId]: true,
};
