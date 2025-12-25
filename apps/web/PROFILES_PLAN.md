# Chunky Crayon - Profiles & Difficulty System Plan

## Executive Summary

This document outlines the implementation of a multi-profile system allowing
parents to create profiles for multiple children, each with personalized
age/difficulty settings. This architecture also serves as the foundation for
future B2B/Education features (edu.chunkycrayon.com).

---

## Core Features

### 1. Multi-Profile System

- Parents create profiles for each child under their account
- Each profile has name, avatar, age group, and default difficulty
- Credits remain at **account level** (shared pool across all profiles)
- Profile switcher UI inspired by Netflix/kids apps

### 2. Difficulty-Driven Image Generation

- Current prompts become the BEGINNER baseline
- New prompt variations for INTERMEDIATE, ADVANCED, EXPERT
- Profile's difficulty setting feeds into AI generation
- Settings page allows difficulty slider to override default

### 3. Age Groups (mapped to difficulty)

| Age Group | Label   | Ages  | Default Difficulty |
| --------- | ------- | ----- | ------------------ |
| TODDLER   | Toddler | 2-4   | BEGINNER           |
| CHILD     | Child   | 5-8   | BEGINNER           |
| TWEEN     | Tween   | 9-12  | INTERMEDIATE       |
| TEEN      | Teen    | 13-17 | ADVANCED           |
| ADULT     | Adult   | 18+   | User Choice        |

---

## Phase 1: Database Models & API ✅ COMPLETED

### 1.1 New Prisma Models ✅

```prisma
enum AgeGroup {
  TODDLER   // 2-4 years
  CHILD     // 5-8 years
  TWEEN     // 9-12 years
  TEEN      // 13-17 years
  ADULT     // 18+
}

model Profile {
  id              String      @id @default(cuid())
  userId          String
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String      // "Emma", "Jack", etc.
  avatarId        String      @default("default") // References avatar SVG
  ageGroup        AgeGroup    @default(CHILD)
  difficulty      Difficulty  @default(BEGINNER) // Can be overridden in settings
  isDefault       Boolean     @default(false) // First profile is default
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  coloringImages  ColoringImage[]

  @@map("profiles")
}
```

### 1.2 Update Existing Models ✅

```prisma
model User {
  // ... existing fields
  activeProfileId String?     // Currently selected profile
  profiles        Profile[]
}

model ColoringImage {
  // ... existing fields
  profileId       String?
  profile         Profile?    @relation(fields: [profileId], references: [id])
}
```

### 1.3 API Routes ✅

> **Implementation Note:** Used Server Actions instead of API routes for cleaner
> Next.js 15 integration.

| Route                         | Method | Description                |
| ----------------------------- | ------ | -------------------------- |
| `/api/profiles`               | GET    | List all profiles for user |
| `/api/profiles`               | POST   | Create new profile         |
| `/api/profiles/[id]`          | GET    | Get profile details        |
| `/api/profiles/[id]`          | PATCH  | Update profile             |
| `/api/profiles/[id]`          | DELETE | Delete profile             |
| `/api/profiles/[id]/activate` | POST   | Set as active profile      |

### 1.4 Server Actions ✅

> **Implemented in:** `apps/web/app/actions/profiles.ts`

```typescript
// actions/profiles.ts
'use server';

export async function createProfile(data: CreateProfileInput);
export async function updateProfile(id: string, data: UpdateProfileInput);
export async function deleteProfile(id: string);
export async function setActiveProfile(profileId: string);
export async function getProfiles();
export async function getActiveProfile();
```

---

## Phase 2: Profile Switcher UI ✅ COMPLETED

### 2.1 Profile Selection Screen ✅

> **Implemented in:** `components/ProfileSwitcher/ProfileSwitcher.tsx`

Full-screen takeover (Netflix-style) shown when:

- User first logs in and has multiple profiles
- User clicks "Switch Profile" in header/settings
- User creates a new profile

**UI Components (all implemented):**

