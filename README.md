# Document Q&A — AI-Powered PDF Question Answering App

A full-stack web application that lets users upload a PDF document and ask
questions about its content. Answers are generated strictly from the
uploaded document — the AI is explicitly instructed not to use outside
knowledge, and returns a fixed fallback message when an answer isn't
present in the document.

---

## 1. Project Setup Instructions

The project has two parts that must run at the same time: a **frontend**
(React + Vite) and a **backend** (Node.js + Express).

### Prerequisites
- Node.js v18 or higher
- A free Groq API key from [console.groq.com](https://console.groq.com)

### Backend setup

```bash
cd ai-docqa-backend
npm install
```

Create a `.env` file in `ai-docqa-backend/` with:
