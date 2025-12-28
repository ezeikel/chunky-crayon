# Chunky Crayon - Marketing Plan

_Created: December 28, 2025_
_Last Updated: December 28, 2025_

---

## Executive Summary

**Goal:** Reach £3,000-5,000 MRR within 12 months at current pricing (£7.99/month)

**Strategy:** Product-led growth + targeted acquisition focused on parents and educators

**Key Insight:** Chunky Crayon delivers more value than ColorBliss at comparable
pricing. The challenge is communicating that value and finding the right
customers.

---

## Current State

### Already Implemented

| Category           | Status | Notes                                    |
| ------------------ | ------ | ---------------------------------------- |
| Blog               | ✅     | Content marketing in progress            |
| Testimonials       | ✅     | On homepage                              |
| SEO Foundation     | ✅     | 90% complete (see SEO_PLAN.md)           |
| Social Sharing     | ✅     | On coloring pages                        |
| Shareable Galleries| ✅     | Users can share artwork                  |
| Free Gallery       | ✅     | 15+ categories, SEO goldmine             |
| Social Proof Stats | ✅     | Pages created counter                    |
| Schema/Structured Data | ✅ | Full JSON-LD implementation              |

### Competitive Advantage vs ColorBliss

| Feature            | Chunky Crayon | ColorBliss        |
| ------------------ | ------------- | ----------------- |
| Price              | £7.99/mo      | $7/mo (text only) |
| Voice Input        | ✅            | ❌                |
| Image Upload       | ✅            | ✅ ($12/mo tier)  |
| Digital Coloring   | ✅ Full       | ❌ Print only     |
| Stickers/Effects   | ✅            | ❌                |
| Magic Fill (AI)    | ✅            | ❌                |
| Achievements       | ✅            | ❌                |
| Kid-focused UX     | ✅ Colo       | ❌                |

---

## Marketing Channels

### Priority Matrix

| Channel              | Effort | Cost      | Impact | Timeline  | Priority |
| -------------------- | ------ | --------- | ------ | --------- | -------- |
| Pinterest            | Medium | Free      | High   | 2-4 weeks | 🔴 HIGH  |
| Influencer Marketing | Medium | £500-1k/mo| High   | 4-8 weeks | 🔴 HIGH  |
| Referral Program     | High   | Dev time  | High   | 2-3 weeks | 🔴 HIGH  |
| Community Building   | Medium | Free      | Medium | Ongoing   | 🟡 MED   |
| Email Marketing      | Low    | Free      | Medium | 1-2 weeks | 🟡 MED   |
| Paid Ads (Pinterest) | Low    | £300-500/mo| Medium| 2 weeks  | 🟡 MED   |
| Paid Ads (Facebook)  | Low    | £500-800/mo| Medium| 2 weeks  | 🟢 LOW   |
| PR/Press             | High   | Free      | Low    | 4-8 weeks | 🟢 LOW   |

---

## Phase 1: Foundation (Weeks 1-4)

### 1.1 Pinterest Strategy

**Why Pinterest:** Pinterest drives massive traffic for coloring pages. Users
actively search for printable content. Visual discovery matches product.

#### Progress Tracker

- [ ] Create Pinterest Business account
- [ ] Set up Rich Pins for coloring pages
- [ ] Create 5 initial boards:
  - [ ] "Kids Coloring Pages"
  - [ ] "Animal Coloring Pages"
  - [ ] "Educational Coloring Pages"
  - [ ] "Holiday Coloring Pages"
  - [ ] "AI-Generated Coloring Magic"
- [ ] Pin 10 gallery images per day for first month
- [ ] Create "How it Works" pin (video/carousel)
- [ ] Add Pinterest Save button to coloring pages
- [ ] Schedule pins using Tailwind or Later (optional)

#### Pinterest Content Strategy

**Pin Types:**
1. **Gallery Images** (80%) - Direct pins of coloring pages with SEO descriptions
2. **Before/After** (10%) - "Child's drawing → AI coloring page"
3. **Tips & Inspiration** (10%) - "5 ways to use custom coloring pages"

**Pin Description Template:**
```
🎨 [Category] Coloring Page - Free to print!

Perfect for [age group]. Create your own custom coloring pages with AI at Chunky Crayon.

✨ Voice input - just describe what you want
🖍️ Color digitally or print
🌟 Stickers, effects & magic colors

#coloringpages #kidsactivities #printables #AIart #coloringbook
```

**Posting Schedule:**
- Daily: 10 pins minimum (mix of gallery + repins)
- Best times: 8-11pm, 2-4pm (when parents browse)
- Weekends: Higher volume (parents planning activities)

---

### 1.2 Referral Program

**Why Referrals:** Parents talk to other parents. Word of mouth is the most
trusted channel for kids' products. Low CAC, high LTV.

