# Chunky Crayon Education Product Plan

_Created: December 2024_
_Status: Planning_

---

## Executive Summary

Chunky Crayon Edu is a B2B education product that brings AI-powered coloring page generation to nurseries, primary schools, and home educators. It leverages the existing consumer product's core technology while adding classroom management, curriculum alignment, and institutional billing.

**Target MRR Impact**: £2,000-5,000 within 12 months of launch (potentially doubling total MRR)

---

## Table of Contents

1. [Strategic Decision: Subdomain vs Single Domain](#1-strategic-decision-subdomain-vs-single-domain)
2. [Target Audience & Use Cases](#2-target-audience--use-cases)
3. [What We Can Reuse](#3-what-we-can-reuse)
4. [What We Need to Build](#4-what-we-need-to-build)
5. [Technical Architecture](#5-technical-architecture)
6. [Compliance & Legal](#6-compliance--legal)
7. [Pricing & Billing](#7-pricing--billing)
8. [Go-to-Market Strategy](#8-go-to-market-strategy)
9. [Implementation Phases](#9-implementation-phases)
10. [Success Metrics](#10-success-metrics)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Open Questions](#12-open-questions)

---

## 1. Strategic Decision: Subdomain vs Single Domain

### The Question

Should the education product live at:
- **Option A**: `edu.chunkycrayon.com` (subdomain)
- **Option B**: `chunkycrayon.com/schools` (route prefix)
- **Option C**: Same domain with account-type switching

### Recommendation: Option A - Subdomain (`edu.chunkycrayon.com`)

After deep analysis, I recommend the **subdomain approach** for these reasons:

#### Why Subdomain Wins

| Factor | Subdomain | Route Prefix | Same Domain |
|--------|-----------|--------------|-------------|
| **Sales Perception** | ✅ Looks enterprise-ready | ❌ Feels like afterthought | ❌ Confusing for procurement |
| **Compliance Isolation** | ✅ Clear data boundary | ⚠️ Messy | ❌ Mixed child/adult data |
| **SEO** | ✅ Can rank for "edu" keywords | ⚠️ Diluted | ❌ Same domain authority |
| **Authentication** | ✅ Different auth flows | ⚠️ Complex routing | ❌ Confusing UX |
| **Feature Flags** | ✅ Clean separation | ⚠️ Requires checks everywhere | ❌ Leaky abstractions |
| **Pricing Pages** | ✅ Dedicated for schools | ⚠️ URL complexity | ❌ Which pricing do I show? |
| **Cookie/Session** | ✅ Isolated by default | ⚠️ Shared, needs care | ❌ Shared |
| **Analytics** | ✅ Clean segmentation | ⚠️ Requires filtering | ❌ Mixed data |

#### Technical Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                    Same Next.js Application                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐     ┌─────────────────────────┐   │
│  │  chunkycrayon.com   │     │  edu.chunkycrayon.com   │   │
│  │                     │     │                         │   │
│  │  - Consumer landing │     │  - School landing       │   │
│  │  - Family pricing   │     │  - Edu pricing          │   │
│  │  - Personal auth    │     │  - Class code auth      │   │
│  │  - Parent dashboard │     │  - Teacher dashboard    │   │
│  │  - Colo mascot      │     │  - Progress reports     │   │
│  └─────────────────────┘     └─────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               Shared Components & Logic               │   │
│  │  - Coloring canvas        - AI generation            │   │
│  │  - Image processing       - PDF export               │   │
│  │  - Color palette          - Brush tools              │   │
│  │  - Sticker system         - Effects                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Shared Database                     │   │
│  │  - Users (with organizationType field)               │   │
│  │  - Organizations (schools, nurseries)                │   │
│  │  - Subscriptions (consumer + edu plans)              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Middleware Approach

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const isEdu = hostname.startsWith('edu.');

  // Set context for the request
  request.headers.set('x-product-context', isEdu ? 'edu' : 'consumer');

  // Route to appropriate layouts
  if (isEdu) {
    // Edu subdomain routes
    return NextResponse.rewrite(new URL(`/edu${request.nextUrl.pathname}`, request.url));
  }

  return NextResponse.next();
}
```

#### Shared Codebase, Different Experiences

The subdomain approach does NOT mean separate codebases. Instead:

```
apps/web/
├── app/
│   ├── (consumer)/          # Consumer routes (chunkycrayon.com)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── pricing/
│   │   └── create/
│   │
│   ├── (edu)/               # Edu routes (edu.chunkycrayon.com)
│   │   ├── layout.tsx
│   │   ├── page.tsx         # School landing page
│   │   ├── pricing/
│   │   ├── dashboard/       # Teacher dashboard
│   │   ├── classroom/       # Classroom management
│   │   └── reports/
│   │
│   └── (shared)/            # Shared routes (both domains)
│       ├── color/[id]/      # Coloring experience
│       ├── gallery/
│       └── api/
│
├── components/
│   ├── consumer/            # Consumer-specific components
│   ├── edu/                 # Edu-specific components
│   └── shared/              # Shared components (most of them)
```

### Teacher-Parent Dual Use

A teacher who is also a parent should be able to use both products without friction:

```
┌─────────────────────────────────────────────────────────────┐
│                     User: sarah@email.com                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Personal Context (chunkycrayon.com)                        │
│  ├── Profile: Sarah (Adult)                                 │
│  ├── Profile: Emma (Age 6)                                  │
│  ├── Profile: Jack (Age 4)                                  │
│  └── Subscription: Rainbow Plan (personal)                  │
│                                                              │
│  School Context (edu.chunkycrayon.com)                      │
│  ├── Organization: Sunshine Primary School                  │
│  ├── Role: Year 2 Teacher                                   │
│  ├── Classroom: Year 2 Class A (28 students)                │
│  └── Subscription: Classroom Plan (school pays)             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Target Audience & Use Cases

### Primary Segments

#### Segment 1: Nurseries & Early Years (Ages 2-5)

**Profile**: Small nurseries, childminders, early years settings
**Size**: 10-50 children
**Budget**: £50-200/year
**Decision Maker**: Nursery manager or owner

**Use Cases**:
- Rainy day activities
- Themed weeks (dinosaurs, space, seasons)
- Fine motor skill development
- Quiet time activities
- Parent gifts (Mother's Day, Christmas)

**Key Needs**:
- Very simple UI (no reading required)
- Print-focused workflow
- Quick setup (no IT department)
- Age-appropriate content guaranteed

#### Segment 2: Primary Schools (Ages 5-11)

**Profile**: State and independent primary schools
**Size**: 100-500 pupils
**Budget**: £200-1,000/year
**Decision Maker**: Head teacher, ICT coordinator, or art teacher

**Use Cases**:
- Art lessons supplement
- Cross-curricular activities (history, science themes)
- Reward time / golden time
- SEN support (calming activity)
- After-school clubs

**Key Needs**:
- Curriculum alignment (UK National Curriculum)
- Teacher dashboard for class management
- Progress tracking
- Integration with existing systems (Google Classroom)
- GDPR compliance documentation

#### Segment 3: Home Educators

**Profile**: Parents who homeschool
**Size**: 1-5 children
**Budget**: £50-150/year
**Decision Maker**: Parent

**Use Cases**:
- Art education component
- Reward after academic work
- Creative expression
- Themed learning units

**Key Needs**:
- Flexible (not classroom-structured)
- Multiple age ranges
- Curriculum resources (optional)
- No class code complexity

### Secondary Segments (Future)

- **SEN Schools**: Specialized accessibility needs
- **Art Therapists**: Professional use for therapy
- **Museums/Libraries**: Public engagement programs
- **After-School Clubs**: Activity providers

---

## 3. What We Can Reuse

### Core Technology (100% Reusable)

| Component | Location | Notes |
|-----------|----------|-------|
| AI Image Generation | `app/api/generate/` | Text/voice/image → coloring page |
| Coloring Canvas | `components/ColoringCanvas/` | All brush types, effects, zoom |
| PDF Export | `utils/pdf/` | Print-ready output |
| Image Processing | `utils/image/` | Potrace, optimization |
| Color Palette | `constants.ts` | Kid-friendly colors |
| Sticker System | `components/Stickers/` | All stickers and placement |
| Effects | `components/Effects/` | Glitter, rainbow, glow |

### Partially Reusable

| Component | Reuse % | Adaptation Needed |
|-----------|---------|-------------------|
| Profile System | 70% | Add student profiles linked to classrooms |
| Gallery | 80% | Add classroom-scoped galleries |
| Authentication | 50% | Add class code auth, school SSO |
| Billing | 40% | Add invoicing, annual contracts |
| Analytics | 60% | Add classroom-level metrics |
| Translations | 90% | Add edu-specific strings |

### Not Reusable (Consumer-Specific)

- Colo mascot evolution (consider edu-specific version?)
- Weekly challenges (replace with classroom challenges?)
- Consumer pricing page
- Parent dashboard layout

---

## 4. What We Need to Build

### Priority 1: Core Edu Infrastructure

#### 4.1 Organization Model

```prisma
model Organization {
  id              String   @id @default(cuid())
  name            String
  type            OrganizationType
  slug            String   @unique

  // Contact
  contactEmail    String
  contactName     String
  phone           String?

  // Address (for invoicing)
  addressLine1    String?
  addressLine2    String?
  city            String?
  postcode        String?
  country         String   @default("GB")

  // Settings
  settings        Json     @default("{}")

  // Relations
  members         OrganizationMember[]
  classrooms      Classroom[]
  subscriptions   Subscription[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum OrganizationType {
  NURSERY
  PRIMARY_SCHOOL
  SECONDARY_SCHOOL
  HOME_EDUCATION
  OTHER
}

model OrganizationMember {
  id              String   @id @default(cuid())
  organizationId  String
  userId          String
  role            OrganizationRole

  organization    Organization @relation(fields: [organizationId], references: [id])
  user            User         @relation(fields: [userId], references: [id])

  @@unique([organizationId, userId])
}

enum OrganizationRole {
  OWNER       // Can manage billing, add admins
  ADMIN       // Can manage teachers, settings
  TEACHER     // Can manage own classrooms
  ASSISTANT   // Can use with students, limited management
}
```

#### 4.2 Classroom Model

```prisma
model Classroom {
  id              String   @id @default(cuid())
  organizationId  String
  name            String          // "Year 2 Class A"
  yearGroup       String?         // "Year 2", "Reception"
  classCode       String   @unique // "ABC-123" for student login

  // Settings
  maxStudents     Int      @default(35)
  settings        Json     @default("{}")

  // Relations
  organization    Organization    @relation(fields: [organizationId], references: [id])
  teacher         User            @relation("ClassroomTeacher", fields: [teacherId], references: [id])
  teacherId       String
  students        Student[]
  activities      ClassroomActivity[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Student {
  id              String   @id @default(cuid())
  classroomId     String
  displayName     String          // "Emma S." (no full names for privacy)
  avatarEmoji     String   @default("🎨")

  // No email/password - students access via class code
  // For older students, optional PIN
  pin             String?         // 4-digit PIN for individual identification

  classroom       Classroom       @relation(fields: [classroomId], references: [id])
  artworks        ColoringImage[]

  createdAt       DateTime @default(now())
}
```

#### 4.3 Teacher Dashboard

**Routes**:
```
/dashboard                    # Overview: recent activity, quick actions
/dashboard/classrooms         # List of classrooms
/dashboard/classrooms/[id]    # Single classroom view
/dashboard/classrooms/[id]/students
/dashboard/classrooms/[id]/activities
/dashboard/classrooms/[id]/gallery
/dashboard/reports            # Progress reports
/dashboard/settings           # School settings
```

**Dashboard Home Features**:
- Recent student creations (thumbnail grid)
- Quick actions: "Start Coloring Session", "Print Class Set"
- Class activity summary (creations this week)
- Upcoming: scheduled activities

**Classroom View Features**:
- Student grid with avatars and names
- Class code display (for projector)
- "Start Session" button (opens coloring for whole class)
- Activity history
- Bulk actions (print all, export report)

#### 4.4 Student Experience (Class Code Flow)

```
┌─────────────────────────────────────────────────────────────┐
│                  edu.chunkycrayon.com                        │
│                                                              │
│         ┌─────────────────────────────────────┐             │
│         │                                     │             │
│         │    Enter your class code:           │             │
│         │                                     │             │
│         │    ┌─────┐ ┌─────┐ ┌─────┐         │             │
│         │    │  A  │ │  B  │ │  C  │         │             │
│         │    └─────┘ └─────┘ └─────┘         │             │
│         │              -                      │             │
│         │    ┌─────┐ ┌─────┐ ┌─────┐         │             │
│         │    │  1  │ │  2  │ │  3  │         │             │
│         │    └─────┘ └─────┘ └─────┘         │             │
│         │                                     │             │
│         │         [ Join Class ]              │             │
│         │                                     │             │
│         └─────────────────────────────────────┘             │
│                                                              │
│    Teachers: Sign in here                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

                          ↓

┌─────────────────────────────────────────────────────────────┐
│         Who are you? (Select your name)                      │
│                                                              │
│    ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐          │
│    │  🎨   │  │  🌈   │  │  🦄   │  │  🚀   │          │
│    │ Emma S │  │ Jack T │  │ Lily M │  │ Noah R │          │
│    └────────┘  └────────┘  └────────┘  └────────┘          │
│                                                              │
│    ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐          │
│    │  🎸   │  │  🐕   │  │  🌺   │  │  ⚽   │          │
│    │ Ava J  │  │ Theo B │  │ Isla W │  │ Leo H  │          │
│    └────────┘  └────────┘  └────────┘  └────────┘          │
│                          ...                                 │
└─────────────────────────────────────────────────────────────┘
```

**Key Design Decisions**:
- No passwords for young children (ages 3-8)
- Class code + name selection is sufficient
- Teacher can reset class code if compromised
- Optional PIN for older students (Years 5-6)
- Session-based (not persistent login)

### Priority 2: Edu-Specific Features

#### 4.5 Activity Templates

Pre-made prompts aligned to curriculum:

```typescript
const ACTIVITY_TEMPLATES = {
  earlyYears: [
    {
      id: 'ey-seasons-autumn',
      title: 'Autumn Leaves',
      prompt: 'falling autumn leaves with acorns and conkers',
      curriculum: 'Understanding the World',
      ageRange: '3-5',
    },
    // ...
  ],
  year1: [
    {
      id: 'y1-animals-pets',
      title: 'Our Pets',
      prompt: 'a friendly pet [dog/cat/rabbit] in a cozy home',
      curriculum: 'Science - Animals',
      ageRange: '5-6',
    },
    // ...
  ],
  // ... more year groups
};
```

#### 4.6 Progress Reports

**Report Types**:
1. **Weekly Digest** (email to teacher)
   - Creations per student
   - Most popular prompts
   - Time spent coloring

2. **Individual Student Report** (PDF export)
   - Artworks created
   - Skills demonstrated (color variety, completion)
   - Progress over time

3. **Class Overview** (dashboard view)
   - Participation rates
   - Engagement metrics
   - Curriculum coverage

#### 4.7 Print Workflow Enhancements

Schools print a LOT. Optimize for this:

```
┌─────────────────────────────────────────────────────────────┐
│                    Print Class Set                           │
│                                                              │
│  Select students:  [✓] All  [ ] Select individually         │
│                                                              │
│  Layout:           ( ) 1 per page                           │
│                    (•) 2 per page                           │
│                    ( ) 4 per page (thumbnail)               │
│                                                              │
│  Include:          [✓] Student name                         │
│                    [✓] Date                                 │
│                    [ ] Class name                           │
│                                                              │
│  Pages to print:   28 pages (A4)                            │
│                                                              │
│                    [ Download PDF ]                          │
└─────────────────────────────────────────────────────────────┘
```

### Priority 3: Nice-to-Haves

#### 4.8 Rostering Integration (Future)

Integration with school management systems:

| System | Coverage | Priority |
|--------|----------|----------|
| Google Classroom | High (many UK schools) | High |
| Microsoft 365 Education | Medium | Medium |
| Clever | USA-focused | Low |
| Wonde | UK schools | Medium |

#### 4.9 Edu-Specific Gamification (Future)

Instead of Colo mascot evolution, consider:
- Class-wide "coloring thermometer" (collective progress)
- Star of the day/week
- Classroom badges
- Art gallery showcase

---

## 5. Technical Architecture

### 5.1 Multi-Tenant Database Design

```prisma
// Add to existing User model
model User {
  // ... existing fields

  // New: organization memberships
  organizationMemberships OrganizationMember[]

  // New: teaching assignments
  classroomsTeaching      Classroom[] @relation("ClassroomTeacher")
}

// Add to existing ColoringImage model
model ColoringImage {
  // ... existing fields

  // New: classroom context (optional)
  classroomId     String?
  studentId       String?

  classroom       Classroom? @relation(fields: [classroomId], references: [id])
  student         Student?   @relation(fields: [studentId], references: [id])
}
```

### 5.2 Subdomain Routing

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const isEdu = hostname.startsWith('edu.');

  // Store context in header for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-chunky-context', isEdu ? 'edu' : 'consumer');

  // Rewrite to appropriate route group
  const pathname = request.nextUrl.pathname;

  if (isEdu && !pathname.startsWith('/edu')) {
    // Rewrite edu.chunkycrayon.com/foo → /edu/foo
    return NextResponse.rewrite(
      new URL(`/edu${pathname}`, request.url),
      { headers: requestHeaders }
    );
  }

  return NextResponse.next({ headers: requestHeaders });
}

export const config = {
  matcher: ['/((?!api|_next|static|favicon.ico).*)'],
};
```

### 5.3 Authentication Strategy

```typescript
// Edu-specific auth options
const eduAuthOptions: NextAuthOptions = {
  providers: [
    // Teacher login via email magic link
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),

    // Google Workspace for Education
    GoogleProvider({
      clientId: process.env.GOOGLE_EDU_CLIENT_ID,
      clientSecret: process.env.GOOGLE_EDU_CLIENT_SECRET,
      authorization: {
        params: {
          hd: '*', // Any Google Workspace domain
        },
      },
    }),

    // Future: Microsoft 365 Education
  ],

  callbacks: {
    async signIn({ user, account }) {
      // Verify teacher is associated with an organization
      // or allow signup for new teachers
      return true;
    },
  },
};

// Student auth is separate - class code based
// No NextAuth, just session cookie with classroom context
```

### 5.4 API Structure

```
app/api/
├── (shared)/                 # Used by both consumer and edu
│   ├── generate/            # AI generation
│   ├── images/              # Image serving
│   └── pdf/                 # PDF generation
│
├── (consumer)/              # Consumer-only
│   ├── user/
│   ├── profiles/
│   └── stickers/
│
└── (edu)/                   # Edu-only
    ├── organizations/       # School management
    ├── classrooms/          # Classroom CRUD
    ├── students/            # Student management
    ├── activities/          # Classroom activities
    ├── reports/             # Progress reports
    └── auth/
        └── class-code/      # Class code authentication
```

---

## 6. Compliance & Legal

### 6.1 COPPA (Children's Online Privacy Protection Act)

**Applicability**: US-based schools/children
**Key Requirements**:
- Verifiable parental consent for under-13s
- In edu context: school can consent on behalf of parents
- Limited data collection
- Right to delete

**Our Approach**:
- Schools sign agreement that they have obtained necessary consents
- Minimal data on students (display name + emoji only)
- No tracking of individual students across sessions
- Teacher can delete student data anytime

### 6.2 GDPR / UK-GDPR

**Applicability**: All UK schools
**Key Requirements**:
- Lawful basis for processing
- Data minimization
- Right to access, rectify, delete
- Data protection by design

**Our Approach**:
- Lawful basis: Legitimate interest (educational service)
- Data Processing Agreement (DPA) for schools
- Student names are display names only (not legal names)
- No persistent tracking of students
- Easy export/deletion for schools

### 6.3 KCSIE (Keeping Children Safe in Education)

**Applicability**: All UK schools
**Key Requirements**:
- Content must be age-appropriate
- Filtering of harmful content

**Our Approach**:
- Same content moderation as consumer (already child-safe)
- AI generation has safety filters
- Gallery content is moderated
- Schools can disable community features

### 6.4 Required Documents

| Document | Purpose | Status |
|----------|---------|--------|
| Privacy Policy (Edu) | Legal requirement | ⏳ To create |
| Terms of Service (Edu) | Legal requirement | ⏳ To create |
| Data Processing Agreement | GDPR requirement for schools | ⏳ To create |
| Cookie Policy | Legal requirement | ⏳ Update existing |
| Safeguarding Statement | School trust | ⏳ To create |
| Accessibility Statement | Legal requirement | ⏳ To create |

---

## 7. Pricing & Billing

### 7.1 Edu Pricing Tiers

| Tier | Price | Included | Target |
|------|-------|----------|--------|
| **Classroom** | £5/month | 1 teacher, 35 students, 1 classroom | Single teacher |
| **School** | £20/month | 10 teachers, unlimited students, unlimited classrooms | Small school |
| **School Plus** | £50/month | Unlimited teachers, priority support, SSO | Large school |
| **District** | Custom | Multi-school, dedicated support, API access | MATs, districts |

**All tiers include**:
- Unlimited AI generations
- Unlimited printing
- Activity templates
- Basic reporting
- Email support

**Annual discount**: 2 months free (pay for 10, get 12)

### 7.2 Billing Differences from Consumer

| Aspect | Consumer | Edu |
|--------|----------|-----|
| Payment method | Credit card | Invoice or card |
| Billing cycle | Monthly/annual | Annual preferred |
| Renewal | Auto-renew | Quote + PO process |
| VAT | Included | Exempt for schools |
| Refunds | 30-day | Pro-rated |

### 7.3 Invoicing System

Schools don't use credit cards. Need:

```
Invoice #CC-EDU-2024-0001

Chunky Crayon Ltd
123 Example Street
London, SE1 1AA

Bill To:
Sunshine Primary School
Attn: School Business Manager
45 School Lane
Manchester, M1 2AB

Purchase Order: PO-2024-789

─────────────────────────────────────────────────
Description              Qty    Unit Price    Total
─────────────────────────────────────────────────
School Plan (Annual)      1      £200.00    £200.00
─────────────────────────────────────────────────
                               Subtotal:    £200.00
                                    VAT:     Exempt
                                  TOTAL:    £200.00
─────────────────────────────────────────────────

Payment Terms: Net 30
Bank Details: [...]
```

**Implementation Options**:
1. **Stripe Invoicing** - Built-in, handles most cases
2. **Custom + Xero/QuickBooks** - More flexibility
3. **Manual initially** - Start simple, automate later

**Recommendation**: Start with Stripe Invoicing, manual override for edge cases.

---

## 8. Go-to-Market Strategy

### 8.1 Phase 1: Beta (Months 1-2)

**Goal**: Validate with 5-10 schools, iterate on feedback

**Tactics**:
1. **Personal network**: Know any teachers? Start there
2. **Teacher forums**: TES Community, Primary Resources
3. **Local schools**: Cold outreach to nearby schools
4. **Free pilot**: 3-month free trial for beta schools

**Success Criteria**:
- 5+ schools actively using
- NPS > 40
- List of must-fix issues

### 8.2 Phase 2: Launch (Months 3-4)

**Goal**: Public launch, first paying customers

**Tactics**:
1. **Landing page**: edu.chunkycrayon.com with school-focused messaging
2. **Case studies**: Write up beta school experiences
3. **Teacher influencers**: Reach out to edu-Twitter/Instagram teachers
4. **Show & tell**: Live demos at school events

**Channels**:
| Channel | Cost | Reach | Conversion |
|---------|------|-------|------------|
| Teacher word-of-mouth | Free | Slow | High |
| Facebook Groups | Free | Medium | Medium |
| TES Resources | £50-200 | High | Medium |
| Google Ads (edu keywords) | £500+ | High | Low |

### 8.3 Phase 3: Growth (Months 5-12)

**Goal**: Reach £2,000+ MRR

**Tactics**:
1. **Referral program**: School refers school → 1 month free
2. **Conference presence**: BETT, Education Show
3. **Content marketing**: Blog posts on creative activities
4. **Partnerships**: Art supply companies, edu tech platforms

---

## 9. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

- [ ] **Subdomain setup**
  - Configure `edu.chunkycrayon.com` in Vercel
  - Set up middleware for subdomain routing
  - Create edu layout with school-focused design

- [ ] **Database schema**
  - Add Organization, Classroom, Student models
  - Add OrganizationMember for teacher roles
  - Migrate existing schema

- [ ] **Basic auth**
  - Teacher signup/login
  - Class code generation
  - Student class code entry

- [ ] **Teacher dashboard MVP**
  - Create classroom
  - Add students (display name + emoji)
  - View class code

### Phase 2: Core Experience (Weeks 5-8)

- [ ] **Student flow**
  - Class code entry page
  - Student selection (from list)
  - Simplified coloring experience
  - Save to classroom gallery

- [ ] **Classroom management**
  - Edit students
  - Regenerate class code
  - View student artworks
  - Basic activity assignment

- [ ] **Printing enhancements**
  - Bulk print class set
  - Layout options (1/2/4 per page)
  - Name/date labels

### Phase 3: Edu Features (Weeks 9-12)

- [ ] **Activity templates**
  - Curated prompt library
  - Curriculum tagging
  - Assign to classroom

- [ ] **Reporting**
  - Classroom activity summary
  - Individual student progress
  - Export to PDF

- [ ] **Billing**
  - Edu pricing tiers
  - Stripe invoicing
  - Annual subscriptions

- [ ] **Compliance**
  - Privacy policy (edu)
  - DPA template
  - Safeguarding statement

### Phase 4: Polish & Launch (Weeks 13-16)

- [ ] **Landing page**
  - edu.chunkycrayon.com homepage
  - Features, pricing, FAQ
  - Sign up flow

- [ ] **Beta program**
  - Recruit 5-10 schools
  - Gather feedback
  - Iterate on UX

- [ ] **Documentation**
  - Teacher onboarding guide
  - Video tutorials
  - FAQ

- [ ] **Launch**
  - Public announcement
  - Press outreach
  - Teacher community posts

---

## 10. Success Metrics

### North Star Metric

**Weekly Active Classrooms (WAC)**: Number of classrooms with at least one coloring session in the past 7 days.

### Supporting Metrics

| Metric | Target (Month 6) | Target (Month 12) |
|--------|------------------|-------------------|
| Registered schools | 50 | 200 |
| Paying schools | 10 | 50 |
| MRR | £500 | £2,000 |
| WAC | 30 | 100 |
| Teacher NPS | 50+ | 60+ |
| Churn (monthly) | <5% | <3% |
| Artworks/classroom/week | 20+ | 30+ |

### Tracking

- **PostHog**: Product analytics (existing)
- **Stripe**: Revenue metrics
- **Custom dashboard**: Edu-specific metrics (WAC, classrooms, etc.)

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Schools don't pay (free alternatives) | Medium | High | Focus on unique AI generation value, time-saving |
| GDPR/COPPA compliance issues | Low | Critical | Legal review, DPA, minimal data collection |
| Teachers find it too complex | Medium | High | Extensive UX testing, onboarding videos |
| Slow school procurement | High | Medium | Target individual teachers first, school later |
| Technical issues during lessons | Medium | High | Offline fallback, reliability focus |
| AI generates inappropriate content | Low | Critical | Same safety filters as consumer, extra review |

---

## 12. Open Questions

### Strategic

1. **Should edu have its own mascot?** (Colo might be too "gamey" for classrooms)
2. **Do we offer a free tier for edu?** (Risk of never converting)
3. **Should home educators use consumer or edu?** (Hybrid needs?)

### Technical

1. **Do we need offline mode for schools with poor wifi?**
2. **Should class codes expire?** (Security vs convenience)
3. **How do we handle students moving between classrooms?**

### Business

1. **Do we pursue school district deals?** (Longer sales cycle, bigger contracts)
2. **Should we get on G-Cloud?** (UK government procurement)
3. **Is there a reseller/partner opportunity?**

---

## Appendix A: Competitive Landscape (Edu)

| Competitor | Focus | Price | Strengths | Weaknesses |
|------------|-------|-------|-----------|------------|
| Canva for Education | General design | Free | Brand recognition, features | Not coloring-focused |
| Twinkl | Worksheets | £40-90/year | Massive library | Static, no AI |
| ABCya | Games | Free/ads | Fun | Ad-supported, not creation |
| Coloring.com | Coloring | Free | Simple | No AI, limited |

**Our Differentiation**: AI-powered custom generation + rich digital coloring + print workflow

---

## Appendix B: Sample User Stories

### Teacher Onboarding

```
As a Year 2 teacher,
I want to set up my classroom in under 5 minutes,
So that I can start using Chunky Crayon in my next art lesson.

Acceptance Criteria:
- Can create account with email
- Can create classroom with name
- Can bulk add student names (paste from spreadsheet)
- Get class code to share with students
- See onboarding video / quick start guide
```

### Classroom Session

```
As a nursery teacher,
I want to start a coloring session for my whole class,
So that children can color the same themed image together.

Acceptance Criteria:
- Select/create a prompt (e.g., "autumn leaves")
- Generate coloring page
- Display class code on projector
- Children join on tablets using class code
- Children select their name
- Children color the image
- I can see live progress of who's coloring
- I can print all finished artworks at end
```

### End of Term Report

```
As a school administrator,
I want to see usage reports for all classrooms,
So that I can justify the subscription renewal.

Acceptance Criteria:
- View summary of artworks created per classroom
- See engagement metrics (sessions, time spent)
- Export report as PDF for governors
- Compare usage month-over-month
```

---

_Last updated: December 2024_
_Next review: After Phase 1 completion_