- `ProfileSwitcher` - Full-screen profile selection →
  `components/ProfileSwitcher/ProfileSwitcher.tsx`
- `ProfileCard` - Individual profile avatar + name →
  `components/ProfileCard/ProfileCard.tsx`
- `AddProfileCard` - Card to create new profile →
  `components/AddProfileCard/AddProfileCard.tsx`
- `ProfileAvatar` - Avatar component with colored crayons →
  `components/ProfileAvatar/ProfileAvatar.tsx`

### 2.2 Avatar System ✅

> **Implemented in:** `lib/avatars.ts`

**Placeholder Implementation:**

```typescript
// lib/avatars.ts
export const AVATARS = [
  { id: 'crayon-red', name: 'Red Crayon', color: '#FF6B6B' },
  { id: 'crayon-orange', name: 'Orange Crayon', color: '#FF9F43' },
  { id: 'crayon-yellow', name: 'Yellow Crayon', color: '#FECA57' },
  { id: 'crayon-green', name: 'Green Crayon', color: '#1DD1A1' },
  { id: 'crayon-blue', name: 'Blue Crayon', color: '#54A0FF' },
  { id: 'crayon-purple', name: 'Purple Crayon', color: '#A29BFE' },
  { id: 'crayon-pink', name: 'Pink Crayon', color: '#FF85A2' },
  { id: 'crayon-brown', name: 'Brown Crayon', color: '#C8A879' },
  // Placeholder slots for custom avatars
  { id: 'avatar-01', name: 'Character 1', placeholder: true },
  { id: 'avatar-02', name: 'Character 2', placeholder: true },
  // ... up to 10+ custom avatars
] as const;
```

**Avatar Component:**

```tsx
// components/ProfileAvatar/ProfileAvatar.tsx
const ProfileAvatar = ({ avatarId, size = 'md' }: Props) => {
  const avatar = AVATARS.find((a) => a.id === avatarId);

  if (avatar?.placeholder) {
    // Render placeholder circle with initials
    return <PlaceholderAvatar />;
  }

  // Render actual SVG avatar
  return <AvatarSVG id={avatarId} size={size} />;
};
```

### 2.3 Create Profile Flow ✅

> **Implemented in:** `components/CreateProfileModal/CreateProfileModal.tsx`

1. Click "Add Profile" card
2. Modal/sheet opens with:
   - Name input
   - Age group selector (visual, kid-friendly with emoji buttons)
   - Avatar picker grid
   - Difficulty shows as read-only (based on age group)
3. "Create Profile" button
4. Redirect to new profile

### 2.4 Header Profile Indicator ✅

> **Implemented in:** `components/ProfileIndicator/ProfileIndicator.tsx` and
> `components/Header/HeaderProfileIndicator.tsx`

Small avatar in header showing active profile with dropdown:

- Current profile (highlighted)
- Other profiles (quick switch)
- "Manage Profiles" link (with parental gate)
- "Add Profile" option

**Additional Components Created:**

- `ProfileContext` → `contexts/ProfileContext.tsx` - React context for profile
  state
- `ProfileUI` → `components/ProfileUI/ProfileUI.tsx` - Wrapper for profile
  modals

---

## Phase 3: Difficulty-Driven Prompt Generation ✅ COMPLETED

### 3.1 Prompt Strategy

Keep the current prompt style/format but adjust complexity parameters:

**BEGINNER (Toddler/Child - Current Prompt):**

- Target: Ages 2-8
- Large, simple shapes
- Very thick outlines
- Minimal detail
- Big fill areas
- No background complexity
- Friendly, non-scary characters

**INTERMEDIATE (Tween):**

- Target: Ages 9-12
- Medium-sized shapes
- Thick outlines (slightly thinner than beginner)
- Moderate detail in main subject
- Some background elements
- More varied characters/scenes

**ADVANCED (Teen):**

- Target: Ages 13-17
- Varied shape sizes
- Medium line thickness
- Good amount of detail
- Interesting backgrounds
- Can include patterns in clothing/objects
- More dynamic poses

**EXPERT (Adult):**

