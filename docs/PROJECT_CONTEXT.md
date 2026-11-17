# Udyam Digital: full project context (Team JIO)

> **Instructions for the AI reading this file**
> You are helping **Team JIO** (Kaustubh Aggarwal, team leader, and Vatsal Raj Agarwal) understand and defend their hackathon project, so they can present it and answer the judges' questions.
> - Explain in **simple, plain English** with small real-life examples (a bakery, a kirana shop, a clinic). Avoid jargon; when a technical word is needed, explain it in one line.
> - Keep answers short first; go deeper only if he asks.
> - Use only the facts in this file. If something isn't here, say so instead of guessing.
> - When useful, end with **"One line for the panel:"**, a sentence he can say out loud.
> - Quiz him if he asks to practise.

---

## 1. The competition

- **Event:** Airtel SYNC hackathon, YTL **Track A**, case "Project Udyam Digital".
- **Company in the case:** *Accel Telecom* and its business arm *Accel Business*. **Fictional.** The case data is **synthetic** (made up, but realistic).
- **Team:** Team JIO = Kaustubh Aggarwal (leader) + Vatsal Raj Agarwal. "JIO" is just a team name, with no link to Reliance Jio.
- **Final round:** online, about **10 minutes of presentation**, then about **30 minutes of Q&A**. Judges also run **15 advisor test scenarios** on the app live.
- **Split:** Kaustubh presents slides 1–5 (including a live demo and the Saathi slide); **Vatsal presents slides 6–8** (branches USP, competitors, impact) and the close.

---

## 2. The problem (from the case)

Small businesses (**MSMEs / SMBs**, e.g. kirana stores, clinics, coaching centres, CA firms, restaurants, small factories) now need more than a SIM: internet (fibre or leased line), business SIMs, WhatsApp/SMS, email, cybersecurity, CCTV, billing (POS). They buy each from a different vendor, with **no single bill or support number**.

Accel already sells most of these, but **one at a time, through a field sales force built for large accounts**. The journey today:
- Needs found in a **sales visit**; the salesperson pushes whatever is on target that month.
- A **quote takes 3–5 days**, as a PDF of product codes the owner doesn't understand.
- **KYC** needs GST certificate, Udyam registration, address proof and signatory ID, collected **physically or by email**.
- **Installation takes 10–14 days**, with 3–4 follow-up calls from the customer.
- Each product is **billed and supported separately**.

**The task:** a digital-first journey where a small business owner can **find the right bundle, buy it and get it activated with minimal human effort, on a phone, in their own language.**

**Key questions in the case:**
1. Which segments first, and what bundle for each?
2. How does needs discovery work **without a salesperson**? (A GenAI advisor in Hindi and regional languages.)
3. How to make **KYC near-instant** (GSTIN/Udyam lookup, OCR, DigiLocker, e-sign) while following the **DPDP Act 2023** (consent, purpose limitation, data minimisation)?
4. What role for the **field force and local channel partners**, so the app **adds to them** instead of competing?
5. What **3–5 metrics** define success, with targets?

**Build challenge (must have):** Advisor (GenAI), Quote and checkout (one monthly price, toggle add-ons), Smart KYC (upload, extraction, validation, mocked GSTIN/Udyam lookups, consent screen), Tracker (order status).
**Stretch goals:** voice/WhatsApp front end; **back-office view for sales/partners showing leads the advisor couldn't close**; a **propensity score** for which leads to call.

**Data given:** 25-product catalogue; 5,000 leads (smb_leads.csv, Apr–Jun 2026); mock GSTIN registry (3,534 records) and Udyam registry (2,723); 12 sample KYC applicants (47 images) with **planted problems**.

---

## 3. What the case data showed (numbers to know)

| Number | Meaning |
|---|---|
| 5,000 → 368 | Leads → customers last quarter (**7.4%**) |
| 17.6 days | Average time from lead to activation |
| 3 calls | Status-chasing calls per customer |
| ₹15,053 | Cost to win one business today |
| ₹6,900 | Median monthly bill |
| 64% | Share of drops after first contact that the app can fix directly (1,932 of 3,038) |
| 827 / 385 / 273 / 167 | Leads lost to: no sales visit / confusing or slow quote / documents / installation delay |
| 9.6% vs 2.0% | Activation rate with a GST number vs without (almost 5×) |
| 22 | Customers activated on **cancelled** GST numbers today |
| 53 | Bundles sold today that **break the catalogue rules** |
| 11.1%, 1.6 months | Professional offices: conversion and payback |
| ₹20,007 vs ₹2,504 | Micro shops: cost to win vs monthly bill (a visit never pays back) |
| 5.9% → 27.9% | 6-month churn for customers who chased their order 1 time vs 5 times |

**Segments and our channel choice:**
- **Professional offices** (clinics, CA, coaching): start here, **self-serve first**. Best conversion, fast payback, 86% have GST.
- **Micro retail** (kirana, salon): 54% of leads, **self-serve only** (a visit costs more than they pay).
- **Multi-site chains:** ₹20,000+ bills, **assisted + app**.
- **Manufacturers:** **field sales / partner + app**.

