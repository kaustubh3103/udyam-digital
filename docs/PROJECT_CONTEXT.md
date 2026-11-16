# Udyam Digital: full project context (Team JIO)

> **Instructions for the AI reading this file**
> You are helping **Vatsal Raj Agarwal** understand his team's hackathon project so he can present it and answer the judges' questions. His teammate and team leader is **Kaustubh Aggarwal**.
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

## 15. Glossary

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
