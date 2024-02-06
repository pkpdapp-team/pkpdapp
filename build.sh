#!/bin/bash
git_commit_id=$(git rev-parse --short HEAD)
docker compose build --build-arg GIT_COMMIT_ID=$git_commit_id