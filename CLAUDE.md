# SAVR Project - Claude Code Instructions

## Git Branch Hygiene

- **ALWAYS check if a branch/PR has already been merged or closed before pushing to it.** If the branch was previously merged, create a NEW branch with a unique name instead of pushing additional commits to the old branch. Pushing to an already-merged branch will not create a new PR and the changes will be ignored.
- Before pushing, verify branch status: `git ls-remote --heads origin <branch-name>` and check if any associated PR is still open.
- When told to "make corrections in a new PR branch", always create a fresh branch from the latest `main`.