---

## 4. Our solution in one line

**Udyam Digital**: an app that takes a small business from "interested" to "installation booked" in **about 10 minutes**, on their phone, in their language, with **no visit, no paperwork and one consent**.

**Core rule of the design:** *GenAI talks; rules decide.* The AI understands and explains; **plain code chooses products, calculates every price and does KYC**, so the owner never sees a made-up price or a product they can't legally buy.

**Live app:** https://claude.ai/artifact/VaRpyDYHMyfuERiz7Gi66N
Code: github.com/kaustubh3103/udyam-digital

The app has **3 tabs** at the top:
1. **Owner app:** what the shop owner uses.
2. **KYC check:** what an Accel KYC staff member sees.
3. **Sales & partner desk:** what an Accel salesperson or partner shop sees.

On a laptop, a **"Behind the screen"** panel next to the phone explains what the system is doing at each step. The **Hide notes** button in the top bar hides it for a clean demo.

---

## 5. The owner app, screen by screen

1. **Language:** Hindi, English (complete), Marathi (partly), others "coming soon". Language comes first because the brief asks for it.
2. **Phone number + OTP:** demo code 123456. Back arrows on both screens. An existing Accel mobile customer gets a "welcome back".
3. **Business type:** picture tiles (bakery, clinic, kirana…). "Not in the list?" → 4 broad groups (shop, office/clinic, chain, factory) with examples in the name box. Owners can also type or speak ("meri dawai ki dukaan hai"), and a word classifier maps it.
4. **GST:** the owner types the GST number, or picks a demo; the app **looks it up** (name, address, status), so there's no certificate upload. "I don't have GST" is allowed: they still get a plan of everything that doesn't legally need GST.
5. **Size:** number of people (1, 2–4, 5–9, 10–24, 25+) and branches (1, 2–3, 4–10, 10+).
6. **Location:** city + pincode → checks if **fibre** is available there. If not, the app offers **5G AirFiber** (wireless home/business internet, no cable needed). It warns gently if the pincode doesn't match the city. Demo: Ludhiana 141008 = no fibre.
7. **What they use now:** current internet (mobile hotspot, home broadband…).
8. **What they want to do (needs):** goals, not products: take UPI/card payments, CCTV, WhatsApp, guest Wi-Fi, billing, email, backup, antivirus, internet that stays on, business phone number, website, SMS, manage branches, monitor machines, track vehicles.
9. **Your branches** (only if 2+ branches): each branch gets its own size (small/regular/large), pincode and services. A **"Same as"** button copies another branch.
10. **Your plan:** the three plans (section 6), one monthly price, a reason for every item, remove/add/change quantity, "Build my own plan", "Add a service", Listen (read aloud), common questions (lock-in? hidden charges?).
11. **Consent:** one clear DPDP consent screen (what data, why, for how long).
12. **KYC:** ID via **DigiLocker**, signature via **Aadhaar e-sign OTP**. Photo upload is only a backup.
13. **Install slot + payment:** pick a date and time; UPI AutoPay.
14. **Tracker:** order status, so the owner doesn't need to call. Also **My branches**: every branch and its cost on one bill, add a branch in two taps.

**Saathi** (the AI assistant) is available on every screen (section 7).

---

## 6. The three plans (how a plan is built)

**Rule engine** (`src/engine/advisor.js`): plain JavaScript in the browser, **no AI**. It takes segment, staff, branches, city tier, GST, fibre and needs, then:
1. Picks the **internet line** (fibre by segment; AirFiber if no fibre; leased line for factories that qualify).
2. Adds **SIMs** by staff count.
3. Turns **each need into products** (payments → billing tablet; CCTV → cameras; etc.).
4. Checks **eligibility** on every product. Anything not allowed is shown as **locked, with the reason**.
5. **Prices** everything from the catalogue.

**The 5 eligibility rules (from the catalogue):**
- **City tier:** 1 Gbps fibre only in Tier-1 cities.
- **Staff:** Leased line 20 needs 10+ staff; Leased line 100 needs 25+; 1 Gbps fibre 5+; cloud telephony 3+.
- **Branches:** SD-WAN (connects branches) needs 3+.
- **GST:** WhatsApp Business, SMS, toll-free, telephony, leased lines, SD-WAN, firewall and machine IoT need an active GST number.
- **Dependency:** CCTV, backup line, Wi-Fi and SD-WAN need a fibre/AirFiber/leased line in the same plan.

**The three plans:**
- **Basic:** internet + SIMs + **everything the owner asked for**. Nothing they picked is dropped.
- **Recommended:** Basic + **"Businesses like yours"** (every add-on that **25% or more** of similar activated customers bought, with the % shown; from `scripts/attach_rates.py` on the case data) + **"Accel suggests"** (expert checklist: antivirus, backup line, business email, cloud backup, protection cover, when they fit).
- **Premium:** Recommended + the **fastest line and biggest SIM plan they qualify for**, backup line, fixed IP, firewall, **Premium Care** (24×7 priority support, relationship manager, 4-hour fault fix, uptime promise with bill credit; **₹999/month**) and **Business Protection Cover** (cyber-fraud and equipment cover up to ₹5 lakh via a partner insurer; **₹299/month**).
- Premium Care and the cover are **not in the case catalogue**: they are **proposed by Team JIO** and labelled **"proposed price"** in the app.
- If the owner removes an item that served a goal, the plan warns **"no longer covers: CCTV"** with **Add it back**.

