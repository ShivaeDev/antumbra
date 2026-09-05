---
name: pr-description
description: >
  Use this skill before writing or editing a pull request title or body, in
  any repository and by any means: by hand, through gh, or through a tool that
  opens a change.
---

# Pull request description

This is the format. It applies in every repository and wins over any template or default. Write the title and the body as described here and move on.

Write for a busy maintainer who was not in the session. They see the title, the body and the diff. They skim first and read only what earns it.

## Title

One line that names the change by its effect on the product or on the people who use it, in the present tense, like a release note:

- Agents at rest are woken by their own mail
- The flagship opens a voyage from one hail

Spend every word on the effect. A type prefix such as `fix:` or `feat:` and a verb such as improve, update, refactor or clean up carry no information.

## Body

Four sections in this order. Why and How are the body. Decisions and Callouts are optional, and most pull requests have neither.

### Why?

The product story: the problem that started the work, the goal, and why it matters. Take it from the session and the task. When the session does not
say, ask.

### How?

The bird's-eye view of the approach, for a technical reader: what was built, how the parts fit, and where it sits in the product. Stay at the level
that lets the reader trust the diff before opening it.

### Decisions (optional)

A decision is a one-way door: a path taken where others were open, hard to walk back once merged, and easy to miss in a diff. A new library, an
architecture, a place where the product now behaves in a way it did not before, a choice made in passing that a maintainer would want to make on
purpose. Name the choice, the path taken, and why, one bullet each.

Write the section when a maintainer could reasonably say "I would have gone the other way", so they get the chance. A clean-up, a better abstraction
or a deleted duplicate is good engineering, and a maintainer wants none of it explained.

### Callouts (optional)

A callout is a risk: the spot with the widest blast radius or the least confidence. A failure that would reach far, a corner cut for a reason, a path
that could not be tested, a place that could be done much better at a cost the change did not pay. Name the spot, the risk, and what a reviewer can do
about it, one bullet each. Before writing one, consider fixing it in the change instead.

Callouts are the reader's test of the whole description. A list of non-issues tells them the author did not understand the change, and they discard
the rest.

## Size and shape

Give Why and How the length the work needs, and spend the words on the story in order. Use short paragraphs with a blank line between them; each
paragraph is one step of the story.

Write in ASD-STE100 Simplified Technical English. Make the point; a story seldom needs the raw figures.

## Visuals

Prefer a visual whenever something can be shown better than told. A table or a Mermaid diagram (GitHub renders fenced `mermaid` blocks) replaces the
prose it makes redundant, with one line that says what to look at.

## Leave out

File lists, test plans, risk speculation, diff narration, pointers to reports, boards, local paths or servers the reader cannot open, attribution and
session trailers.
