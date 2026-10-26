# Firebase deployment and launch checklist

## 1. Review the Firebase project

- Confirm project ID `yukti-247` and database URL `https://yukti-247-default-rtdb.firebaseio.com`.
- Enable Email/Password and Anonymous Authentication.
- Add `localhost` and the real deployed domain to Authentication's authorized domains.
- Deploy the supplied `database.rules.json` rules only after reviewing them.
- Test read/write paths for guest users, patient users, and admin users in the Firebase Emulator Suite or Rules Playground.

## 2. Grant an administrator role

1. Create a staff account in Firebase Authentication.
2. Copy the account UID.
3. From a trusted Firebase Console session, add `clinic/roles/<UID>`:

   ```json
   { "admin": true, "role": "admin" }
   ```

4. Confirm that the account can sign in at `#/admin/login` and non-admin accounts cannot reach staff content.

Never add a role-grant button to the public client. Role assignments are trusted administrative operations.

## 3. Run locally

From the folder containing `firebase.json`:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`. Firebase network access is still required for authentication and database workflows.

## 4. Deploy Hosting and Realtime Database rules

```bash
npm install -g firebase-tools
firebase login
firebase use yukti-247
firebase deploy --only hosting,database
```

Review which Firebase project is selected before deployment. The web configuration in `firebase-config.js` is intended for the browser; never add service account credentials or private server keys to the public files.

## 5. Content setup

Before launch, set the actual clinic name, phone, email, address, opening hours, directions link, treatment content, professional profiles, pricing, FAQs, reviews, and approved educational articles in the staff workspace. Publish only content that is accurate and approved. Do not keep placeholder identity or demonstration imagery that could be mistaken for the real clinic.

## 6. Required production hardening before real patient use

The included Firebase adapter is a frontend integration, not a complete clinical system. Before accepting real patient information or promising confirmed appointments:

- Move slot reservation and all authoritative appointment validation into trusted server code (for example, a callable Cloud Function with Authentication and App Check).
- Enforce opening hours, valid services and dentists, appointment duration, overlaps, holidays, availability, cancellations, and race-free reservations on the server—not only in browser code.
- Replace publicly readable client slot-lock metadata with a server-mediated availability interface. Current lock records expose a pseudonymous Firebase UID and timestamp to clients.
- Add appropriate rate limiting, App Check, anti-abuse controls, data retention, auditing, backup and restore procedures, incident handling, and monitoring.
- Review Realtime Database Rules for guest account creation, patient-record isolation, role assignment, staff permissions, imports, and status transitions.
- Configure notification services deliberately if clinic staff need email/SMS messages. The current site does not send those notifications.
- Implement a genuine Firebase Storage upload path if the clinic needs staff image uploads. The current editor stores asset URLs/references and does not upload binary files to Storage.
- Replace generic privacy and terms content with clinic-approved documents that reflect actual practices and applicable law.
- Test keyboard accessibility, reduced-motion behavior, mobile layout, keyboard navigation, Firebase permission failures, and recovery from offline states.

## 7. Final operational checks

- An anonymous visitor can create an enquiry/appointment request only under allowed rules.
- A signed-in patient sees only that account's records.
- An unprivileged account cannot read the admin workspace or write staff content.
- Only a trusted admin role can edit content and manage the queue.
- Slot locks and appointment requests cannot be abused to claim unauthorized times.
- Failed writes are shown as failures; the interface must not claim a request succeeded when Firebase rejected it.
- All published details, professional credentials, testimonials, prices, photographs, and legal claims are verified.

Do not treat this checklist as proof of regulatory compliance or a professional security review.
