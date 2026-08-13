---
name: project-planner
description: Generate a comprehensive PLAN.md file for a new project. Creates structured plans with tickets that an Orchestrator can execute.
---

# Project Planner Skill

## Purpose

Generate a comprehensive `PLAN.md` file at the start of any new project. This plan serves as the single source of truth that an Orchestrator agent (or human) can use to drive the entire build.

## When to Use

- Starting a new project from scratch
- When the user says "plan this project", "create a plan", or "help me scope this"
- When a project needs structured planning before implementation

## Required Inputs

Before generating the plan, gather these from the user (ask if not provided):

| Input | Description |
|-------|-------------|
| `PROJECT_NAME` | Short identifier for the project |
| `GOAL_ONE_SENTENCE` | Single sentence describing what we're building |
| `TARGET_USER_CONTEXT` | Who will use this and in what context |
| `HARD_CONSTRAINTS` | Non-negotiable requirements (tech stack, deadlines, etc.) |
| `NICE_TO_HAVE` | Optional features if time permits |
| `NON_GOALS` | What is explicitly out of scope |

## Behavior Rules

1. **Only create `PLAN.md`** - Do not implement code or create other files
2. **Do not describe future agents or tmux usage** - Keep the plan implementation-agnostic
3. **Make explicit assumptions** - If details are missing, document assumptions clearly
4. **Write for an Orchestrator** - The plan should be actionable by another agent or developer

## PLAN.md Structure

Use these exact section headings in this exact order:

### 1. Overview
Short description of what we're building and what success looks like.

### 2. Non Goals
What is explicitly out of scope.

### 3. Assumptions
Assumptions made to proceed with planning.

### 4. Constraints
Technical, time, tooling, and platform constraints.

### 5. Architecture Sketch
- High-level architecture and data flow
- Key modules and their responsibilities
- External integrations
- Specific enough to guide implementation, but not pseudo-code heavy

### 6. Definition of Done
Objective criteria determining the app is complete:
- Build requirements
- Test requirements
- Run requirements
- Basic user validation

### 7. Task Backlog
This section is the **source of truth for work**.

Create **10-25 initial tickets** following this exact format:

```
### Ticket: T### Title
- **Priority:** P0 | P1 | P2
- **Status:** Todo
- **Owner:** Unassigned
- **Scope:** [Small, bounded slice of work]
- **Acceptance Criteria:** [Testable criteria]
- **Validation Steps:** [Commands or concrete checks]
- **Notes:** [Empty initially]
```

**Ticket Rules:**
- Each ticket must be independently completable
- Scope must be small and bounded
- Acceptance criteria must be testable
- Validation steps must be commands or concrete checks

### 8. Open Questions
Unknowns requiring decisions, each with context.

### 9. Discovered Issues Log
Start with this line:
> _New issues must be appended here with a timestamp and brief context._

This section is **append-only** during development.

## Output Rules

- Write only the `PLAN.md` content
- Do not wrap in markdown fences
- Do not include commentary outside the plan
- Place the file in the repository root

## Example Usage

User: "I want to build a CLI tool for managing dotfiles"

Claude should:
1. Ask for any missing inputs (constraints, nice-to-haves, etc.)
2. Create `PLAN.md` in the repo root with all sections populated
3. Stop - do not begin implementation

## Validation

After creating the plan, verify:
- [ ] All 9 sections are present with correct headings
- [ ] 10-25 tickets exist in the backlog
- [ ] Each ticket has all required fields
- [ ] Definition of Done has testable criteria
- [ ] File is saved as `PLAN.md` in repo root
