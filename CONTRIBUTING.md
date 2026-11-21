# Contributing

## Language

Use English for source code, comments, API errors, documentation, issue descriptions, pull requests, and commits. Product copy is bilingual: Spanish and English, as authorized in issue #17. Preserve personal names and accents. Keep translation at the presentation boundary and preserve English persisted enum values. The Spanish academic presentation is a separate deliverable.

## GitFlow

| Branch | Starts from | Integrates into | Purpose |
| --- | --- | --- | --- |
| `main` | Initial repository baseline | N/A | Stable, reviewed release history |
| `develop` | `main` | `release/*` | Integration of completed increments |
| `feature/*` | `develop` | `develop` | One coherent design or implementation change |
| `release/*` | `develop` | `main` and `develop` | Stabilization and release preparation |
| `hotfix/*` | `main` | `main` and `develop` | Correction to a published stable version |

Do not create empty release or hotfix branches to decorate the graph. Create them when there is actual release or corrective work.

Example feature sequence:

```sh
git switch develop
git pull --ff-only origin develop
git switch -c feature/service-order-lifecycle
# Make and verify the change.
git add <specific-paths>
git commit -m "feat(orders): enforce service order transitions"
git push -u origin feature/service-order-lifecycle
```

Open a pull request into `develop` and use a merge commit after validation and self-review. Keep pull request titles and merge messages in English. Branch naming guidance is a project convention; branch protections must not be described as enabled until their remote settings have been verified.

## Issues and traceability

Each issue records the problem, relevant `FR-*` or `NFR-*` IDs, acceptance criteria, and expected evidence. Include a normal `Related to #<number>` reference in feature pull requests targeting `develop`.

GitHub closing keywords are interpreted for the default branch. With `main` as the default, a feature pull request into `develop` does not automatically close its issue. Close it explicitly once integration and the acceptance criteria are verified, or keep it open until release when appropriate.

Reference: [GitHub documentation on linking pull requests to issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue).

## Commit messages

Use `type(scope): imperative summary`, with an optional scope.

| Type | Example |
| --- | --- |
| `docs` | `docs(models): describe equipment activity states` |
| `feat` | `feat(inventory): record material issues atomically` |
| `fix` | `fix(equipment): reject duplicate power events` |
| `test` | `test(inventory): cover concurrent stock withdrawals` |
| `refactor` | `refactor(costs): isolate order cost calculation` |
| `chore` | `chore: initialize repository configuration` |
| `ci` | `ci: verify pull requests against develop` |

## Review and completion

Before merging, confirm that the change addresses its issue, supplies both UI locales and uses English consistently for technical artifacts, preserves names, and matches the relevant domain rules. For executable changes, run the applicable automated checks and record their actual results. For diagrams, inspect the rendered result and compare it with the modeled workflow.

Solo work uses an explicitly identified self-review. Do not invent approval by another engineer. Record limitations, deferred requirements, and proposed thresholds honestly.

## Releases

Prepare a `release/<version>` branch when an increment is ready for stabilization. Verify the startup path, migrations, access rules, domain behavior, and documentation before release. Merge the release into `main`, create a version tag, and integrate release fixes back into `develop` without rewriting history.

Use a `hotfix/<description>` branch only for a real defect in a stable release. Verify the correction and integrate it into both long-lived branches. Any teaching-only defect exercise must be labeled as an exercise rather than a real production incident.
