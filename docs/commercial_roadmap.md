# AIDU Commercialization Roadmap: "Your Portable AI Private Tutor"

> **Executive Summary**: 
> AIDU is not just a dictionary or a flashcard app; it is a **1-on-1 AI Private English Tutor**. 
> Traditional apps give you definitions; AIDU gives you **Lessons**. It treats every article like a textbook chapter, "preparing the lesson" (备课) for you by breaking down complex sentences, explaining cultural context, and ensuring you understand *why* a word is used, not just *what* it means.
> Our commercial goal is to put this top-tier teacher in every user's pocket, removing all technical barriers to entry.

---

## Phase 1: MVP Monetization (The "Pro" Service)
**Goal**: Remove technical friction so users can focus on the *Learning Experience*.

### 1.1 The "No-Config" Experience
*   **Current Friction**: User must act as a developer (API Keys, Config).
*   **Target State**:
    *   User downloads Extension.
    *   Clicks "Log in with Apple/Google".
    *   **Immediate Utility**: The "AI Teacher" is ready. No setup.
*   **Business Model**: Freemium.
    *   **Free**: BYOK (Geek Mode).
    *   **Pro ($9.9/mo)**: "Hired Tutor" Mode. managed AI quota, official Sync.

### 1.2 The "AI Lesson" (Core Differentiation)
*   **Concept**: "Article as a Lesson" (文章即课程).
*   **Feature**: When a user opens an article, the AI doesn't just translate. It:
    *   **Pre-reads**: Identifies难点 (pain points) and idioms.
    *   **Annotates**: Adds "Teacher's Notes" to the sidebar.
    *   **Explains**: When asked, it explains grammar logic like a human teacher ("Here, 'running' is a gerund acting as the subject...").

### 1.2 Technical Requirements (Infrastructure)
*   **User System**: Centralized Auth (Supabase / Firebase / Auth0).
    *   *Why*: One account links Extension + Mobile PWA.
*   **AI Proxy Server**: A middle-layer API gateway.
    *   *Function*: Holds the "Master Keys" (DeepSeek/OpenAI Enterprise). Receives user requests, verifies Pro subscription, forwards to AI.
    *   *Benefit*: Users never see or touch an API Key.
*   **Official Sync Store**: Managed Database (Postgres/DynamoDB).
    *   *Function*: Replaces Gist/KV. Stores user vocab & history reliably.

---

## Phase 2: Engagement & Retention (Mobile First)
**Goal**: Transform AIDU from a "Review Tool" (painful) to a "Content Platform" (enjoyable). Increase DAU (Daily Active Users).

### 2.1 The "Daily Read" (Content Hook)
*   **Problem**: Users only open AIDU if they *already* found an English article to read. If they don't browse specific sites, they don't use AIDU.
*   **Solution**: **Push Content to User**.
    *   **Daily AI News**: AI curates 3 trending tech/news articles, simplifies them to CEFR B1/B2 level, pushes to Mobile App.
    *   **"Read to Earn"**: Read the daily article to keep the "Streak" alive.

### 2.2 Premium Sensory Experience
*   **TTS Upgrade**: Replace browser robotic voices with **Neural TTS** (OpenAI Audio / Azure Speech).
    *   *Commercial Value*: High-quality audio is a strong paid feature differentiator.
*   **Mobile App Polish**:
    *   Migrate PWA to Native Wrapper (Capacitor/React Native) for App Store presence.
    *   Lock screen widgets (Word of the Day).

---

## Phase 3: The Data Moat (Personalized Learning)
**Goal**: Build features that no competitor can copy because they rely on the user's unique history.

### 3.1 Adaptive Content Engine
*   **Concept**: We know exactly which 5,000 words the user knows.
*   **Feature**: "The Perfect Article".
    *   AI generates specific articles that are 90% known words + 10% target new words (Comprehensible Input).
    *   *Value*: Efficiency. Every sentence reinforces memory or teaches something new. No wasted reading.

---

## Summary of Next Steps
1.  **Backend Design**: Design the Schema for the centralized User/Sync database.
2.  **Auth Prototype**: Implement a simple "Login" prototype in the Extension to replace the `settings.json` approach.
3.  **Proxy Service**: Set up a simple Cloudflare Worker gateway that validates a custom token and proxies to DeepSeek.
