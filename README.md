# 🌸 Mandala Messaging

### _Reducing texting anxiety, one message at a time._

---

## 🧘 Overview

**Mandala Messaging** is a local AI-powered messaging app designed to help users **reduce texting anxiety**, **improve communication**, and **promote mental well-being**.  

Built around your **iMessage** data, Mandala Messaging lets you send and receive messages while analyzing your conversation patterns in real time. It identifies positive and negative communication trends, suggests thoughtful next messages, and recommends healthy digital habits — all with **privacy-first**, **local processing**.

---

## 💡 Inspiration

Everyone has felt it — the flood of notifications, the guilt of missed replies, or the anxiety of forgetting something important.  
Our team at **Hack Princeton** wanted to create a digital space that helps people **feel better about how they communicate**, not worse.  

Mandala Messaging brings mindfulness to messaging — offering insight, encouragement, and gentle nudges toward balance.

---

## 🚀 Features

- 💬 **iMessage Integration:**  
  Wraps around your Mac’s iMessage system to send and receive messages directly.

- 🧠 **Conversation Analysis:**  
  Built-in AI analyzes each conversation for **positivity**, **tone**, and **emotional patterns** — offering actionable feedback to improve your interactions.

- 🪷 **Mindful Communication Suggestions:**  
  Receive real-time suggestions for messages and habits that encourage positive, empathetic communication.

- 🤖 **Action-Oriented AI Agents:**  
  Intelligent agents recommend useful actions such as creating reminders, calendar events, or follow-ups from within your chat interface.

- 🌈 **Behavior & Mental Health Dashboard:**  
  Gain insight into your **messaging behavior**, **emotional well-being**, and progress toward healthier digital interactions.

- 🔐 **Privacy-First Design:**  
  All processing runs locally on your device — no messages ever leave your system.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js (local web app)
- **Database:** SQLite (local message store)
- **Backend:** Python + FastAPI (`dedalus_backend`)
- **AI Integration:** [Gemini API](https://ai.google.dev/) (LLM provider)
- **iMessage Integration:** Photon iMessage-Kit
- **Tool Calling Framework:** dedalus_labs
- **Platform:** macOS with iMessage integration (read/write access)

---

## ⚙️ Installation & Setup

If you’d like to run **Mandala Messaging** locally, follow these steps:

### 1️⃣ Clone the repository

```bash
git clone https://github.com/yourusername/mandala-messaging.git
cd mandala-messaging
```

### 2️⃣ Start the frontend (Next.js app)

```bash
cd hp-app
npm install
```

Create a `.env.local` file in `hp-app` with your **Gemini API key**:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

Then run:

```bash
npm run dev
```

This starts the frontend on `http://localhost:3000`.

### 3️⃣ Start the backend (FastAPI)

Open a new terminal:

```bash
cd dedalus_backend
```

Create a `.env` file with your **Dedalus Labs API key**:

```
DEDALUS_API_KEY=your_dedalus_api_key_here
```

Then run:

```bash
python backend.py
```

Your backend will run locally and expose APIs for message analysis and AI actions.

---

## 🧩 How It Works

1. Mandala Messaging connects to your **local iMessage database** and wraps its interface for direct use.  
2. Conversations are analyzed in real time by the **FastAPI backend** using **Gemini** via `dedalus_labs`.  
3. You receive:
   - Conversation sentiment feedback  
   - Suggested next messages  
   - Agent-driven actions (create reminders, add to calendar, etc.)  
4. A dashboard visualizes your emotional and behavioral trends over time.

---

## 🧠 Example Use Case

> You’re catching up with an old friend and the conversation feels tense.  
> Mandala Messaging detects lower positivity, suggests a warmer message tone, and offers a reminder to follow up later — helping you maintain relationships without stress.

---

## 🏆 Built at Hack Princeton

Created during **Hack Princeton** by a team passionate about **AI, mental health, and communication balance**.  
Mandala Messaging is more than a messaging app — it’s a mindful digital companion.

---

## 💖 Contributors

- AJ Jiang([@AJCubed](https://github.com/AJCubed))
- David Zaha ([@dgzct11](https://github.com/dgzct11))


---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

## ✨ Acknowledgments

- **Hack Princeton** organizers & mentors  
- **Dedalus Labs** for tool-calling APIs  
- **Google Gemini** for LLM integration  
- **Open-source contributors** and the mental health tech community  

---

> _“Peace is not in avoiding messages — it’s in finding balance within them.”_