#### Progress Tracker

- [ ] Design referral mechanics:
  - [ ] Decide reward: credits vs free month vs both
  - [ ] Referee reward (new user): 50 bonus credits
  - [ ] Referrer reward (existing user): 50 credits per signup
- [ ] Database schema updates:
  - [ ] Add `referralCode` to User model
  - [ ] Add `referredBy` to User model
  - [ ] Create ReferralReward tracking table
- [ ] Generate unique referral codes per user
- [ ] Create referral landing page `/invite/[code]`
- [ ] Add "Invite Friends" section to dashboard
- [ ] Create shareable referral cards (image + link)
- [ ] Track referral conversions in PostHog
- [ ] Email notification when referral converts

#### Referral Mechanics (Recommended)

```
REFERRER (Existing User):
├── Gets unique link: chunkycrayon.com/invite/ABC123
├── Earns 50 credits when friend subscribes
├── Earns 25 credits when friend signs up (free)
└── Unlimited referrals

REFEREE (New User):
├── Gets 50 bonus credits on signup (vs normal 15)
├── Gets 10% off first month
└── Sees "Invited by [Name]" on signup
```

#### Referral Promotion Ideas

- Add to post-purchase email: "Share the magic with friends"
- Dashboard prompt after 5th coloring page saved
- "Invite a friend" modal after achievement unlocked
- Social share buttons with referral link baked in

---

### 1.3 Email Marketing Setup

**Why Email:** Owned channel, high ROI, retention driver. Parents need reminders.

#### Progress Tracker

- [ ] Set up email provider (Resend recommended - already may have)
- [ ] Create email templates:
  - [ ] Welcome series (3 emails over 7 days)
  - [ ] Weekly digest (new gallery images)
  - [ ] Re-engagement (inactive 14+ days)
  - [ ] Referral prompt (after 10 pages colored)
- [ ] Build email preference center
- [ ] Segment users: free vs paid, active vs inactive
- [ ] A/B test subject lines

#### Welcome Email Series

**Email 1 (Immediate):** "Welcome to Chunky Crayon!"
- Quick start guide
- Link to first coloring page
- Introduce Colo mascot

**Email 2 (Day 2):** "Did you know you can use your voice?"
- Voice input feature highlight
- Video/GIF demo
- "Try it: Say 'a dragon wearing a birthday hat'"

**Email 3 (Day 5):** "Your child can earn stickers!"
- Explain achievement system
- Show sticker album preview
- "Complete 3 more pages to unlock..."

---

## Phase 2: Growth (Weeks 4-12)

### 2.1 Influencer Marketing

**Why Influencers:** Parents trust other parents. Micro-influencers have high
engagement. Kids' content performs well on social.

#### Progress Tracker

- [ ] Research phase:
  - [ ] Identify 20 potential micro-influencers (5K-50K followers)
  - [ ] Create tracking spreadsheet
  - [ ] Categorize: Parenting, Homeschool, Teacher, Craft
- [ ] Outreach templates created
- [ ] Partnership offer defined
- [ ] First 5 influencers contacted
- [ ] First collaboration live
- [ ] Track: referral codes, conversions, content performance

#### Influencer Categories

| Category     | Platform      | Example Search Terms                    |
| ------------ | ------------- | --------------------------------------- |
| Parenting    | Instagram, YT | "mom blogger", "parenting tips"         |
| Homeschool   | Instagram, FB | "homeschool mom", "unschooling"         |
| Teachers     | TikTok, IG    | "teacher life", "classroom activities"  |
| Craft/DIY    | Pinterest, YT | "kids crafts", "art activities"         |
| ADHD/Special | Instagram     | "ADHD parenting", "sensory activities"  |

#### Influencer Outreach Template

```
Subject: Coloring pages your followers will love 🎨

Hi [Name],

I love your content about [specific post/topic]. As a parent myself, I especially
connected with [specific thing they said].

I'm reaching out because I created Chunky Crayon - an AI-powered coloring page
generator where kids can describe what they want (even by voice!) and get custom
pages instantly.

What makes it special for your audience:
- Voice input (perfect for kids who can't type yet)
- Digital coloring with stickers, glitter effects, magic colors
- Achievements and a cute mascot that grows with them
- Print or color on screen

I'd love to offer you a free 6-month subscription to try it with your [kids/students].
If you and your [kids/followers] enjoy it, maybe we could explore a collaboration?

No pressure at all - just thought it might be genuinely useful for your family.

Best,
[Your name]
```

#### Partnership Tiers

