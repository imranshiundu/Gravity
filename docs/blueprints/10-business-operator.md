# 10 — Gravity Business Operator Blueprint

Business Operator is where Gravity becomes commercially useful.

It turns Grav from a personal/coding assistant into an AI operator for real businesses.

## One-line definition

**Gravity Business Operator lets Grav handle business knowledge, customers, leads, bookings, quotes, follow-ups, reports, and owner workflows through controlled tools and memory.**

## Why Business Operator comes last

Business Mode depends on the earlier layers.

```text
Core       → controls everything
Ollama     → local brain
Memory     → customer/business context
Coding     → custom workflows and maintenance
Defense    → trust and hardening
Gateway    → service routing
UI         → owner dashboard
Channels   → customer/team surfaces
Voice      → receptionist/call flows
Business   → commercial product
```

## Where it should live

Gravity-owned service:

```text
services/business-service/
```

UI:

```text
apps/web/business/
```

Contracts:

```text
packages/grav-contracts/src/business.ts
```

## Where it fits

```text
Customer / Owner / Staff
          ↓
Channel / UI / Voice
          ↓
Gravity Core
          ↓
Business Operator
  ├─ business profile
  ├─ knowledge base
  ├─ customer memory
  ├─ lead capture
  ├─ booking workflow
  ├─ quote drafts
  ├─ follow-ups
  ├─ reports
  └─ escalation
```

## Target users

Start with businesses that have messy communication and missed opportunities.

Examples:

- garages
- tyre shops
- tour companies
- clinics
- schools
- consultants
- real estate agents
- repair businesses
- small ecommerce shops
- insurance brokers
- logistics operators

## Core promise

```text
Gravity helps a business answer customers, remember context, create follow-ups, draft quotes, book work, and show the owner what happened.
```

## Main features

### 1. Business profile

Stores business identity.

Fields:

- business name
- services
- working hours
- location
- contact channels
- policies
- pricing rules
- escalation rules
- owner preferences

### 2. Knowledge base

Business documents Grav can use.

Examples:

- services list
- FAQs
- price guides
- booking policies
- refund policies
- product catalog
- SOPs
- staff instructions

### 3. Customer memory

Grav remembers customer context.

Examples:

- previous requests
- vehicle/service history
- complaints
- preferences
- follow-up dates
- open issues

### 4. Lead capture

Grav collects structured lead data.

Example:

```json
{
  "name": "John",
  "phone": "+254...",
  "need": "tyre replacement",
  "urgency": "today",
  "source": "website chat"
}
```

### 5. Booking workflow

Grav helps schedule jobs.

Booking fields:

- customer
- service
- preferred time
- location
- notes
- urgency
- assigned staff
- status

### 6. Quote drafts

Grav drafts quotes but does not send or charge without approval.

Quote draft includes:

- customer need
- items/services
- assumptions
- price estimate
- validity period
- next step

### 7. Follow-ups

Grav creates follow-up tasks.

Examples:

- call customer tomorrow
- ask if service was completed
- follow up unpaid quote
- request review after job

### 8. Owner reports

Daily or weekly summaries.

Example:

```text
Today:
- 12 customer conversations
- 5 leads captured
- 3 quote drafts created
- 2 urgent cases escalated
- 4 follow-ups due tomorrow
```

### 9. Escalation

Grav knows when to involve a human.

Escalate when:

- customer is angry
- price is unclear
- legal/medical/financial risk exists
- booking conflict exists
- customer asks for human
- confidence is low

## Service structure

```text
services/business-service/
├─ src/
│  ├─ index.ts
│  ├─ profile.ts
│  ├─ knowledge-base.ts
│  ├─ customers.ts
│  ├─ leads.ts
│  ├─ bookings.ts
│  ├─ quotes.ts
│  ├─ followups.ts
│  ├─ reports.ts
│  ├─ escalation.ts
│  └─ policies.ts
└─ README.md
```

## Tool registry

```text
business.getProfile
business.searchKnowledgeBase
business.createLead
business.updateCustomer
business.createBookingDraft
business.createQuoteDraft
business.createFollowUp
business.generateOwnerReport
business.escalateToHuman
business.listOpenTasks
```

## Business UI

Dashboard sections:

- Overview
- Conversations
- Leads
- Customers
- Bookings
- Quotes
- Follow-ups
- Reports
- Knowledge Base
- Settings

## Channel/voice usage

Business Operator should work through:

- web chat
- owner dashboard
- Telegram/Slack for staff
- voice receptionist
- future WhatsApp/SMS where compliant

## Safety boundaries

Business Mode must protect customers and the owner.

Requires approval:

- sending external messages
- finalizing quotes
- changing prices
- deleting customers
- charging payments
- confirming bookings where conflict exists
- making legal/medical/financial claims

Disallowed:

- fake claims
- pretending to be human if configured otherwise
- leaking customer data
- inventing prices without policy
- making commitments the business did not approve

## First business MVP

Recommended first niche:

```text
garages / tyre shops / auto service businesses
```

Reason:

- real missed calls
- messy WhatsApp conversations
- quote requests
- booking needs
- repeat customers
- follow-up problems
- existing Pit Performante context

## Acceptance tests

Business Operator is working when:

- owner can define business profile,
- Grav can answer from the knowledge base,
- Grav can capture a lead,
- Grav can draft a quote,
- Grav can create a booking draft,
- Grav can create follow-up tasks,
- Grav can produce owner reports,
- sensitive actions require approval,
- customer history is remembered correctly.

## Final blueprint

```text
Business Operator = customer communication + business memory + structured workflows + owner visibility.
```
