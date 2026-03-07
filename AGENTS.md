# Repository Instructions

## Git workflow

- Do not commit directly to `main` by default.
- For any non-trivial change, create and work on a feature branch first.
- Open a pull request and let CI run before merging.
- Only push directly to `main` if the user explicitly asks for it.
- If work is already in progress on `main`, pause before committing and either:
  - create a branch from the current state, or
  - ask the user whether to continue on `main`.