**Example: bakery in Ludhiana, 2–4 staff, wants UPI payments + CCTV:**
- **Basic ₹2,594/month:** Fibre 100 + 2 SIMs + billing tablet + 2 CCTV cameras, setup ₹6,100.
- **Recommended ₹4,988:** adds guest Wi-Fi (31% of similar shops buy it), WhatsApp Business (26%), antivirus, backup line, protection cover.
- **Premium ₹7,287:** adds Fibre 300, 150 GB SIMs, fixed IP, Premium Care.

**Why 25%?** One in four similar customers buying it is a strong, simple signal. Lower brings in things few buy (feels like upselling); higher leaves out useful items. It's one number in the code, easy to tune.

---

## 7. USP 1: Saathi, the AI assistant that picks up where you are

**Saathi** means companion. A normal chatbot says "Hi, how can I help?" and makes you explain everything again. **Saathi already knows everything the owner has entered**: business, staff, city, GST, needs, the current screen and the plan. So the owner just asks their doubt.

- It shows **"Picking up where you are"** with tags (Saffron Bakers, 2–4 people, Ludhiana, GST verified, UPI, CCTV, Basic ₹2,594).
- It answers **in the owner's language**, even Hinglish: "Setup fee kyun lag rahi hai?" → answers using their own plan's numbers.
- It can **fill the whole form from one message**: "Pune mein mera medical store hai, 3 log kaam karte hain".
- The chat stays if they close and reopen it.
- Suggested questions change with the screen.

**How it stays safe (never makes things up):**
1. The app sends the AI: our **rules** (what it may and may not do), the chat so far, and the **context** (all answers, plans, branches).
2. The AI must reply in a **fixed format** (a message plus proposed form updates from fixed lists).
3. **Code checks** the updates; anything outside the allowed lists is dropped. GST and pincode lookups are done in code, not by the AI.
4. The **rule engine prices** the plan.
5. **Price guard:** every ₹ amount in the AI's reply is compared with amounts the rules produced. If the AI writes a number the rules didn't make (e.g. a fake "₹777 discount"), **the reply is blocked**.

**Proof:** 0 rule breaks in 19,000 generated test plans (vs 53 broken bundles sold the old way).

**Model:** Claude. In the live claude.ai link it uses claude.ai's built-in AI access (the viewer must be signed in and allow it once). In production: Claude Haiku via a small server route; a chat costs a fraction of a rupee. If the AI isn't available, Saathi falls back to **built-in quick answers**; the journey never depends on the AI.

---

## 8. USP 2: every branch gets its own plan

Today a chain gets the **same setup at every shop**, so a small counter pays for a big store's setup.

In our app each branch gets its own **size, pincode and services**; **"Same as"** copies another branch. Shared items (like SIMs) are bought once.

**Example: Saffron Bakers, 2 branches in Ludhiana:**
- **MG Road** (large): Fibre 300, 2 billing tablets, 6 cameras → **₹3,891/month**
- **Station Road** (small, no fibre here → 5G AirFiber): 1 tablet, 2 cameras → **₹1,896**
- **Shared:** 2 business SIMs → **₹1,198**
- **Total ₹6,985/month** vs **₹8,980** if both got the big store's setup → **saves ₹1,995 a month (22%)**.

Every owner can shape any plan: choose Basic/Recommended/Premium, remove items, change quantities, add services, or build their own from just the internet line. Locked items say why ("needs a GST number"). After booking, **My branches** shows every branch on one bill. 4,000 random custom plans tested: zero mistakes.

**Multi-state chains?** Each state needs its own GST number, so they go to field sales (who use the same app). Self-serve covers chains in one region.

---

## 9. KYC check tab (Smart KYC), explained simply

**KYC** = checking the business is real before giving it a connection.

**In the owner app, most owners upload nothing:** GST number looked up in the government list; ID from **DigiLocker**; signature with **Aadhaar OTP**. Photos are a backup.

**For photos, 4 steps:**
1. **Is it clear?** A blur check runs on the phone instantly; blurry → "retake". (273 leads were lost to document problems.)
2. **Read the text (OCR):** the computer reads the GST number, name and address from the picture. Tilted photos are straightened first.
3. **Check with simple rules (not AI):**
   - **Check digit:** the last character of a GST number is calculated from the other 14; if anyone edits it, it won't match → catches **fakes**.
   - **Registry status:** still active, or cancelled/suspended?
   - **Name match:** certificate name vs government record.
   - **Bill age:** electricity bill under **90 days** old.
   - **ID not expired**; for an LLP or company, confirm the signer can sign.
   - **OCR repair:** if OCR reads 0 as O where only a digit can be, it's corrected.
   - **Udyam:** if not uploaded, found by business name and city.
