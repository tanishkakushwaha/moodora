#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
account="Tanishkakushwaha"
repository="tanishkakushwaha/moodbloom"
remote_url="https://github.com/tanishkakushwaha/moodbloom.git"

if ! command -v git >/dev/null 2>&1; then
  echo "Git is required. Install it with: sudo apt install git"
  exit 1
fi
if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is required. Install it in your normal terminal with:"
  echo "  sudo apt install gh"
  echo "Then run this script again."
  exit 1
fi

if ! gh auth status --hostname github.com >/dev/null 2>&1; then
  echo "Sign in to GitHub as $account in the browser when prompted."
  gh auth login --hostname github.com --git-protocol https --web
fi
signed_in_account="$(gh api --hostname github.com user --jq .login)"
if [[ "${signed_in_account,,}" != "${account,,}" ]]; then
  echo "GitHub is currently signed in as $signed_in_account."
  echo "Please sign in as $account with: gh auth login --hostname github.com --web"
  exit 1
fi

if ! gh repo view "$repository" >/dev/null 2>&1; then
  echo "Cannot access https://github.com/$repository with this GitHub login."
  echo "Check that the repository exists and that $account has access. Nothing was pushed."
  exit 1
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  git init -b main
fi
branch="$(git symbolic-ref --short HEAD)"
if [[ "$branch" != "main" ]]; then
  echo "This script expects the main branch. Current branch: $branch."
  echo "No branch was renamed and nothing was pushed."
  exit 1
fi
existing_remote="$(git remote get-url origin 2>/dev/null || true)"
if [[ -n "$existing_remote" && "${existing_remote,,}" != "${remote_url,,}" ]]; then
  echo "The project already has a different origin. It was not changed."
  echo "Review it with: git remote -v"
  exit 1
fi

git config --local user.name "$account"
git config --local user.email "tanishkasingh921@gmail.com"
git add --all

# Fail before committing if local secrets or runtime data would be published.
while IFS= read -r -d '' path; do
  case "$path" in
    .env.example) ;;
    .env|.env.*|.data/*|node_modules/*|.next/*|src/generated/*)
      echo "Upload stopped: $path must not be tracked. Nothing was pushed."
      exit 1
      ;;
  esac
done < <(git ls-files -z)

if ! git diff --cached --quiet; then
  if git rev-parse --verify HEAD >/dev/null 2>&1; then
    git commit -m "Update Moodora"
  else
    git commit -m "Initial commit: Moodora"
  fi
fi

if [[ -z "$existing_remote" ]]; then
  git remote add origin "$remote_url"
fi

# Use gh's authenticated credential helper for this push only. Do not embed
# tokens in the remote URL or change global Git credential settings.
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push --set-upstream origin main
printf '\nUploaded successfully: https://github.com/%s\n' "$repository"
