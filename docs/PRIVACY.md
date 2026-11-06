# Privacy and security note

How the Udyam Digital journey handles personal and business data, designed against the Digital Personal Data Protection Act, 2023 (DPDP Act).

## 1. Consent that means something

- One required consent, shown before any verification, that states the purpose in plain language: confirm the business, confirm who is signing, install at the right address.
- Marketing is a separate, optional box and is **unticked by default**. WhatsApp order updates are a separate choice too.
- The consent screen states how long documents are kept, and how to see, correct or delete data.
- The time of consent and the purposes agreed are stored with the order, so consent can be shown later.

## 2. Collect the minimum (data minimisation)

| Data | Collected? | Why |
| --- | --- | --- |
| GSTIN | Typed once | Replaces the GST certificate upload and fills business name, address and constitution from the registry |
| Udyam certificate | **Not collected** when the Udyam record is found by business name and city | Lookup instead of upload |
| Address proof | **Not collected** when installing at the GST-registered address | Most error-prone document, and not needed |
| Signatory ID | Reused from an existing Accel mobile account, or shared from DigiLocker as **name and ID number only** | No photocopy of an ID card is stored |
| Signature | Aadhaar e-sign (OTP) | No paper signature, no visit |
| Business size | Ranges (for example 5–9 staff), not exact figures | Enough for eligibility rules |
| Monthly spend | Optional range | Used only to show the one-bill comparison |

## 3. Purpose limitation

- KYC data is used only to verify this order. It is not used for marketing unless that separate box was ticked.
- The lead score uses only business attributes (segment, GST status, size band, channel), never personal attributes.
- The sales desk sees **masked contact names** and the reason a lead stalled. It does not see document images.

## 4. Retention

- Uploaded documents: deleted **90 days after activation** (or 30 days after an abandoned order).
- After that, only masked identifiers remain (for example `03•••••4821•••B`) with the verification result and date, for audit.
- Saved progress on the owner's phone lives only in that browser and can be cleared with "Start again".

## 5. Security choices

- **Masking everywhere:** GSTIN, Udyam and phone numbers are masked in the UI and must be masked in logs.
- **No model sees raw identifiers.** The prototype uses no LLM for decisions. If a language model is added for voice or Q&A, inputs are stripped of GSTIN, phone, Aadhaar and names first, and the model can only select from pre-approved responses.
- **Deterministic decisions:** every KYC result comes from code (check digit, registry status, name match, document age), so it can be audited and explained to the customer.
- **Quality check before upload:** blurry photos are caught on the phone, so fewer re-uploads and fewer copies of the same document.
- **The raw 5,000-lead file is never shipped to the browser.** The app gets only aggregates, model coefficients and a small masked sample.
- In production: TLS everywhere, documents encrypted at rest with per-tenant keys, role-based access for the sales desk, and access logs for every document view.

## 6. Customer rights

The owner can see, correct or delete their data from settings or by calling the one support number. Requests for erasure delete documents immediately and keep only what the law requires for billing.
