import type ts from "typescript";
import { nodeContextState } from "#lint/rules/service-context-node.ts";

export const nodeIsNonemptyContext = (
	node: ts.TypeNode,
	checker: ts.TypeChecker,
): boolean => nodeContextState(node, checker, new Map(), new Set()) === true;

export const nodeContextVerdict = (
	node: ts.TypeNode,
	checker: ts.TypeChecker,
): boolean | undefined => nodeContextState(node, checker, new Map(), new Set());
