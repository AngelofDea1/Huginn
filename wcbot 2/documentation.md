# Huginn Project Blueprint & Reference Manual
Use this file to train any AI model on how to maintain, style, or expand the Huginn WhatsApp companion ecosystem.

---

## 1. Project Directory Structure
```
/
├── Dockerfile                  # Container deployment instructions
├── package.json                # Project dependencies (Express, Baileys, web-push, etc.)
├── public/                     # Public web assets
│   ├── index.html              # Main Landing Page (three-device mockup setup)
│   ├── demo.html               # Live browser chat demonstration
│   ├── manifest.json           # PWA metadata configuration
│   ├── css/
│   │   ├── shared.css          # Design system variables & base elements
│   │   └── pill-nav.css        # Pill menu navigation style definitions
│   └── js/
│       └── pill-nav.js         # Injected header nav rendering & raven logo logic
└── src/
    ├── index.js                # Core Express API router, static paths, & session export
    ├── handlers/
    │   ├── chat.js             # Handles browser mock chat messaging API
    │   ├── sweepstake.js       # Manages tournament sweepstake tracking
    │   └── webhook.js          # Direct WhatsApp command routing & user actions
    ├── services/
    │   ├── ai.js               # Gemini LLM connection, systems, & formatting rules
    │   ├── matchPoller.js      # Runs interval match telemetry polling loop (30s)
    │   ├── pushNotify.js       # PWA Web Push notification broker
    │   ├── scheduler.js        # Configures upcoming fixture alerts & briefings
    │   ├── txline.js           # API Client for TxLINE live football telemetry feeds
    │   └── whatsapp.js         # Baileys WhatsApp client link & state loop
    └── utils/
        └── logger.js           # Shared app logging utilities
```

---

## 2. Core Style Guide & Design Variables (`public/css/shared.css`)
Make sure any additions or layout edits use these CSS variables to preserve consistency:

*   `--deep`: `#080810` (Dark background)
*   `--surface`: `#111118` (Primary card wrappers)
*   `--card`: `#131320` (Elevated components)
*   `--border`: `rgba(255, 255, 255, 0.07)` (Sleek layout lines)
*   `--green`: `#00e676` (Electric neon highlight)
*   `--green-glow`: `rgba(0, 230, 118, 0.08)` (Transparent backlighting)
*   `--text`: `#f0f0f5` (Bright text)
*   `--muted`: `#7070a0` (Low-contrast grey)
*   `--wa`: `#25D366` (Official WhatsApp Green brand tint)

---

## 3. Baileys WhatsApp Client (`src/services/whatsapp.js`)
*   **Purpose:** Configures Baileys library connection, tracks session registration status, and fires updates.
*   **QR Scanner Page (`/qr`):** Serves QR canvas to browsers using dynamic long-polling so sessions link without manual terminal access.
*   **Number Obfuscation:** The WhatsApp target phone number is handled dynamically via `process.env.WA_NUMBER` and redirected through the `/api/join` endpoint to prevent scrapers from seeing it.

---

## 4. Polling & Telemetry Processing (`src/services/matchPoller.js`)
*   **Mechanism:** Runs a `setInterval` loop fetching match parameters every 30 seconds via `txline.js`.
*   **State Diffs:** Compares live telemetry records (goals, red cards, key cards, penalty updates, kickoff/halftime milestones).
*   **AI generation:** When a diff triggers:
    1.  Resolves event payload.
    2.  Sends statistics to `ai.js` for tactical analysis.
    3.  Pushes the resulting analysis directly into all registered WhatsApp group chats following that fixture.

---

## 5. Conversational AI System Rules (`src/services/ai.js`)
To prevent the bot from sending poorly structured or uncapitalized messages, the AI model has strict rules:
1.  **Sentence Case Enforcement:** Proper capitalization on all words (e.g. capitalize "I", starting letters).
2.  **Paragraph Spacing:** Always insert empty double newlines (`\n\n`) between distinct analytical observations to keep text readable on small phone screens.
3.  **Content Focus:** Avoid corporate pitch text or overly technical jargon. Explain the tactical meaning of goals, red cards, or odds swings in a clear, insightful manner.
