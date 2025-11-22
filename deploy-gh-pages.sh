#!/usr/bin/env bash
set -e

# --- CONFIG ---
SRC_DIR="src"
BRANCH="gh-pages"

# Ensure we’re on main and it's clean
if [ -n "$(git status --porcelain)" ]; then
  echo "Your working directory has uncommitted changes. Commit or stash first."
  exit 1
fi

# Ensure main is up to date
echo "Checking out main..."
git checkout main
git pull

# Create the gh-pages branch if it doesn't exist
if ! git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  echo "Creating branch $BRANCH..."
  git branch "$BRANCH"
fi

echo "Preparing temporary worktree..."
rm -rf .gh-pages-tmp
git worktree add .gh-pages-tmp "$BRANCH" --force

# Clear old contents
echo "Clearing old gh-pages contents..."
rm -rf .gh-pages-tmp/*

# Copy src/ into the gh-pages worktree root
echo "Copying $SRC_DIR/* into gh-pages branch..."
cp -R "$SRC_DIR"/. .gh-pages-tmp/

# Commit + push
echo "Committing..."
cd .gh-pages-tmp
git add .
git commit -m "Deploy GitHub Pages update" || echo "Nothing to commit."

echo "Pushing to origin..."
git push origin "$BRANCH"

# Cleanup
cd ..
git worktree remove .gh-pages-tmp --force
echo "Done! Deployed to $BRANCH."
