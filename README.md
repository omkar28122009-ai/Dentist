# Aurelle Dental — Ultra Cinematic 3D Firebase Website

A no-build, responsive dental-clinic website with a cinematic visual identity, a dimensional Three.js hero, film-style opening sequence, scroll-driven scene transitions, pointer-reactive lighting, depth-revealed content, treatment discovery tools, a context-aware rule-based virtual assistant, Firebase Authentication, Firebase Realtime Database, booking-request workflows, patient account views, and an authorized content-management workspace.

> **Important:** The web client is wired to the Firebase project named `yukti-247`, using the configuration supplied for this project. I cannot verify from this build environment whether the project's Authentication providers, database rules, authorized domains, or administrator roles have already been configured. Complete the setup steps below before testing it against live data.

## Start locally

Run a local HTTP server from the extracted project folder. Do not open `index.html` through `file://` because Firebase modules, browser security policies, or remote WebGL assets may behave differently.

```bash
python -m http.server 8000
```

Open `http://localhost:8000` in your browser.

## Deployment routes and major features

The app uses a lightweight hash router. These routes are available through the interface:

- `#/` — Cinematic homepage
- `#/about` — Clinic story and care philosophy
- `#/treatments` — Searchable, filterable treatment catalogue, sort controls, and side-by-side comparison of up to three treatments
- `#/treatments/:slug` — Treatment information pages
- `#/dentists` and `#/dentists/:slug` — Dentist directory and profile views
- `#/patient-stories` — Approved reviews and consented gallery content
- `#/faqs` — Searchable, categorized FAQ interface
- `#/contact` — Verified clinic contact settings and Firebase-backed enquiry form
- `#/book-appointment` — Multi-step appointment request workflow
- `#/appointment-confirmation` — Stored appointment-request information and status
- `#/assistant` — Local, rule-based virtual assistant page
- `#/login`, `#/register`, `#/forgot-password` — Firebase Authentication screens
- `#/patient-dashboard` — Account-linked appointment view and cancellation-request workflow
- `#/admin/login` and `#/admin` — Role-protected content and operations workspace
- `#/dental-guides` — Educational articles
- `#/privacy`, `#/terms`, `#/accessibility` — Editable policy information

The global search can be opened from the search control. On supported desktop keyboards, use `Ctrl+K` or `Command+K`.

### Ultra cinematic motion layer

The site now includes a short, silent spotlight-led opening, warm coral/orange-to-lavender atmosphere shifts, moving light fields, layered horizontal transition lines, scroll-progress-driven parallax, perspective-based content reveals, and finer pointer-driven depth on the hero and cards. The existing 3D pearl-tooth sculpture adds secondary orbiting accents and slowly moving warm/cool studio lights. The motion layer uses local CSS and JavaScript; it does not call an AI or analytics API and does not save visitor state. It respects the device reduced-motion preference and simplifies effects on smaller screens.

Files added for this layer:

- `cinematic-motion.css` — cinematic light fields, intro sequence, transitions and responsive motion styling.
- `cinematic-motion.js` — section sequencing, scroll progress, reveal timing and pointer interactions.
- `experience3d.js` — Three.js tooth sculpture, orbital geometry, accent gems and dynamic studio lighting.

### Premium interaction features

- Cormorant Garamond and Inter editorial typography with a restrained ivory, coral, lavender, navy, and teal palette.
- Animated mesh-gradient environments, scroll reveals, pointer-reactive lighting, depth-sensitive cards, and a responsive Three.js pearl sculpture with orbiting champagne-metal rings, floating crystal accents, particles, and a soft opalescent halo. The visual upgrade lives in `cinematic-upgrade.css`, loaded after the original stylesheet so the underlying interface and Firebase workflows stay intact.
- A graceful SVG-based hero fallback when WebGL/Three.js is unavailable.
- Reduced-motion support and mobile-specific simplification of expensive visual effects.
- Treatment search, category filtering, sorting, and a treatment comparison view.
- Central public clinic data shared by treatment listings, FAQ answers, the assistant, and service detail pages.
- Firebase-backed content updates, clinic settings, published/unpublished states, appointment records, enquiry records, account appointments, schedule configuration, and admin activity history.
- JSON workspace export/import, confirmation-protected data replacement, and a content-only reset workflow.

## Firebase configuration

The following public web configuration is in `firebase-config.js`. It is public client configuration—not a server credential. Do not add a service account JSON, Admin SDK credential, or private server key to any browser file.

- Firebase project: `yukti-247`
- Realtime Database URL: `https://yukti-247-default-rtdb.firebaseio.com`
- Authentication domain: `yukti-247.firebaseapp.com`

The app uses Firebase's compat SDK from the Firebase CDN and Firebase Realtime Database. In the current implementation, application records and managed content are read from and written to Firebase; the website does not use `localStorage` or `sessionStorage` as its application database. Firebase Authentication uses the SDK's standard local auth persistence when the browser allows it. That is authentication-session persistence, not storage of website content or appointments in `localStorage` by the app.

### Required Firebase setup

