#!/usr/bin/env bash

echo "Processing encrypted files"
for file in $(git diff --staged --name-only); do
  if [[ $file != *.md ]]; then
    break
  fi
echo "Only docs, updating commit..."
echo "${cat $HUSKY_GIT_PARAMS} + testing" # >> $HUSKY_GIT_PARAMS
done
