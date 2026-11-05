import { pieceRulingGate } from "@antumbra/domain-pieces/rows/piece-ruling-gate.ts";
import { repoReference } from "@antumbra/domain-repos/rows/repo-reference.ts";
import { rulingGate } from "#rows/gate.ts";
import { ruling } from "#rows/ruling.ts";
export const requestWrites = [ruling, rulingGate, pieceRulingGate, repoReference] as const;