| Tier     | Offer                        | Expectation                    | Budget   |
| -------- | ---------------------------- | ------------------------------ | -------- |
| Seed     | 6-month free subscription    | Honest review if they like it  | £0       |
| Micro    | Free sub + £100-200          | 1 post/story, unique code      | £100-200 |
| Standard | Free sub + £300-500          | Video review, 2+ posts, code   | £300-500 |
| Premium  | Free sub + £500-1000         | Dedicated video, ongoing       | £500-1k  |

---

### 2.2 Community Building

**Why Community:** Creates belonging, drives retention, generates UGC, enables
word of mouth.

#### Progress Tracker

- [ ] Create Facebook Group: "Chunky Crayon Families"
- [ ] Set up group rules and welcome message
- [ ] Create weekly content calendar:
  - [ ] Monday: "What are you coloring this week?"
  - [ ] Wednesday: "Share your creations"
  - [ ] Friday: "Weekend coloring challenge"
- [ ] Invite existing users via email
- [ ] First 50 members milestone
- [ ] First 200 members milestone
- [ ] Enable user-to-user recommendations

#### Community Content Ideas

**Weekly Themes:**
- "Dinosaur Week" - Share dinosaur creations
- "Back to School" - Educational coloring pages
- "Family Favorites" - What your kids request most

**Engagement Tactics:**
- Photo contests with credit prizes
- "Coloring page of the week" feature
- Q&A sessions about product features
- Poll: "What theme should we add next?"

---

### 2.3 Paid Acquisition (Pinterest Ads)

**Why Pinterest Ads First:** Highest intent for coloring content. Lower CPM than
Facebook. Visual format matches product.

#### Progress Tracker

- [ ] Set up Pinterest Ads account
- [ ] Create conversion tracking pixel
- [ ] Design ad creatives (3-5 variations):
  - [ ] Before/after child drawing transformation
  - [ ] Voice input demo (video)
  - [ ] Sticker/effects showcase
- [ ] Define target audiences:
  - [ ] Interest: Coloring pages, kids activities, homeschool
  - [ ] Lookalike: Based on existing converters
- [ ] Set up campaigns:
  - [ ] Awareness: £100/mo
  - [ ] Consideration: £200/mo
  - [ ] Conversion: £200/mo
- [ ] Launch with £300/mo test budget
- [ ] Weekly optimization reviews
- [ ] Scale winners to £500/mo

#### Pinterest Ad Specs

**Creative Best Practices:**
- 2:3 aspect ratio (1000x1500px)
- Text overlay < 20% of image
- Bold, colorful imagery
- Clear CTA in description
- Video: 6-15 seconds, autoplay-friendly

**Target Audiences:**
```
Audience 1: Parents of Young Kids
├── Interests: Parenting, Kids Activities, Preschool
├── Age: 25-45
└── Gender: All (skews female)

Audience 2: Educators
├── Interests: Teaching, Homeschool, Classroom
├── Age: 25-55
└── Keywords: "coloring pages", "printables"

Audience 3: DIY/Craft Parents
├── Interests: Arts & Crafts, DIY, Pinterest itself
├── Engaged Shoppers: Yes
└── Keywords: "kids crafts", "rainy day activities"
```

---

## Phase 3: Scale (Months 3-6)

### 3.1 Facebook/Instagram Ads

**Why Later:** Higher CPM, needs more creative testing, better after proving
Pinterest ROI.

#### Progress Tracker

- [ ] Create Meta Ads account
- [ ] Install Facebook Pixel
- [ ] Build custom audiences:
  - [ ] Website visitors (retargeting)
  - [ ] Lookalike from subscribers
  - [ ] Engaged parents interest
- [ ] Design ad creatives (video-first):
  - [ ] Kid using voice input (reaction video style)
  - [ ] Parent testimonial
  - [ ] Feature showcase carousel
- [ ] Start with £500/mo budget
- [ ] Test campaign objectives:
  - [ ] Conversions vs Traffic vs Engagement
- [ ] Scale winners

#### Facebook Ad Copy Templates

**Testimonial Style:**
```
"My 5-year-old couldn't believe it. She said 'a unicorn eating pizza'
and it actually made it!" 🦄🍕

Chunky Crayon turns your child's imagination into coloring pages.

✨ Voice input - just describe what you want
🖍️ Color digitally with stickers & effects
🌟 Achievements to keep them engaged

Try free →
```

**Problem/Solution Style:**
```
Tired of the same coloring books?

Let your kids create their OWN coloring pages.

Just say what you want → AI makes it → Color or print!

"A dinosaur riding a skateboard" ✅
"My cat as a superhero" ✅
"A castle with dragons" ✅

Start free →
```

---

### 3.2 Content Marketing Expansion

**Why:** Compounds over time, SEO traffic, establishes authority.

#### Progress Tracker

