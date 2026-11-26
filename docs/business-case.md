# Business case

## The problem, in numbers (every figure sourced)

| Figure | Source |
|---|---|
| **43%** of US adults have received a medical or dental bill they thought contained an error. About two-thirds of those errors were charges insurance should have covered | [KFF Health Care Debt Survey (2022), via KFF](https://www.kff.org/policy-watch/could-consumer-assistance-be-helpful-to-people-facing-medical-debt/) |
| **45%** of insured working-age adults got a bill or copay in the past year for something they thought insurance should have paid. **Fewer than half** challenged it, mostly because they didn't know they could | [Commonwealth Fund, Aug 2024](https://commonwealthfund.org/sites/default/files/2024-07/Gupta_unforeseen_bills_coverage_denials_PR_2024-08-01.pdf) |
| **38%** of people who disputed got the bill reduced or eliminated (61% among Medicare enrollees) | same |
| About **1%** of denied in-network claims on HealthCare.gov were appealed in 2023, while insurers denied **20%** of in-network claims | [KFF, ACA Marketplace claims denials and appeals, 2023](https://www.kff.org/private-insurance/claims-denials-and-appeals-in-aca-marketplace-plans-in-2023/) |
| At least **$220 billion** in US medical debt; ~14 million adults owe over $1,000 | [KFF, The Burden of Medical Debt, 2024](https://www.kff.org/health-costs/the-burden-of-medical-debt-in-the-united-states/) |
| Among people who didn't contact the billing office about a problem bill, **86%** said it wouldn't make a difference | JAMA Health Forum (USC), Aug 2024, as reported by [Drugs.com/HealthDay](https://www.drugs.com/news/common-medical-billing-errors-keep-many-americans-care-report-120561.html) |

**The gap:** people believe the bill is wrong, disputing works often enough to matter, and almost nobody disputes. What blocks them is the work itself: reading codes, knowing the rules, writing the letter. That's what language models are good at. Yet the obvious way to get that help, pasting the bill into a chatbot, means handing over the most sensitive document a person owns.

## The user

**Maya, 34, Columbus, Ohio** (a composite persona). ER visit for a sprained wrist. The hospital bills $1,284.00 after insurance. The itemised bill shows the same X-ray twice and a "level 5" ER visit code for a 40-minute visit. She suspects it's wrong. She has used ChatGPT, but won't upload a document with her date of birth, member ID and diagnosis. Today she pays.

**With Airlock:** 4 minutes. The device reads the bill; she watches her name and member ID turn into tokens. The audit flags the duplicate X-ray (`$212.00`) and questions the level-5 code. The letter cites the line numbers, comes back with her details filled in on her own laptop, and she prints it.

## Who else

| Segment | Why Airlock fits |
|---|---|
| Caregivers managing a parent's bills | Handling *someone else's* records raises the stakes on privacy |
| Patient advocates, nonprofit billing counsellors, hospital financial-aid navigators | Professionally bound to confidentiality; can't paste client records into consumer AI |
| Employers' benefits teams (HR) | Want to help employees fight bills without ever seeing their medical data |
| India: families facing cashless-claim (TPA) rejections and itemised hospital bills | Same structure: a code-heavy document, a rejection reason, a letter to write, and acute privacy concerns |

## Why hybrid is the business model, not a cost trick

- **The private half is free.** Reading and sealing run on the user's hardware at no cost to us.
- **The cloud half is small.** Only anonymous line items cross (a few KB of JSON), so a cloud audit costs a fraction of a cent on Gemini Flash-class pricing.
- **Trust is the moat.** "Your name never leaves this laptop" is a claim a cloud-only competitor can't make.

## Paths after the hackathon

1. **Free consumer app** (now): Chrome desktop, then Android (Gemini Nano) and iOS (Apple Foundation Models), all through the same Firebase AI Logic SDK.
2. **Advocate workspace:** case list, deadlines, letter templates per insurer. Still nothing identifying leaves the advocate's device.
3. **Benefits partnership:** employers or unions sponsor it. The outcome counters (`disputed / won / lost` per finding type) become the evidence base.

## What success looks like at 90 days

- 1,000 bills audited
- 25% of users reach "letter printed"
- 100 reported outcomes, with the win rate per finding type published openly
