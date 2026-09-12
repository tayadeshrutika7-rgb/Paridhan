# PARIDHAN Architecture Decision Records (ADR)

## ADR-001: Supabase as Core Database, Auth, and Storage Platform

### Status
Accepted

### Context
We needed a scalable, relational, production-grade PostgreSQL foundation with built-in authentication, file storage, row-level security, and TypeScript typing capabilities, without introducing excessive ORM abstractions or distributed microservice complexity.

### Decision
We selected **Supabase** (PostgreSQL, Supabase Auth, Supabase Storage, and Supabase SQL migrations) as the sole data platform. We explicitly prohibited the use of third-party ORMs (such as Prisma, TypeORM, Sequelize, or Drizzle) to avoid dual-source-of-truth drift, cold-start query overhead, and redundant migration management.

### Consequences
- Single source of truth in Supabase PostgreSQL.
- Fast, parameterized query execution via `@supabase/supabase-js`.
- End-to-end type safety directly from database schema with `supabase gen types typescript`.
- Clean separation: NestJS backend handles authoritative business logic with the service-role key, while clients use the public anon key.
