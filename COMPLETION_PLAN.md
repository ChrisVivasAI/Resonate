# Resonate: App Completion Plan

## Executive Summary

**Resonate** is an AI-powered creative agency management platform that is **~90% complete**. This document outlines the remaining work needed to bring the app to a production-ready finished state.

### Current State Overview

| Category | Status | Details |
|----------|--------|---------|
| Core Features | ✅ Complete | 15+ major modules fully implemented |
| Database | ✅ Complete | 31 tables with RLS policies |
| Authentication | ✅ Complete | Supabase Auth with role-based access |
| API Routes | ✅ Complete | 40+ endpoints |
| UI Components | ✅ Complete | Full design system |
| AI Integration | ✅ Complete | Gemini 3 Pro Image + Veo 3.1 |
| Testing | ❌ Missing | No application tests |
| Security | ⚠️ Needs Work | 8 security advisories |
| Email | ❌ Missing | Invitation emails not implemented |

---

## Phase 1: Critical Security Fixes (Priority: HIGH)

### 1.1 Fix Security Advisories

The Supabase security linter identified 8 issues to address:

#### 1.1.1 RLS Policy for `activities` Table (INFO)
**Issue:** RLS enabled but no policies exist
```sql
-- Add policies for activities table
CREATE POLICY "Team members can view activities"
ON public.activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'member')
  )
);

CREATE POLICY "Authenticated users can insert activities"
ON public.activities FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

#### 1.1.2 Security Definer View (ERROR)
**Issue:** `project_financial_summary` view uses SECURITY DEFINER
```sql
-- Recreate view without SECURITY DEFINER
DROP VIEW IF EXISTS public.project_financial_summary;
CREATE VIEW public.project_financial_summary AS
-- (recreate with same query but default SECURITY INVOKER)
```

#### 1.1.3 Function Search Path (WARN - 4 functions)
**Functions affected:**
- `update_conversation_timestamp`
- `get_user_role`
- `handle_new_user`
- `update_updated_at_column`

```sql
-- Fix each function by setting search_path
ALTER FUNCTION public.update_conversation_timestamp()
SET search_path = public, pg_temp;

ALTER FUNCTION public.get_user_role(uuid)
SET search_path = public, pg_temp;

ALTER FUNCTION public.handle_new_user()
SET search_path = public, pg_temp;

ALTER FUNCTION public.update_updated_at_column()
SET search_path = public, pg_temp;
```

#### 1.1.4 Permissive RLS Policy on `leads` (WARN)
**Issue:** `anon_submit_leads` policy has `WITH CHECK (true)`
```sql
-- Restrict anonymous lead submission
DROP POLICY IF EXISTS "anon_submit_leads" ON public.leads;
CREATE POLICY "anon_submit_leads" ON public.leads
FOR INSERT TO anon
WITH CHECK (
  -- Only allow inserting specific safe fields
  status = 'new' AND
  assigned_to IS NULL AND
  priority = 'medium'
);
```

#### 1.1.5 Enable Leaked Password Protection (WARN)
**Action:** Enable in Supabase Dashboard
1. Go to Authentication → Settings → Password Settings
2. Enable "Leaked Password Protection"

---

## Phase 2: Email Integration (Priority: HIGH)

### 2.1 Add Email Service

**Recommended:** Resend (simple, modern API)

#### 2.1.1 Install Resend
```bash
npm install resend
```

#### 2.1.2 Add Environment Variable
```env
RESEND_API_KEY=re_your_api_key
```

#### 2.1.3 Create Email Service
```typescript
// src/lib/email/index.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendClientInvitation({
  email,
  clientName,
  inviteLink,
}: {
  email: string;
  clientName: string;
  inviteLink: string;
}) {
  return resend.emails.send({
    from: 'Resonate <noreply@yourdomain.com>',
    to: email,
    subject: `You've been invited to Resonate`,
    html: `
      <h1>Welcome to Resonate, ${clientName}!</h1>
      <p>Click the link below to set up your account:</p>
      <a href="${inviteLink}">Accept Invitation</a>
    `,
  });
}
```

#### 2.1.4 Update Invitation Route
Location: `src/app/api/invitations/route.ts` line 70
```typescript
// Replace TODO comment with actual email sending
import { sendClientInvitation } from '@/lib/email';

