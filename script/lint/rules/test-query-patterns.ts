import ts from "typescript";
import { effectValueIs } from "#lint/rules/test-imports.ts";

const unwrap = (node: ts.Expression): ts.Expression => {
	let current = node;
	while (ts.isParenthesizedExpression(current) || (ts.isYieldExpression(current) && current.expression !== undefined)) {
		if (current.expression === undefined) break;
		current = current.expression;
	}
	return current;
};

const pipeSteps = (node: ts.Expression): readonly ts.Expression[] =>
	ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "pipe" ? node.arguments : [];

const readsHead = (node: ts.Expression, checker: ts.TypeChecker): boolean => {
	const value = unwrap(node);
	return (
		(ts.isCallExpression(value) && effectValueIs(value.expression, checker, "Stream", "runHead")) ||
		(pipeSteps(value).length === 1 && pipeSteps(value).some((step) => effectValueIs(step, checker, "Stream", "runHead")))
	);
};

const firstAnswer = (node: ts.Expression, checker: ts.TypeChecker): boolean => {
	const value = unwrap(node);
	if (readsHead(value, checker)) return !ts.isCallExpression(value) || !filteredHead(value, checker);
	if (!ts.isIdentifier(value)) return false;
	return (checker.getSymbolAtLocation(value)?.declarations ?? []).some(
		(declaration) =>
			ts.isVariableDeclaration(declaration) &&
			(declaration.parent.flags & ts.NodeFlags.Const) !== 0 &&
			declaration.initializer !== undefined &&
			readsHead(declaration.initializer, checker) &&
			!filteredHeadExpression(declaration.initializer, checker),
	);
};

const filteredHead = (node: ts.CallExpression, checker: ts.TypeChecker): boolean => {
	const steps = pipeSteps(node);
	const first = steps[0];
	const last = steps[1];
	if (steps.length === 2 && first !== undefined && last !== undefined && ts.isCallExpression(first)) {
		return effectValueIs(first.expression, checker, "Stream", "filter") && effectValueIs(last, checker, "Stream", "runHead");
	}
	const input = node.arguments[0];
	return (
		effectValueIs(node.expression, checker, "Stream", "runHead") &&
		input !== undefined &&
		ts.isCallExpression(input) &&
		effectValueIs(input.expression, checker, "Stream", "filter")
	);
};

const filteredHeadExpression = (node: ts.Expression, checker: ts.TypeChecker): boolean => {
	const value = unwrap(node);
	return ts.isCallExpression(value) && filteredHead(value, checker);
};

export const queryAnswerProblem = (node: ts.CallExpression, checker: ts.TypeChecker): string | undefined => {
	if (filteredHead(node, checker)) return "Use eventually(stream, predicate) for the first matching live-query answer.";
	const first = node.arguments[0];
	if (first !== undefined && effectValueIs(node.expression, checker, "Option", "getOrThrow") && firstAnswer(first, checker)) {
		return "Use answered(stream) for the first live-query answer.";
	}
	return undefined;
};
