# Huginn: AI Pundit Bot & World Cup Companion

> A WhatsApp bot and Live Web Dashboard that turns any group chat into a live World Cup studio.
> Powered by TxLINE real-time data, Groq AI commentary, and ElevenLabs TTS Voice Notes.

---

## 1. Core Idea & Business Highlights

**Core Idea:**
Huginn is a dual-interface fan experience consisting of an autonomous AI WhatsApp bot and a synchronized live web dashboard. Fans can add Huginn to their WhatsApp groups and "follow" teams. When events occur (goals, cards, odds shifts), Huginn receives real-time telemetry from TxLINE, passes the raw data to a Groq-powered LLM, and broadcasts customized, personality-driven AI commentary—along with incredibly realistic Voice Notes—directly into the chat.

**Business & Technical Highlights:**
- **Zero-Friction Onboarding:** Fans engage natively inside WhatsApp, a platform they already use, with zero app downloads required.
- **Personality Customization:** Users can set the bot's "vibe" (Hype, Tactical, Funny, Balanced) via `/style`, dynamically altering the LLM prompt.
- **ElevenLabs Voice Notes:** AI commentary is converted to high-fidelity audio via ElevenLabs and sent natively as playable audio files within WhatsApp.
- **Real-Time Market Tracking:** Huginn simultaneously streams the `/odds/snapshot` endpoints, comparing market lines and triggering alerts when sudden win-probability shifts occur.
- **Zero-Latency Data Pipeline:** Utilizes TxLINE's high-speed SSE streaming rather than REST polling to ensure sub-second reaction times to match events.

---

## 2. TxLINE Endpoints Used

Huginn leverages the following TxLINE API endpoints to drive its logic:

- `POST https://txline.txodds.com/auth/guest/start`: Generates the guest JWT token required for authentication.
- `GET https://txline.txodds.com/api/scores/stream` (SSE): Listens for real-time match events to instantly trigger AI commentary without polling.
- `GET https://txline.txodds.com/api/odds/stream` (SSE): Monitors real-time market shifts for predictive alerts.
- `GET https://txline.txodds.com/api/fixtures/snapshot`: Fetches the live and upcoming schedule to populate the web dashboard and `/schedule` commands.
- `GET https://txline.txodds.com/api/scores/snapshot/{matchId}`: Retrieves deep match event history and current phase data for generating half-time and full-time summaries.

---

## 3. Setup & Local Development

### Prerequisites
- Node.js (v18+)
- Groq API Key (`GROQ_API_KEY`)
- TxLINE API credentials (`TXLINE_API_KEY`)
- ElevenLabs API Key (`ELEVENLABS_API_KEY`) - *Optional, for voice notes*

### Installation
```bash
git clone https://github.com/AngelofDea1/Huginn.git
cd Huginn/wcbot\ 2
npm install
```

### Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
TXLINE_API_KEY=your_txline_key
GROQ_API_KEY=your_groq_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

### Running the App
```bash
npm start
```

### Linking WhatsApp
Once the server starts, a QR code will be generated in your terminal and available at `http://localhost:3000/qr`. Scan this with your WhatsApp mobile app (Linked Devices) to authorize the bot.

---

## 4. Commands

- `/follow [team]` - Start receiving live alerts for a team's match.
- `/unfollow [team]` - Stop receiving alerts.
- `/live` - View current live matches and scores.
- `/schedule` - View upcoming fixtures.
- `/style [hype|tactical|banter]` - Change the AI's personality.
- `/predict [team]` - Lock in your prediction for a live match.
- `/stats [player]` - Get historical data and context for a specific player.
- `/voice [on|off]` - Toggle ElevenLabs voice note generation for match alerts.
