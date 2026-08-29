#!/usr/bin/env bash
# Per-boot reconciliation for a Cloud Agent.
#
# The base image signs every commit through an SSH agent reached over a host
# socket. Antumbra's git-backed tests (packages/runner-local, packages/git)
# create many commits concurrently, and that signing round-trip stalls under
# load, so those `it.live` suites time out. Turn signing off for this
# development environment; agents still commit and push normally, unsigned.
#
# This runs on every boot, after the image restores its git configuration, so
# the setting holds for the agent's session.
set -euo pipefail

git config --global commit.gpgsign false
git config --global tag.gpgsign false