- Target: Ages 18+
- Fine details allowed
- Standard line thickness
- Intricate patterns welcome
- Complex backgrounds
- Mandala-style elements allowed
- Can include more sophisticated themes

### 3.2 Prompt Implementation

```typescript
// lib/ai/prompts.ts

export const DIFFICULTY_MODIFIERS: Record<Difficulty, DifficultyConfig> = {
  BEGINNER: {
    targetAge: '2-8 years old',
    shapeSize: 'extra large, simple',
    lineThickness: 'very thick (4-5px equivalent)',
    detailLevel: 'minimal - only essential features',
    background: 'simple or none',
    complexity: 'very low - big areas easy for small hands to color',
    additionalRules: [
      'All shapes should be large enough for toddler crayons',
      'No small details or fine lines anywhere',
      'Maximum of 5-7 distinct colorable areas',
      'Characters should be cute and non-threatening',
    ],
  },
  INTERMEDIATE: {
    targetAge: '9-12 years old',
    shapeSize: 'medium to large',
    lineThickness: 'thick (3-4px equivalent)',
    detailLevel: 'moderate - include interesting features',
    background: 'simple scene elements allowed',
    complexity: 'medium - more areas to color, some smaller sections',
    additionalRules: [
      'Can include more character details (clothing patterns, accessories)',
      'Background can have 2-3 simple elements',
      'Around 10-15 distinct colorable areas',
      'Can include more dynamic poses',
    ],
  },
  ADVANCED: {
    targetAge: '13-17 years old',
    shapeSize: 'varied sizes',
    lineThickness: 'medium (2-3px equivalent)',
    detailLevel: 'detailed - include textures and patterns',
    background: 'full scene with multiple elements',
    complexity: 'higher - many areas, varied sizes',
    additionalRules: [
      'Can include pattern details in clothing, objects',
      'Hair and fur can have more texture lines',
      'Background can be a full scene',
      '20-30 distinct colorable areas',
      'Can include more sophisticated poses and expressions',
    ],
  },
  EXPERT: {
    targetAge: '18+ years old',
    shapeSize: 'all sizes including fine details',
    lineThickness: 'varied (1-3px equivalent)',
    detailLevel: 'intricate - rich in detail and patterns',
    background: 'complex, detailed scenes',
    complexity: 'high - intricate areas suitable for adult colorists',
    additionalRules: [
      'Mandala-style patterns welcome',
      'Intricate details encouraged',
      'Complex backgrounds with many elements',
      '40+ distinct colorable areas',
      'Can include zentangle-style patterns',
      'Fine details and small sections allowed',
    ],
  },
};

export const createDifficultyAwarePrompt = (
  description: string,
  difficulty: Difficulty = 'BEGINNER',
) => {
  const config = DIFFICULTY_MODIFIERS[difficulty];

  return `${description}

DIFFICULTY LEVEL: ${difficulty}
Target audience: ${config.targetAge}

Complexity requirements for this difficulty:
- Shape sizes: ${config.shapeSize}
- Line thickness: ${config.lineThickness}
- Detail level: ${config.detailLevel}
- Background: ${config.background}
- Overall complexity: ${config.complexity}