4. **Decide:** 🟢 Verified / 🟡 Quick review (30 seconds for a person) / 🔴 Needs action (owner told exactly what to fix).

**The tab** shows the case's **12 sample applicants (K01–K12)**. Results: **5 need action, 2 quick review, 5 verified**; **all 7 planted problems caught**. Examples:
- **K01 Vindhya Tours:** GST **cancelled** → needs action
- **K03 Ganesh Woodcraft:** OCR read "O" for "0", fixed → verified
- **K04:** photo too **blurry** → retake
- **K05 Balaji Realty LLP:** confirm the signer can sign for an LLP → quick review
- **K06:** GST number **fails the check digit** → looks altered → needs action
- **K07:** certificate says "Shri Physio Clinic", registry says "Neelgiri Physio Clinic" → needs action
- **K11 Trinity Bake House:** electricity bill **257 days old** → needs action

It also has **"Try the photo check"**: upload any photo, and it says Clear or Blurry.

**Honest notes:** the government registries are mock files from the case. OCR (the free tool **Tesseract**) was run once in advance on the 12 samples; **all checks run live** in the app. Real GST and DigiLocker APIs exist via GST Suvidha Providers and DigiLocker partner onboarding.

**DPDP Act:** one consent for one purpose, minimum data, lookups instead of uploads, IDs masked on screen, documents deleted 90 days after activation.

---

## 10. Sales & partner desk, explained simply

**Problem:** salespeople visit shops in person; for a small kirana shop the visit costs more than the shop pays. The case asks what salespeople and partners should do so the app **helps them, not replaces them**.

**Our answer:** the app closes the easy owners by itself. **Salespeople only call people who got stuck, starting with those most likely to buy.** They keep the big accounts (chains, factories). **Partner shops sign up owners with the same app and get credit.**

**Parts of the screen:**
- **KPI tiles (today → target):** conversion 7.4% → 15%+; days to go live 17.6 → under 5; cost per customer ₹15,053 → ₹6,500 or less; status calls 3 → under 1.
- **Start assisted sign-up buttons:** "Sharma Telecom" (a local partner shop, code PTR-1042) and "Field sales · Priya N." (example names). Click one → the same owner app opens with a strip **"Assisted by Sharma Telecom · PTR-1042"**. The partner fills it in with the owner; the owner does consent and KYC on their own phone. The order is **credited to the partner**.
- **Orders from this demo session:** each booked order with its channel (Self-serve or partner name).
- **Callback queue:** leads the app couldn't close: 150 stuck leads from the case data, plus live "Talk to a person" requests from the app (tagged "New from app"). Each shows a **score**, the **reasons for the score** (e.g. "Came by referral", "Has GSTIN", "Multi-site"), **where it got stuck**, and a **suggested next action**.
  - Example: **Amrit Bake House**, bakery chain, Pune, Marathi, **score 40**, stuck because "visit not scheduled by sales" → action: **"Send WhatsApp link to finish in the app"**.
  - Other actions: slow quote → send instant quote link; document problem → call to fix it together; no fibre → offer 5G AirFiber.
- **Lead score:** how likely the lead is to become a customer. A **logistic regression** (a simple statistics model) trained on the 5,000 leads, using segment, lead source, GST, current internet, staff, branches and whether they're already an Accel customer. **AUC 0.72** (0.5 = coin flip, 1 = perfect).
- **Where leads drop, and what removes it:** a bar chart; 64% of drops after first contact are fixable by the app. A grey bar shows what isn't (price, unreachable).
- **Status chasing predicts churn:** customers who called once to chase their order: 5.9% left in 6 months; 5 times: 27.9%. That's why we built the tracker.
- **Rules the current process broke:** today 53 rule-breaking bundles and 22 activations on cancelled GST; with our app, 0.
- **Segment economics:** conversion, cost, bill, payback, churn and our channel per segment.

---

## 11. Impact (slide 8)

Applied to last quarter's 5,000 leads with **the same spending**:
- **854 customers instead of 368 (2.3×)**
- **Cost per customer ₹6,484** instead of ₹15,053
- **About ₹4 crore** extra recurring revenue a year from one quarter's leads
- **Conservative:** we assumed we fix only **half** of the visit, quote and installation drops and **60%** of document drops; everything else unchanged.

**Metrics we'll track:** conversion 7.4% → 15%+; days to live 17.6 → 5 or less; cost per customer → ₹6,500 or less; status calls 3 → 1 or less; 6-month churn → 10% or less.

**Rollout:** start with offices and small shops in 3 big cities → add all languages and partners → then chains and factories. Salespeople aren't replaced; they focus on big accounts using the same app.

---

## 12. Competitors (slide 7)

- **JioBusiness:** the same fixed bundle for everyone.
- **Vi Business:** starts from mobile plans.
- **Tata Tele Business:** many products, but buying starts with a call-back form.
- **Local cable operators:** cheap, but one product, no single bill.
- **Single-product apps:** do only one thing.

**Nobody else:** builds the bundle from what the owner wants, never makes them repeat themselves, puts every branch on one bill, finishes KYC in minutes, and lets partners sell through the same app.