// After creating invitation:
await sendClientInvitation({
  email: invitation.email,
  clientName: invitation.client_name,
  inviteLink: `${process.env.NEXT_PUBLIC_APP_URL}/auth/invite?token=${invitation.token}`,
});
```

---

## Phase 3: Testing Infrastructure (Priority: MEDIUM)

### 3.1 Setup Testing Framework

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
```

### 3.2 Create Test Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

### 3.3 Priority Test Coverage

| Area | Test Type | Priority |
|------|-----------|----------|
| Auth hooks | Unit | High |
| API routes | Integration | High |
| Form validation | Unit | Medium |
| UI components | Component | Medium |
| E2E flows | E2E | Low |

---

## Phase 4: Feature Polish (Priority: MEDIUM)

### 4.1 Page Builder Completion

The page builder has components but may need:
- [ ] Page preview route (`/p/[slug]`)
- [ ] Page publishing workflow
- [ ] Template gallery UI
- [ ] SEO meta configuration

### 4.2 AI Chat Improvements (Recently Fixed)
- [x] Fix white text on white background
- [x] Add success message after action approval
- [x] Refresh project data after AI changes
- [ ] Add typing indicators
- [ ] Add message loading states
- [ ] Add conversation search

### 4.3 Notification Improvements
- [ ] Real-time push notifications
- [ ] Email notification digests
- [ ] Notification preferences UI

---

## Phase 5: Performance Optimization (Priority: LOW)

### 5.1 Database Indexes

```sql
-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_deliverables_project_id ON public.deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON public.deliverables(status);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON public.expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON public.ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
```

### 5.2 Query Optimization
- [ ] Add pagination to large lists
- [ ] Implement cursor-based pagination for activity feeds
- [ ] Add query caching with React Query

### 5.3 Bundle Optimization
- [ ] Analyze bundle size with `@next/bundle-analyzer`
- [ ] Lazy load heavy components (charts, editors)
- [ ] Optimize image loading

---

## Phase 6: Production Readiness (Priority: HIGH)

### 6.1 Environment Configuration

