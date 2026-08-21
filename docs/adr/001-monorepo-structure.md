# ADR-001: Monorepo Structure

## Status
Accepted

## Context
Zisamale consists of 5 components: Android app, Cloud API, ML pipelines, Dashboards, Documentation. These share types, schemas, and configuration.

## Decision
Use a monorepo with directory-per-component structure.

## Consequences
- **Positive**: Shared CI/CD, atomic commits across components, easier cross-cutting changes
- **Positive**: Single clone gets everything; new developers see the full picture
- **Negative**: Larger repo size; each component's build must be targeted
- **Mitigation**: Use path filters in CI to only run relevant tests per component