${config.additionalRules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

${COLORING_IMAGE_DETAILED_SUFFIX}`;
};
```

### 3.3 Generation Flow Update

```typescript
// Updated generation flow
export async function generateColoringImage(
  description: string,
  profileId?: string,
) {
  // Get active profile's difficulty
  const profile = profileId
    ? await getProfile(profileId)
    : await getActiveProfile();

  const difficulty = profile?.difficulty ?? 'BEGINNER';

  // Generate with difficulty-aware prompt
  const prompt = createDifficultyAwarePrompt(description, difficulty);

  // ... rest of generation

  // Save with profile reference
  await saveColoringImage({
    // ... image data
    difficulty,
    profileId: profile?.id,
  });
}
```

---

## Phase 4: Settings & Account Management ✅ COMPLETED

### 4.1 Profile Settings Page ✅

> **Implemented in:** `app/account/profiles/[id]/page.tsx`

Route: `/account/profiles/[id]`

**Settings per profile (all implemented):**

- Profile name
- Avatar selection (visual picker with colored crayons)
- Age group (visual buttons with emoji)
- Difficulty override slider
  - "Use age-appropriate (recommended)" toggle
  - Manual button selector: BEGINNER → INTERMEDIATE → ADVANCED → EXPERT
- Delete profile (with confirmation dialog)

### 4.2 Difficulty Slider Component ✅

> **Implemented in:** `components/DifficultySlider/DifficultySlider.tsx`

```tsx
// components/DifficultySlider/DifficultySlider.tsx
type DifficultySliderProps = {
  value: Difficulty;
  onChange: (difficulty: Difficulty) => void;
  ageGroup: AgeGroup;
  useRecommended: boolean;
  onUseRecommendedChange: (value: boolean) => void;
  disabled?: boolean;
};

const DifficultySlider = ({
  value,
  onChange,
  ageGroup,
  useRecommended,
  onUseRecommendedChange,
  disabled = false,
}: DifficultySliderProps) => {
  // Shows toggle for "Use age-appropriate difficulty"
  // When disabled, shows visual button selector for 4 difficulty levels
  // Includes description panel for selected difficulty
};
```

### 4.3 Profile Edit Form ✅

> **Implemented in:** `app/account/profiles/[id]/ProfileEditForm.tsx`

- Full profile editing form with all fields
- Change tracking (Save button disabled when no changes)
- Delete confirmation with profile preview
- Integrated DifficultySlider component

### 4.4 ProfilesManager Edit Button ✅

> **Updated in:** `app/account/profiles/ProfilesManager.tsx`

- Added edit button (pencil icon) on hover for each profile card
- Links to `/account/profiles/[id]` for editing
- Positioned in top-left corner (delete button in top-right)

---

## Phase 5: Future - B2B / Education (edu.chunkycrayon.com)

> **Note:** This phase is documented for future reference. Not implementing now.

### 5.1 Organization Model

```prisma
model Organization {
  id              String          @id @default(cuid())
  name            String          // "Sunshine Nursery"
  slug            String          @unique // "sunshine-nursery"
  type            OrganizationType
  plan            OrganizationPlan
  creditPool      Int             @default(0)
  maxProfiles     Int             @default(30) // per class/group
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  memberships     OrgMembership[]
  groups          OrgGroup[]

  @@map("organizations")
}

enum OrganizationType {
  NURSERY
  PRESCHOOL
  PRIMARY_SCHOOL
  SECONDARY_SCHOOL
  LIBRARY
  AFTER_SCHOOL
  OTHER
}

enum OrganizationPlan {
  STARTER     // Up to 30 profiles
  GROWTH      // Up to 100 profiles
  ENTERPRISE  // Unlimited
}

model OrgMembership {
  id              String          @id @default(cuid())
  organizationId  String
  organization    Organization    @relation(fields: [organizationId], references: [id])
  userId          String
  user            User            @relation(fields: [userId], references: [id])
  role            OrgRole
  createdAt       DateTime        @default(now())

  @@unique([organizationId, userId])
  @@map("org_memberships")
}

enum OrgRole {
  OWNER       // Full admin
  ADMIN       // Manage profiles, view usage
  TEACHER     // Create profiles for their class
  VIEWER      // View only
}

model OrgGroup {
  id              String          @id @default(cuid())
  organizationId  String
  organization    Organization    @relation(fields: [organizationId], references: [id])
  name            String          // "Year 2", "Butterfly Room"
  ageGroup        AgeGroup
  createdAt       DateTime        @default(now())

  profiles        Profile[]

  @@map("org_groups")
}
```

### 5.2 Education Features

**For Teachers:**

- Create student profiles in bulk (CSV import)
- Assign profiles to classes/groups
- View class-wide coloring activity
- Generate themed pages for entire class
- Print queue for multiple pages

**For Admins:**

- Organization dashboard
- Credit allocation per class/teacher
- Usage reports and analytics
- Manage teacher accounts
- Billing management

**For Students:**

- Simple profile switcher (photo/avatar only)
- No account management
- Teacher-controlled settings

### 5.3 URL Structure

```
edu.chunkycrayon.com/
├── /dashboard              # Admin/Teacher dashboard
├── /classes                # Class management
├── /classes/[id]           # Individual class
├── /classes/[id]/profiles  # Profiles in class
├── /reports                # Usage reports
├── /settings               # Org settings
└── /billing                # Billing management
```

### 5.4 Pricing Considerations

| Plan       | Profiles  | Credits/month | Features                   |
| ---------- | --------- | ------------- | -------------------------- |
| Starter    | 30        | 500           | 1 admin, basic reporting   |
| Growth     | 100       | 2000          | 5 admins, CSV import       |
| Enterprise | Unlimited | Custom        | SSO, API, priority support |

---

## Implementation Order

### Now (Consumer Profiles)

1. **Phase 1: Database** (1-2 days)
   - Add Profile model and AgeGroup enum
   - Update User and ColoringImage models
   - Create migration
   - Generate Prisma client

2. **Phase 2: Profile UI** (2-3 days)
   - Profile switcher component
   - Avatar system (placeholders)
   - Create/edit profile flow
   - Header profile indicator

3. **Phase 3: Difficulty Prompts** (1-2 days)
   - Create difficulty modifiers
   - Update generation flow
   - Test each difficulty level
   - Verify image quality per level

4. **Phase 4: Settings** (1-2 days)
   - Profile settings page
   - Difficulty slider component
   - Account overview updates

### Future (Education/B2B)

5. **Phase 5: Organization Models** (TBD)
6. **Phase 6: Teacher Dashboard** (TBD)
7. **Phase 7: Admin Features** (TBD)
8. **Phase 8: Billing Integration** (TBD)

---

## Technical Considerations

### Profile Context

```typescript
// lib/profile-context.tsx
'use client';

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

  // Load active profile on mount
  // Provide switch function
  // Store in localStorage for persistence

  return (
    <ProfileContext.Provider value={{ activeProfile, switchProfile, profiles }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
```

### Cookie/Session Storage

Store active profile ID in:

- HTTP-only cookie (for server components)
- localStorage (for client persistence)

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const activeProfileId = request.cookies.get('activeProfileId');
  // Make available to server components
}
```

### Credit Sharing

Credits remain on User model (account level):

- All profiles share the same credit pool
- Generation deducts from user credits regardless of profile
- Credit transactions can optionally reference which profile used them

---

## Success Metrics

- Profile creation completion rate
- Profiles per account (target: 1.5-2 avg for families)
- Profile switch frequency
- Difficulty distribution across generations
- User retention after profile creation

---

## Open Questions

1. **Max profiles per account?** Suggest 6 (like Netflix)
2. **Can profiles be renamed?** Yes
3. **Can profiles share "favorites"?** Per-profile or account-level?
4. **Profile deletion - what happens to images?** Keep but unlink

---

## Design References

- Netflix profile switcher
- Disney+ kids profiles
- YouTube Kids profile selection
- PBS Kids app

---

_Created: December 25, 2024_ _Status: Phases 1-4 Complete_

---

## Implementation Progress

| Phase                       | Status      | Notes                                                                            |
| --------------------------- | ----------- | -------------------------------------------------------------------------------- |
| Phase 1: Database & API     | ✅ Complete | Prisma models, server actions in `app/actions/profiles.ts`                       |
| Phase 2: Profile UI         | ✅ Complete | All components created, Header integration done                                  |
| Phase 3: Difficulty Prompts | ✅ Complete | DIFFICULTY_MODIFIERS, createDifficultyAwarePrompt, generation flow updated       |
| Phase 4: Settings           | ✅ Complete | DifficultySlider, Profile edit page at `/account/profiles/[id]`, ProfileEditForm |
| Phase 5: B2B/Education      | 📋 Future   | Not planned for now                                                              |