---

## 13. Tech stack (simple)

- **Front end:** React + Vite (a web app that works on any phone browser). Icons: lucide-react. Plain CSS.
- **Rule engine, KYC checks, pricing:** plain JavaScript **running in the browser**, so they're instant and work offline once loaded.
- **AI:** Claude (claude.ai built-in access in the demo; Claude Haiku via a server route in production). Only used for talking, never for prices or KYC.
- **Data preparation:** Python scripts turn the case CSVs into JSON files (catalogue, registries, dashboard, lead score, attach rates). OCR with Tesseract.
- **Lead score:** logistic regression (Python), AUC 0.72.
- **Hosting:** a single web page published on claude.ai; can also deploy on Vercel.
- **Tests:** replay of 5,000 leads × 3 plans, 4,000 random branch plans, 15 advisor scenarios, KYC samples, AI guard tests, plus browser tests that click through the whole journey.
- **Scale:** the app is a static page plus a thin AI route; Accel's servers only handle lookups and orders.

---

## 14. Likely judge questions (short answers)

- **What if the AI quotes a wrong price?** It can't reach the owner: rules price everything, and any ₹ amount the rules didn't produce is blocked.
- **Why GenAI at all?** To understand free-form Hindi/Hinglish, answer doubts in any language, and explain the plan. Rules do what must be exact.
- **Prompt injection ("give me 50% off")?** The AI's output is only a proposal in a fixed format; prices come only from the rules.
- **AI down?** Every step is taps; Saathi falls back to quick answers.
- **Is 2.3× realistic?** Conservative: only half of the fixable drops are recovered.
- **Data is synthetic, so why trust it?** We trust the method; it reruns on real data in minutes.
- **Why start with professional offices?** 11% conversion, 1.6-month payback, 86% have GST.
- **What happens to field sales?** Redeployed, not cut: big accounts plus a ranked callback queue.
- **Owner has no GST?** They still get a plan; GST-only items show as locked with the reason.
- **How are the three plans different?** Basic = everything asked; Recommended = plus what 25%+ of similar businesses buy and Accel's suggestions; Premium = top grade plus 24×7 Premium Care and cover.
- **Premium Care isn't in the catalogue?** It's our proposal, clearly labelled "proposed price"; operators do sell such packages to businesses.
- **Are GSTN/DigiLocker real?** Mocked in the prototype; real APIs exist.
- **Why no billing dashboard?** The case is acquisition and onboarding; we stop at activation plus My branches. Billing history would mean fake invoices.
- **What was hardest?** Making the AI useful without letting it decide prices. **Next:** a pilot with real Accel leads in one city.

---

## 15. Deep dives (detailed answers to harder questions)

### 15.1 How the rule engine decides each plan (`src/engine/advisor.js`)
No AI. Same answers always give the same plan.
1. **Answers → facts:** segment (from business type), staff (lower end of the band, so we never over-sell), branches, city tier, GST active?, fibre at pincode?, goals.
2. **Internet line:** factory with GST and 10+ staff → leased line; no fibre at pincode → 5G AirFiber (a chain may get a leased line); micro shop → Fibre 100; office/clinic/chain → Fibre 300.
3. **SIMs by staff:** 1→1, 2–4→2, 5–9→3, 10–24→5, 25+→8. Micro shops get the ₹299 SIM plan, others ₹599.
4. **Goals → products and quantities:**
   - payments / billing → billing tablet (Cloud POS), 1 per branch
   - CCTV → cameras: 2 per branch for micro shops, 4 for others
   - WhatsApp → WhatsApp Business API; SMS → SMS pack; website → website + domain; backup → cloud backup
   - guest Wi-Fi → Secure Wi-Fi, 1 per branch
   - email → 1 email ID per person; security → antivirus, 1 per person (at least 2)
   - internet that never stops → backup 4G/5G line, 1 per branch
   - business phone → 2 cloud telephony (IVR) lines, or a toll-free number if those aren't allowed
   - connect branches → SD-WAN, 1 per branch; machines → 5 IoT sensors; vehicles → 3 fleet trackers
5. **Eligibility check** on every item (5 rules); failures are shown **locked with the reason**.
6. **Three plans:**
   - Recommended adds "Businesses like yours" items (25%+ attach rate) and "Accel suggests": antivirus if 2+ staff or a billing tablet; backup line if POS, CCTV or uptime asked; email for offices, chains and factories; cloud backup for offices and factories; protection cover if they take digital payments.
   - Premium adds the fastest line and biggest SIM plan they qualify for, plus backup line, static IP, firewall (if GST), Premium Care and Business Protection Cover.
7. **Price:** catalogue price × quantity; setup = one-time fees added; contract = longest minimum; install time = slowest item. A **second checker** (`verifyBundle`) re-checks the finished plan.
- **Branches:** each branch is resized by size (small/regular/large) and pincode (AirFiber if no fibre); shared items such as SIMs are bought once.
- **Quantities are sensible starting points we set**, not site measurements. In production the installer confirms counts at the site, and the owner can change any count before billing.
- **Owners never choose specs.** They choose goals and answer size and location; every item shows a plain reason.

