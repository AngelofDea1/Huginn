# Huginn: AI Pundit Bot & World Cup Lobby

> A WhatsApp bot and Web PWA that turns any group chat into a live World Cup studio.
> Powered by TxLINE real-time data + Groq AI commentary.

---

## 1. Core Idea & Business Highlights

**Core Idea:**
Huginn is a dual-interface fan experience consisting of an autonomous AI WhatsApp bot and a synchronized Web PWA dashboard. Fans can add Huginn to their WhatsApp groups and "follow" teams. When events occur (goals, cards, halves), Huginn receives real-time telemetry from TxLINE, passes the raw data to a Groq-powered LLM, and broadcasts customized, personality-driven AI commentary to the chat.

**Business & Technical Highlights:**
- **Zero-Friction Onboarding:** Fans engage natively inside WhatsApp, a platform they already use, with zero app downloads required.
- **Personality Customization:** Users can set the bot's "vibe" (Hype, Tactical, Funny, Balanced) dynamically altering the LLM prompt.
- **PWA Dashboard & Web Push:** A real-time web dashboard mirrors the WhatsApp experience, providing live scoreboards and Web Push notifications for desktop/browser users.
- **Stateless & Scalable:** State is managed via Upstash Redis, allowing the Node.js server to run on stateless, serverless infrastructure.
- **Real-Time Responsiveness:** Utilizes TxLINE's high-speed SSE streaming and snapshot endpoints to ensure sub-second reaction times to match events.

---

## 2. TxLINE Endpoints Used

Huginn leverages the following TxLINE API endpoints to drive its logic:

- `POST https://txline.txodds.com/auth/guest/start`: Generates the guest JWT token required for authentication.
- `GET https://txline.txodds.com/api/scores/stream` (SSE): Listens for real-time match events to instantly trigger AI commentary without polling.
- `GET https://txline.txodds.com/api/fixtures/snapshot`: Fetches the live and upcoming schedule to populate the web dashboard and `/schedule` commands.
- `GET https://txline.txodds.com/api/scores/snapshot/{matchId}`: Retrieves deep match event history and current phase data for generating half-time and full-time summaries.

---

## 3. Feedback: TxLINE API Experience

*(Fill in your personal feedback here before submitting!)*
- **What worked well:** The SSE stream was incredibly fast, making real-time push notifications highly responsive. The normalized JSON schema made parsing events straightforward.
- **Friction points:** *(Add any friction points you encountered)*

---

## 4. Setup & Local Development

### Prerequisites
- Node.js (v18+)
- Upstash Redis database
- Groq API Key
- TxLINE API credentials

### Installation
```bash
git clone <repo>
cd huginn
npm install
cp .env.example .env
# Fill in your .env variables (TXLINE_API_KEY, GROQ_API_KEY, UPSTASH_REDIS_REST_URL, etc.)
```

### Running the App
```bash
# Start the backend and Next.js frontend
npm run dev
```

### Linking WhatsApp
Visit `http://localhost:3000/qr` to scan the QR code and link the WhatsApp bot to your number.

---

## 5. Application Access

*(Insert your deployed application link here)*
- **Live PWA:** [Link]
- **WhatsApp Bot:** [Link/Number]

---

## 6. Demo Video

*(Insert your Loom/YouTube link here)*
- **Watch the Demo:** [Link]