- [ ] Publish 2 blog posts per week:
  - [ ] Week 1: "7 Benefits of Coloring for Child Development"
  - [ ] Week 2: "How to Keep Kids Entertained on Rainy Days"
  - [ ] Week 3: "Screen Time That's Actually Creative"
  - [ ] Week 4: "Why Voice Input is Perfect for Young Kids"
- [ ] Guest post outreach (5 per month):
  - [ ] Parenting blogs
  - [ ] Homeschool sites
  - [ ] Education publications
- [ ] Create downloadable resources:
  - [ ] "50 Coloring Prompts for Kids" PDF
  - [ ] "Coloring Benefits for ADHD" guide
- [ ] YouTube channel consideration

#### Blog Content Calendar Template

| Week | Topic                               | Keywords                        | Type     |
| ---- | ----------------------------------- | ------------------------------- | -------- |
| 1    | Benefits of coloring for kids       | coloring benefits, child dev    | SEO      |
| 2    | Voice input for preschoolers        | voice apps for kids, AI kids    | Feature  |
| 3    | Rainy day activities                | indoor activities, kids bored   | Seasonal |
| 4    | Custom coloring vs coloring books   | coloring books alternative      | Comparison|

---

## Metrics & Goals

### North Star Metrics

| Metric               | Current | 3 Month | 6 Month | 12 Month |
| -------------------- | ------- | ------- | ------- | -------- |
| MRR                  | £0      | £400-700| £1,200-2,000 | £3,000-5,000 |
| Active Subscribers   | 0       | 50-90   | 150-250 | 400-650  |
| Monthly Traffic      | ?       | 15,000  | 30,000  | 60,000   |
| Free → Paid Rate     | ?       | 1.5%    | 2.5%    | 3%       |
| Churn Rate           | ?       | <10%    | <8%     | <6%      |

### Channel-Specific Metrics

| Channel     | Metric                  | Goal (Monthly)       |
| ----------- | ----------------------- | -------------------- |
| Pinterest   | Impressions             | 100K+ by month 3     |
| Pinterest   | Saves                   | 1K+                  |
| Pinterest   | Click-through rate      | 2%+                  |
| Referrals   | New referral signups    | 50+ by month 3       |
| Referrals   | Referral conversion     | 20%+                 |
| Influencers | Collaborations/month    | 5-10                 |
| Influencers | Referral code usage     | 100+ signups         |
| Email       | Open rate               | 30%+                 |
| Email       | Click rate              | 5%+                  |
| Community   | Group members           | 500+ by month 6      |

---

## Budget Allocation

### Monthly Marketing Budget Phases

| Phase        | Month  | Pinterest | Influencers | FB/IG | Other | Total    |
| ------------ | ------ | --------- | ----------- | ----- | ----- | -------- |
| Foundation   | 1-2    | £0        | £200        | £0    | £0    | £200     |
| Growth       | 3-4    | £300      | £500        | £0    | £100  | £900     |
| Scale        | 5-6    | £400      | £600        | £300  | £100  | £1,400   |
| Optimize     | 7-12   | £500      | £500        | £500  | £100  | £1,600   |

### Expected ROI

**Assumptions:**
- LTV: £40-60 (5-8 month average retention at £7.99/mo)
- Target CAC: £15-25
- Break-even: 2-3 months per customer

**At £1,500/mo spend:**
- If CAC = £20, acquire 75 customers/month
- MRR add: 75 × £7.99 = £599/month
- Cumulative MRR after 6 months: ~£3,000 (accounting for churn)

---

## Quick Wins Checklist

### This Week

- [ ] Create Pinterest Business account
- [ ] Pin 10 gallery images with optimized descriptions
- [ ] Draft referral program spec
- [ ] Send 3 influencer outreach emails

### This Month

- [ ] 100+ pins on Pinterest
- [ ] Referral program live
- [ ] 5 influencer partnerships initiated
- [ ] Email welcome series live
- [ ] Facebook Group created with 25+ members

---

## Notes & Resources

### Tools

- **Pinterest:** Tailwind for scheduling, Pinterest Analytics
- **Email:** Resend, Loops, or ConvertKit
- **Influencer:** Upfluence, manual outreach, Notion tracker
- **Analytics:** PostHog (already have), Google Analytics
- **Community:** Facebook Groups, Discord (optional)

### Competitor Monitoring

- ColorBliss.com - Main competitor
- Coloring.com - Established player
- Crayola.com - Brand awareness benchmark

---

## Progress Log

### December 2025

- [x] SEO foundation complete (90%)
- [x] Blog started
- [x] Testimonials on homepage
- [x] Social sharing buttons
- [x] Shareable galleries
- [ ] Pinterest strategy started
- [ ] Referral program designed
- [ ] Influencer outreach begun

### January 2026

_(upcoming)_

---

_This document should be updated weekly as progress is made._