#### Required Environment Variables
```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (Required for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Google AI (Required for AI Studio)
GEMINI_API_KEY=

# Email (Required for invitations)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 6.2 Deployment Checklist

- [ ] Configure custom domain
- [ ] Set up SSL certificate
- [ ] Configure Stripe webhooks for production
- [ ] Set up error monitoring (Sentry)
- [ ] Configure log aggregation
- [ ] Set up uptime monitoring
- [ ] Create backup strategy
- [ ] Document runbooks

### 6.3 Legal & Compliance
- [ ] Privacy Policy page
- [ ] Terms of Service page
- [ ] Cookie consent banner
- [ ] GDPR compliance review

---

## Implementation Timeline

### Week 1: Security & Email
- [ ] Fix all security advisories
- [ ] Implement email service
- [ ] Test invitation flow end-to-end

### Week 2: Testing Foundation
- [ ] Set up testing infrastructure
- [ ] Write critical path tests
- [ ] Add CI/CD test pipeline

### Week 3: Feature Polish
- [ ] Complete page builder
- [ ] Polish AI chat experience
- [ ] Enhance notifications

### Week 4: Production Prep
- [ ] Performance optimization
- [ ] Production deployment
- [ ] Documentation & handoff

---

## Database Schema Summary

### Tables (31 total in public schema)

| Table | Columns | RLS | Description |
|-------|---------|-----|-------------|
| profiles | 7 | ✅ | User profiles with roles |
| clients | 11 | ✅ | Client management |
| projects | 20 | ✅ | Project tracking |
| tasks | 12 | ✅ | Task management |
| milestones | 10 | ✅ | Milestone tracking |
| deliverables | 18 | ✅ | Deliverable management |
| deliverable_versions | 8 | ✅ | Version history |
| comments | 8 | ✅ | Threaded comments |
| approval_records | 7 | ✅ | Approval workflow |
| activity_feed | 9 | ✅ | Activity history |
| activities | 8 | ⚠️ | Needs RLS policies |
| notifications | 8 | ✅ | User notifications |
| payments | 12 | ✅ | Payment tracking |
| invoices | 16 | ✅ | Invoice management |
| expenses | 18 | ✅ | Expense tracking |
| labor_entries | 13 | ✅ | Labor time tracking |
| time_entries | 9 | ✅ | Time entries |
| expense_categories | 6 | ✅ | Expense categories |
| reimbursements | 22 | ✅ | Reimbursement requests |
| returns | 24 | ✅ | Return tracking |
| leads | 18 | ✅ | Lead management |
| lead_activities | 7 | ✅ | Lead activity history |
| ai_generations | 17 | ✅ | AI generation history |
| pages | 17 | ✅ | Website pages |
| generated_pages | 13 | ✅ | Design-to-code results |
| project_conversations | 6 | ✅ | Chat conversations |
| project_messages | 16 | ✅ | Chat messages |
| project_documents | 12 | ✅ | Project documents |
| project_ai_settings | 18 | ✅ | AI assistant settings |
| project_health_reports | 8 | ✅ | Health analysis |
| project_monitoring_settings | 8 | ✅ | Monitoring config |
| client_invitations | 9 | ✅ | Invitation tokens |

### Storage Buckets (2)

| Bucket | Public | Size Limit | Purpose |
|--------|--------|------------|---------|
| pages | Yes | None | Page assets |
| ai-generations | Yes | 100MB | AI-generated media |

---

## Feature Completion Status

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | ✅ 100% | Supabase Auth + roles |
| Project Management | ✅ 100% | Full CRUD + status |
| Task Management | ✅ 100% | With AI suggestions |
| Milestone Tracking | ✅ 100% | Payment-linked |
| Deliverables | ✅ 100% | Version control + approvals |
| Client Management | ✅ 100% | With portal access |
| Client Portal | ✅ 100% | Separate interface |
| Payments | ✅ 100% | Stripe integration |
| Invoicing | ✅ 100% | Full workflow |
| Financial Tracking | ✅ 100% | Expenses, labor, returns |
| AI Studio | ✅ 100% | Image + video generation |
| Project Health | ✅ 100% | AI-powered analysis |
| Activity Feed | ✅ 100% | Real-time updates |
| Notifications | ✅ 95% | Missing email digests |
| Lead Management | ✅ 100% | Full sales pipeline |
| AI Chat | ✅ 95% | Recently fixed issues |
| Page Builder | ⚠️ 70% | Needs completion |
| Email Service | ❌ 0% | Not implemented |
| Tests | ❌ 0% | Not implemented |

---

## Quick Wins (Can complete immediately)

1. **Enable leaked password protection** - 5 minutes in Supabase dashboard
2. **Fix function search_path** - Single SQL migration
3. **Add activities RLS policies** - Single SQL migration
4. **Fix SECURITY DEFINER view** - Single SQL migration

---

## Conclusion

Resonate is a well-architected, feature-rich application that is very close to production-ready. The main gaps are:

1. **Security fixes** (8 issues) - 1-2 hours
2. **Email integration** - 2-4 hours
3. **Testing setup** - 4-8 hours
4. **Page builder completion** - 8-16 hours

Total estimated effort to production: **2-3 weeks** of focused development.

The codebase demonstrates:
- ✅ Professional Next.js 14 architecture
- ✅ Comprehensive TypeScript types
- ✅ Modern UI with Framer Motion
- ✅ Robust Supabase integration
- ✅ Strong authentication/authorization
- ✅ Full-featured AI capabilities