### 15.2 How Saathi gets its context (no training, no fine-tuning)
With **every message**, the app sends three parts:
1. **RULES** (fixed system prompt in `src/ai/assistant.js`): who Saathi is; never invent prices, discounts or products; reply in the owner's language; reply in a fixed JSON format `{message, updates, goTo, showPlan, callback}`.
2. **CONTEXT** (rebuilt fresh by `buildContext` each message): allowed values (business types, cities, need IDs, bands); facts (one bill, prices exclude GST, KYC process, what needs GST); the catalogue with entry prices; the owner's answers; what's still missing; the current plan from the rule engine item by item; **all three plans with each item's reason**; branch-by-branch costs; locked items; the booked order after sign-up.
3. The **recent chat**.
- The model remembers nothing between messages, so it must get the facts each time, and the plan keeps changing.
- **Never sent:** phone number, GSTIN, Aadhaar, ID numbers, owner's name, documents.

### 15.3 How we stop hallucinations (5 layers)
1. **Grounding:** real facts sent every time, with "quote only these prices".
2. **AI decides nothing important:** products, prices and lookups are code.
3. **Fixed JSON + validator:** every suggested form value must be on an allowed list (e.g. city "Atlantis" or plan "Gold" → rejected).
4. **Price guard:** every ₹ amount in a reply must match an amount the rules produced; otherwise the reply is blocked and a safe built-in answer is shown (a fake "₹777 offer" was blocked in tests).
5. **Fallback:** if the AI is unavailable, built-in answers.
- Honest limit: wording can still be imperfect, but a wrong price, product or form value can't reach the owner. "Talk to a person" is always one tap away.

### 15.4 Cost of sending context every message
- Measured prompt: rules about 4,100 characters + context about 7,600 = **about 3,000 tokens**, plus a few hundred for chat. Reply about 250 tokens.
- Claude Haiku 5.5 pricing (Anthropic, Nov 2026): **$0.10 per million input tokens, $0.50 per million output tokens** for prompts under 100K tokens.
- One message ≈ **$0.0005 (about 4 paise)**; a 5-message chat ≈ **20 paise**; 50,000 messages a day ≈ **$24/day**. Compare ₹15,053 to win a customer.
- Cheaper still with **prompt caching** (cache reads cost 10% of the input price; the rules and catalogue are the same for everyone), built-in answers for common questions, and most owners never opening the chat.

### 15.5 Saathi in production (system design)
Owner's phone → **Saathi service** on Accel's server (API gateway with login check and rate limit; context builder loading the session; prompt assembly; secret API key) → **Claude API (Haiku)**, replying in fixed JSON with streaming → **validator** → **rule engine** → **price guard** → back to the phone.
- **Session store** (e.g. Redis or a database) so Saathi remembers across devices; order database/CRM for post-booking questions; masked logs with limited retention.
- **Failures:** timeout (e.g. 8 s) → built-in answers; blocked reply → safe pre-written answer; rate limit → friendly wait message; off-topic → polite redirect; human wanted → "Talk to a person" to the callback queue.
- **Monitoring:** reply time, fallback rate, blocked replies, common questions, drop-off after chatting; weekly review of masked chats; automated tests before every release.
- **Later:** WhatsApp Business API channel, voice (speech-to-text / text-to-speech), partner mode, all using the same service and guards.
- **Today's prototype:** in the claude.ai link Saathi uses claude.ai's built-in AI ("sample" capability); `api/chat.js` is the small server route for production. On a plain static host like GitHub Pages only built-in answers work.

### 15.6 The lead score in detail
- **Model:** logistic regression, scikit-learn, C = 0.5 (light regularisation), trained on all 5,000 leads; target = activated (368 yes).
- **9 facts (one-hot encoded):** segment, lead source, has GST, has Udyam, current internet, city tier, staff band, branch band, already an Accel customer. No personal details.
- **Biggest weights:** referral +0.86, has GST +0.63, inbound call +0.33, multi-site +0.29, professional office +0.22; WhatsApp campaign −0.84, no GST −0.65, website form −0.52, micro shop −0.51, mobile hotspot −0.22. Base (intercept) −2.90.
- **Scoring (`score.js`):** base + weights of the lead's facts → logistic curve → percentage; top 3 positive facts (above 0.15) become the "why" chips.
- **Examples:** a referral clinic with GST in a Tier-1 city, already an Accel customer → about 36. A micro shop from a WhatsApp ad, no GST, mobile hotspot, Tier 2 → under 1.
- **AUC 0.72**, from 5-fold cross-validation (if you pick one buyer and one non-buyer, the buyer ranks higher 72% of the time).
- **Scores look low** (top about 40) because only 7.4% of leads ever buy; the ranking is what matters.
- **Queue selection:** leads that dropped for app-fixable reasons, sorted by score, top 90 plus 60 more spread out (every 25th), so 150; plus live "Talk to a person" requests at the top.

