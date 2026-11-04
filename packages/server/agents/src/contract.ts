import { contract } from "@shivaedev/contract/contract.ts";
import { Admit, Cancel, Delay, Hail, Hold, Request, Retire, RetireCrew, Retry, Smooth, Spawn, WorkNow } from "#contract/commands.ts";
import {
	All,
	Authority,
	ById,
	ByPiece,
	BySession,
	ByVoyage,
	CanRetireCrew,
	Captain,
	CaptainReading,
	Reading,
	Roster,
	Smoother,
} from "#contract/reading.ts";
import { Admitted, BirthBySession, Births, Dispatch, Pending, PendingOperations, Rest, WorkingCount } from "#contract/work.ts";
export const AgentsContract = contract("agents", {
	commands: [RetireCrew, Retire, Spawn, Hail, WorkNow, Request, Admit, Hold, Delay, Cancel, Retry, Smooth],
	queries: [
		CanRetireCrew,
		Smoother,
		CaptainReading,
		ByVoyage,
		ByPiece,
		Rest,
		Roster,
		Reading,
		BySession,
		WorkingCount,
		All,
		ById,
		Captain,
		Authority,
		Births,
		BirthBySession,
		Dispatch,
		Pending,
		PendingOperations,
		Admitted,
	],
});
