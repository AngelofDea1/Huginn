#  WC Companion Bot

> A WhatsApp bot that turns any group chat into a live World Cup studio.
> Powered by TxLINE real-time data + Claude AI commentary.

---

## What It Does

Add the bot to any WhatsApp group. Type `/follow Nigeria`. From that point:

-  **30 mins before kickoff** - pre-match bulletin with odds and storylines
-  **Every goal** - instant alert with scorer, score, odds reaction, AI commentary
-  **Red cards** - alert with match impact analysis
-  **Half time** - automated summary of first half
-  **Full time** - match wrap-up with story of the game
-  **Big odds shifts** - alerts when the market moves significantly

Choose your commentary vibe:  Hype /  Tactical /  Funny /  Balanced

---

## Setup

### 1. Clone and install
```bash
git clone <your-repo>
cd wc-companion-bot
npm install
cp .env.example .env
```

### 2. Get your API keys

**TxLINE:**
- Sign up at https://txline.txodds.com
- Get your API key from the dashboard
- Add to `.env` as `TXLINE_API_KEY`

**Anthropic (Claude):**
- Sign up at https://console.anthropic.com
- Create an API key
- Add to `.env` as `ANTHROPIC_API_KEY`

**WhatsApp / Meta:**
1. Go to https://developers.facebook.com
2. Create an App -> Business type
3. Add WhatsApp product
4. Get your `Phone Number ID` and `Access Token` from the API Setup page
5. Add to `.env`

### 3. Expose your webhook (local dev)

Meta needs to reach your server. Use ngrok:
```bash
npx ngrok http 3000
```
Copy the HTTPS URL (e.g. `https://abc123.ngrok.io`)

In Meta Developer Console:
- WhatsApp -> Configuration -> Webhook
- URL: `https://abc123.ngrok.io/webhook`
- Verify Token: whatever you set in `.env` as `WHATSAPP_VERIFY_TOKEN`
- Subscribe to: `messages`

### 4. Run
```bash
npm run dev
```

### 5. Test it

Send your bot's WhatsApp number a message: `hi`
It should reply with the help menu.

Then try: `/follow Brazil`

---

## Project Structure

```
src/
 index.js              # Entry point, Express server, cron jobs
 handlers/
    webhook.js        # WhatsApp webhook + command routing
 services/
    txline.js         # TxLINE API calls
    ai.js             # Claude AI message generation + personalities
    whatsapp.js       # WhatsApp message sender
    matchPoller.js    # Core polling logic (runs every 30s)
    scheduler.js      # Pre-match bulletin scheduler
 utils/
     store.js           # In-memory state (groups, match state)
     logger.js          # Coloured console logger
```

---

## Commands

| Command | Description |
|---------|-------------|
| `/follow <team>` | Follow a match (e.g. `/follow Nigeria`) |
| `/unfollow <team>` | Stop following a match |
| `/vibe hype` |  African pundit energy |
| `/vibe tactical` |  Calm analyst mode |
| `/vibe funny` |  Banter and roasts |
| `/vibe balanced` |  Friendly match coverage |
| `/status` | See what you're following |
| `/help` | Show all commands |

---

## Deployment (Railway)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Set your environment variables in the Railway dashboard.
Update your Meta webhook URL to your Railway URL.

---

## TxLINE Endpoints Used

- `GET /worldcup/live` - All live matches
- `GET /worldcup/schedule` - Upcoming matches
- `GET /worldcup/match/:id` - Match detail + events
- `GET /worldcup/match/:id/odds` - Live odds
- Full docs: https://txline.txodds.com/documentation/worldcup

---

## Hackathon Notes

- Built for TxODDS World Cup Hackathon on Superteam Earn
- Track: Consumer & Fan Experiences
- Data: TxLINE real-time World Cup feeds
- AI: Claude claude-sonnet-4-6 for commentary generation
- No blockchain required for this track