1. Open Firebase Console for `yukti-247`.
2. In **Authentication → Sign-in method**, enable **Email/Password** and **Anonymous** sign-in. Anonymous sign-in is used for public guest appointment requests and enquiries; registration uses Email/Password.
3. In **Authentication → Settings → Authorized domains**, include `localhost` during local testing and the actual production hosting domain.
4. Open **Realtime Database** and confirm the database URL matches the configuration above.
5. Review and publish the rules in `database.rules.json`. The default project rules may not match these application paths; deploy the supplied rules before testing writes.
6. Create an authorized staff account using Firebase Authentication's email/password provider.
7. Copy that user's UID. In Realtime Database, create `clinic/roles/<STAFF_UID>` with data equivalent to:

   ```json
   {
     "admin": true,
     "role": "admin"
   }
   ```

   This role assignment must be made by the Firebase project owner or another trusted administrator. Ordinary client users cannot grant themselves staff roles.
8. Sign in through `#/admin/login`. The first authorized admin sign-in initializes starter content only when the workspace is missing. Replace the starter content with verified clinic information before publishing.

### Deploy with Firebase CLI

Install the Firebase CLI, sign in, and deploy from the project root:

```bash
npm install -g firebase-tools
firebase login
firebase use yukti-247
firebase deploy --only hosting,database
```

The included `firebase.json` configures Hosting and deploys the supplied Realtime Database rules. Review the target project and database rules before running the deploy command.

## Data paths at a glance

- `clinic/publicData` — Published public content and the public schedule/settings subset
- `clinic/adminWorkspace` — Staff-managed content and configuration
- `clinic/appointmentQueue` — Appointment request queue for staff
- `clinic/userAppointments/<uid>` — Appointment records associated with an authenticated user
- `clinic/slotLocks/<date>/<time>` — Shared appointment-slot lock records
- `clinic/enquiries` — Contact enquiries for authorized staff
- `clinic/users/<uid>` — Minimal account profile data
- `clinic/roles/<uid>` — Role assignment, set by a trusted administrator

## Assistant behavior

The included assistant is a **local rule-based virtual assistant**, not a generative model. It normalizes user questions, identifies common intents, reads the published treatment/FAQ/clinic data, and offers relevant navigation or booking actions. No OpenAI/Gemini/Claude API is called and no AI API key is required. It must not diagnose or prescribe; unknown clinical questions should be directed to a qualified dental professional.

## What is and is not connected

Connected in the client code:

- Firebase Authentication sign-in, registration, password-reset request, and sign-out.
- Firebase Realtime Database access through the supplied adapter and rules.
- Public content reads and admin content writes.
- Appointment request and enquiry records.
- Account-linked appointment views and status workflows.
- Shared slot-lock checking at request submission.
- Admin workspace settings, content publishing, and data import/export.

Not connected in this project:

- Generative AI model or external AI service.
- Email/SMS/WhatsApp Business message delivery.
- An external clinical scheduling platform or calendar.
- A live map API.
- Firebase Storage uploads; the current content editor expects configured asset URLs/references rather than implementing an upload flow.
- Server-side Cloud Functions for authoritative scheduling and other privileged operations.

Firebase SDK 13.1.0 and Three.js 0.186.1 are currently loaded from their respective public CDNs. The Three.js library is imported as an ES module from jsDelivr. If that CDN is unavailable, the hero should fall back to the accessible inline illustration; all core navigation and data workflows should remain usable.

## Production-readiness and security notice

This is a functional frontend connected to Firebase, but it is **not yet a complete production healthcare information system**. Do not enter sensitive clinical notes, medical records, or real patient data until the clinic has reviewed the security rules, privacy basis, retention, operational processes, and applicable legal obligations.

In particular:

- Client-side Realtime Database rules are a necessary access-control layer, but they are not a substitute for a trusted server-side booking transaction. Before using live appointments, move scheduling validation and slot reservation into a Cloud Function or other trusted backend, with authoritative checks for dentist availability, opening hours, duration, time overlap, blocked dates, and concurrent requests.
- The current slot-lock path is readable by website clients to help show unavailable slots. Its records include a pseudonymous Firebase UID and timestamp. Before production, replace this client-visible structure with a server-mediated availability function or a design that does not expose lock ownership metadata.
- The app does not send staff notifications, email confirmations, SMS, or WhatsApp messages. A booking record means only that Firebase accepted a request; staff must confirm it according to clinic procedures.
- Enable Firebase App Check and apply appropriate API-key restrictions, abuse prevention, retention rules, backups, and monitoring before a public production launch.
- Test the rules in Firebase's Rules Playground or Emulator Suite using anonymous visitors, regular patients, and authorized staff accounts. In particular, verify that users can only read their own appointment records and cannot self-assign roles or alter another person's records.
- Configure a real privacy notice, terms, clinic details, consent procedures, and a data-retention policy before inviting patients to submit personal information.
- Public Firebase web configuration is expected in a browser app; **never publish Firebase Admin SDK/service-account credentials**.

See `DEPLOYMENT.md` for the launch checklist.