### 15.7 Impact maths (slide 8)
- Today's spend = 368 × ₹15,053 ≈ **₹55.4 lakh a quarter**.
- Win back 50% of drops from no visit (827), confusing/slow quote (385) and installation problems (167), and 60% of document drops (273); everything else unchanged.
- Stage pass rates today → with us: contacted 68% → 68%; needs assessed 58% → 70%; quote accepted 44% → 53%; KYC complete 68% → 87%; activated 63% → 77%.
- 5,000 × those rates ≈ **854 customers** (2.3×). ₹55.4 lakh ÷ 854 ≈ **₹6,484 per customer**. Extra revenue = 486 × ₹6,900 × 12 ≈ **₹4.0 crore a year**. Script: `numbers.mjs`.
- **368 = activated, paying customers**; 3,406 were contacted. Funnel: 5,000 → 3,406 contacted → 1,974 needs assessed → 861 quote accepted → 588 KYC complete → 368 activated.

### 15.8 Segments: why micro costs more, and how we target offices
- Micro: Accel spends **less per lead** (₹812 vs ₹1,184 for offices), but only **4.1%** convert vs 11.1%. About 25 leads per customer vs 9, so ₹20,007 vs ₹10,694.
- Why micro converts poorly: 47% have no GST (1.6% conversion without GST vs 6.3% with); "owner had no time for a visit" (12%); "price too high" (10%); "unreachable after 3 attempts" (16%).
- **Targeting professional offices first** is a launch strategy, not a separate app: launch in 3 Tier-1 cities for the first 3 months; marketing through referrals (the best-converting source) and professional groups such as doctors' and CA associations (our suggestion); the lead score ranks offices higher (+0.22 vs −0.51 for micro); the app has office tiles (dental clinic, CA firm, coaching centre) and an office bundle; their KYC is a lookup.
- What offices get: Basic = Fibre 300, 3 SIMs, 5 email IDs, cloud backup, 5 antivirus (₹4,915). Recommended adds what activated offices bought: email 100%, antivirus 49%, cloud backup 41%, cloud telephony 28%, static IP 26%.
- Why salespeople for chains and factories only: their ₹20,000–31,000 monthly bills pay back a visit within a month, and their setups are complex.

### 15.9 GST: what's public, and how we check the owner is real
- A GSTIN is public information. The government GST portal (Search Taxpayer) shows, without login: GSTIN, legal name, trade name, registration date, constitution, status, taxpayer type and offices.
- Companies automate this through a **GST Suvidha Provider (GSP)** authorised by GSTN. Public APIs return basic taxpayer details without consent. We use only that public data, never tax returns.
- **Typing someone else's GSTIN doesn't work:** ownership is proven at signing. DigiLocker / Aadhaar e-sign gives the person's verified name, which must match the proprietor in the GST record (our rule "signer is not the proprietor" → fail). LLPs and companies get a signer review. Production can add an OTP to the GST-registered mobile (GSP taxpayer OTP). Installation always happens at the registered address.
- In the prototype DigiLocker and e-sign are mocked; the matching rule is real and tested on the 12 samples.

### 15.10 KYC pipeline in detail
- **Tools:** Tesseract OCR (free, open-source) via Python, Pillow and numpy; run once in advance on the 12 samples. All checks run live in `src/engine/kyc.js`.
- **Steps per image:** sharpness (Laplacian variance, blurry if 40 or lower; clear samples about 1,450–2,170, K04 scored 9) → deskew (try −10° to +10° in 0.5° steps, fix if 1.5° or more; K02 was 7°) → OCR → readable check (at least 120 letters/digits) → extract fields with text patterns.
- **OCR repair:** a GSTIN has fixed digit and letter positions; O↔0, I↔1, S↔5, B↔8 are fixed only if the result passes the check digit and exists in the registry (K03, K07, K08, K10).
- **Rules:** check digit; registry status Active; legal name 92%+ similar; address 95%+ (review); Udyam in registry or found by name + city; bill within 90 days of 15 Jul 2026; ID not expired; proprietor must match the signer; LLP/company signer → review.
- **Results:** K01 cancelled GST (action); K02 tilted, fixed (verified); K03 OCR fix (verified); K04 blurry (action); K05 LLP signer (review); K06 check digit fails (action); K07 name changed (action); K08 OCR fix (verified); K09 clean (verified); K10 LLP signer + OCR fixes (review); K11 bill 257 days old (action); K12 verified (Udyam activity differs, info only).

### 15.11 How we tested (simple)
- **One command, `npm test`**, under a minute.
- **15,000 plans:** all 5,000 case leads × 3 plans. A **separate checker** tests every item against the catalogue rules: 0 breaks. The same checker found **53 breaks** in bundles Accel actually sold (24 city tier, 12 GST, 9 dependency, 8 staff).
- **4,000 random custom plans:** the computer plays an owner (remove, add, change counts, branches, pincodes): 0 breaks, and branch costs + shared items always equal the bill.
- **KYC:** 12 samples, all 7 planted problems caught, no false alarms.
- **AI guards:** fake replies (₹777 offer, invalid values) blocked or rejected; AI-off fallback works.
- **15 advisor scenarios** like the judges'; 15/15 typed business words classified correctly.
- **Playwright** browser tests click through the whole journey, including Saathi.
- Not yet: real-user testing (first step of the pilot).

