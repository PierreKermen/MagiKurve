# Contributing

First off, thank you for considering contributing to this repository! 

## Issue Templates and Categorization

To make contributing easier and more consistent, we use predefined issue templates. When you create a new issue on GitHub, please select the appropriate template based on the type of work:

- **Feature Request:** For new features, user stories, or enhancements.
- **Bug Report:** For reporting issues or unexpected behavior in the application.
- **Technical Task:** For technical debt, refactoring, infrastructure, or chores.

### Issue Title Naming Convention

To ensure traceability and make it easy to quickly identify the scope and purpose of an issue at a glance, please follow this title naming convention when creating an issue:

`[<Type>] <Short, descriptive summary>`

**Examples:**
- `[Feature] Add user authentication using JWT`
- `[Bug] Fix navigation bar layout on mobile screens`
- `[Chore] Update core dependencies to the latest version`

### Automated Labeling

When you select an issue template, the appropriate `type` label will be automatically applied to help categorize the issue:
- `type: feature`
- `type: bug`
- `type: chore`

### Effort/Time Categorization

To help with time management, velocity tracking, and sprint planning, please apply one of the following `size` labels to your issue once it is created or during triage:

- `size: XS` - Quick fix, < 2 hours
- `size: S` - Minor task, half day
- `size: M` - Standard task, 1-2 days
- `size: L` - Complex task, full sprint

Using these templates and labels ensures our backlog is consistently documented, easily searchable, and that all issues satisfy the "Definition of Ready" from the start.

## Branching Strategy

We follow a DevSecOps-aligned continuous integration branching strategy. This ensures code quality, security, and traceability for all changes.

### Branch Naming Convention

Please follow our branch naming convention, which links directly to the issue tracking system and categorizations:

`<type>/<issue-number>-<short-description>`

- **Feature:** `feature/123-add-login`
- **Bug Fix:** `bug/124-fix-header-spacing`
- **Chore/Technical Task:** `chore/125-update-dependencies`

### Pull Request Process

1. **Branch off `main`:** Always create your feature/fix branch from the latest `main` branch.
2. **Commit often:** Keep your commits small, focused, and provide descriptive commit messages.
3. **Open a Pull Request:** Submit a PR against the `main` branch early to initiate discussion. 
4. **CI/CD & Security Checks:** All automated pipelines (linting, tests, security scans) must pass before merging.
5. **Code Review:** PRs require approval from at least one maintainer or code owner.
6. **Merge Strategy:** We use **Squash and Merge** to maintain a clean, linear history on the `main` branch. Your PR summary will become the commit message.

> [!IMPORTANT]
> The `main` branch is strongly protected. Direct commits are disallowed to ensure all code is properly reviewed and verified by our CI/CD pipelines.