### 15.12 How we used Claude (be open about it)
- **Development:** Claude Code, an agentic coding assistant working in our Git repo. It wrote and refactored code, ran the Python data pipeline, ran the test suite after every change, and drove Playwright, all in a build → test → review loop with tracked commits.
- **In the product:** the Claude API (Haiku) behind Saathi, wrapped in a JSON schema, validator, rule engine and price guard.
- **Results are not AI-generated:** they come from scripts on the case data that anyone can rerun. Decisions and assumptions (segments, rules, 25% threshold, impact assumptions, safety design) were the team's.
- **Don't claim:** that we trained or fine-tuned an AI model (the only model trained is the logistic regression), or that "a Claude skill tested the app".

### 15.13 All 27 services
- **From the case catalogue (25):**
  - Connectivity (11): Biz Fibre 100 / 300 / 1G (₹999 / ₹1,499 / ₹3,999), 5G AirFiber 100 (₹899), Leased Line 20 / 100 (₹8,000 / ₹25,000), Business Postpaid 299 / 599, Backup 4G/5G Failover (₹499), Managed SD-WAN (₹2,500), Static IP (₹200).
  - Communication (4): Cloud Telephony / IVR (₹1,000 per channel), Toll-free (₹1,500), Business SMS 10k (₹1,500), WhatsApp Business API (₹999).
  - Cloud (4): Email & Office Suite (₹125/user), Cloud Backup 1 TB (₹499), Website + Domain (₹299), Cloud POS & Billing (₹599/counter).
  - Security (3): Endpoint Security (₹99/device), Managed Firewall (₹1,999), Secure Wi-Fi with Guest Network (₹399).
  - IoT (3): Cloud CCTV (₹199/camera), Machine Monitoring (₹149/device), Fleet Tracker (₹199/vehicle).
- **Proposed by Team JIO (2):** Premium Care (₹999/month) and Business Protection Cover (₹299/month), labelled "proposed price", in Premium only, with no eligibility limits.
- **Leased line** = a private, guaranteed internet line with an uptime promise (99.5% for LL20, 99.9% for LL100), about 21 days to install.
- **Secure Wi-Fi locked?** Its catalogue rule needs a fibre or AirFiber line in the plan (a leased line doesn't count). It's a one-line data change if Accel changes the rule.

### 15.14 Smaller screen details
- **"What do you use today?"** (optional): current internet feeds the lead score (e.g. leased line +0.21, phone hotspot −0.22) and Saathi's context; monthly spend (a range) powers the "one bill" note, which appears **only when our plan costs about the same as today or less** (within 10%). It doesn't change the products.
- **Hide notes** button (top right on a laptop) hides the "Behind the screen" panel for a clean demo; the choice is remembered in that browser.
- **The plan switch** shows each plan's price exactly as the price card would, including branch choices.
- **Talk to a person** on every screen puts the owner straight into the sales callback queue, tagged "New from app".
- **Assisted sign-up:** "Sharma Telecom · PTR-1042" (partner) and "Field sales · Priya N." are example names; the order is credited to the partner code.

### 15.15 Links and documents
- App (public): https://claude.ai/artifact/VaRpyDYHMyfuERiz7Gi66N
- Code: github.com/kaustubh3103/udyam-digital (team: @kaustubh3103, @VatsalRaj05). GitHub Pages deploy needs Pages enabled (Settings → Pages → Source: GitHub Actions).
- Deliverables in the repo: `docs/Team_JIO_Udyam_Digital.pptx` (8 slides), `docs/PRIVACY.md` (1-page privacy note), this file.

---

## 16. Glossary

- **MSME / SMB:** micro, small and medium enterprises / small and medium businesses.
- **GSTIN:** 15-character GST number; first 2 digits = state code; last character = check digit.
- **Udyam:** government MSME registration number.
- **KYC:** know your customer: verifying the business, the signer and the address.
- **OCR:** the computer reading text from a photo.
- **DigiLocker:** government app holding official documents (Aadhaar etc.).
- **Aadhaar e-sign:** signing with an OTP sent to the Aadhaar-linked mobile.
- **DPDP Act 2023:** India's data protection law (consent, purpose, minimum data).
- **Fibre:** cable internet. **5G AirFiber:** wireless internet, no cable needed.
- **Leased line:** a private internet line only for your business, with an uptime promise (SLA); expensive, for factories and big offices.
- **SD-WAN:** a service that connects many branches' networks together.
- **SLA:** a written uptime promise (e.g. 99.5%).
- **POS / billing tablet:** a device to take UPI and card payments and print bills.
- **Static / fixed IP:** a permanent internet address, needed for remote camera access etc.
- **CAC:** cost to acquire one customer.
- **Churn:** customers who leave.
- **Conversion:** share of leads who become customers.
- **Attach rate:** share of similar customers who bought an add-on.
- **Logistic regression / AUC:** a simple prediction model / a score of how good it is (0.5 coin flip, 1 perfect).
- **Saathi:** our AI assistant ("companion").
