# AIDU Model Handover Protocol
> **Purpose**: Machine-readable context transfer document for AI agents. NOT for human consumption.
> **Version**: 2026-01-18T00:30:00+08:00
> **Workspace**: `f:/mycode/aidu`

---

## 1. Project Identity

**Name**: AIDU (AI Dictionary Utility)
**Type**: Chrome Extension + PWA Mobile Companion
**Core Value**: AI-powered English reading assistant that acts as a "Private Tutor" for vocabulary acquisition.

**Primary User Flow**:
1. User pastes/opens English article in Extension Sidepanel.
2. AI analyzes text, segments words, provides definitions.
3. User clicks words to save to vocabulary.
4. User reviews vocabulary via SRS flashcards (on Mobile or Extension).
5. Data syncs between devices via Cloudflare Worker or GitHub Gist.

---

## 2. Architecture Overview

### 2.1 Extension Structure (`src/`)
```
src/
├── background/           # Service Worker (Chrome MV3)
│   ├── service_worker.js # Entry point, message routing
│   ├── pipeline_manager.js # AI analysis orchestration
│   └── llm/              # LLM adapters (DeepSeek, Gemini, OpenAI)
├── sidepanel/            # Main UI (Vite-bundled)
│   ├── index.html        # Entry HTML
│   ├── index.js          # App bootstrap
│   ├── features/         # Feature modules
│   │   ├── reader/       # Article reading & word popover
│   │   ├── vocab/        # Vocabulary list management
│   │   ├── builder/      # Article preparation workspace
│   │   └── settings/     # Configuration modal
│   └── components/       # Reusable UI components
├── services/             # Shared services
│   ├── vocab_service.js  # Vocabulary CRUD, profile-aware
│   ├── sync_service.js   # Cloud sync (Gist / Custom Endpoint)
│   └── data_service.js   # Backup/restore utility
└── utils/                # Helpers (storage, message routing)
```

### 2.2 Mobile PWA (`mobile/`)
```
mobile/
├── index.html     # Single-page app
├── app.js         # All logic (SRS, Sync, Flashcard)
├── style.css      # Styling
└── manifest.json  # PWA manifest
```

### 2.3 Backend (`worker/`)
```
worker/
└── index.js       # Cloudflare Worker for sync (KV storage)
```

### 2.4 Key Storage Keys (chrome.storage.local)
| Key | Description |
|-----|-------------|
| `vocab_{profileId}` | Vocabulary data for a profile |
| `drafts` | Saved article drafts |
| `settings` | User settings (profiles, AI config, sync config) |

### 2.5 Mobile LocalStorage Keys
| Key | Description |
|-----|-------------|
| `aidu_settings` | URL, Token, Profile |
| `aidu_vocab_{profileId}` | Vocabulary data per profile |

---

## 3. Current State (as of 2026-01-18)

### 3.1 Implemented Features ✅
- [x] Multi-profile support (Extension & Mobile)
- [x] Profile-aware cloud sync (Gist & Custom Endpoint)
- [x] Mobile PWA flashcard review with SRS
- [x] Mobile bi-directional sync (Pull & Push)
- [x] Magic Link auto-configuration for Mobile
- [x] TTS (Text-to-Speech) on both platforms
- [x] Master/Mastered word tracking
- [x] Real-time highlight refresh when vocab changes

### 3.2 Known Issues / Pending ⚠️
- [ ] **AI Private Tutor Prompts**: `teacher_persona_prompts.md` drafted but NOT integrated into code.
- [ ] **Explain Sentence Button**: Planned but not implemented.
- [ ] **Lesson Prep Sidebar**: Planned but not implemented.

### 3.3 Recent Fixes (This Session)
- Fixed `ReferenceError: onStatusChange is not defined` in `reader_dictionary.js`.
- Fixed Settings Modal crash (missing `#sync-custom-settings` div).
- Fixed Mobile dual-view display (removed inline `display: flex`).
- Added Magic Link button in Extension Settings.

---

## 4. Coding Standards

### 4.1 JavaScript
- ES Modules (`import`/`export`).
- Async/await for all async operations.
- `StorageHelper` for chrome.storage access.
- `vocabService` is the single source of truth for vocabulary.

### 4.2 CSS
- CSS Modules for Extension (`*.module.css`).
- Vanilla CSS for Mobile.
- Use CSS variables (`:root`) for theming.

### 4.3 HTML
- Avoid inline `display:` styles that conflict with class-based visibility toggles.
- Use semantic IDs for JS bindings.

### 4.4 Build & Deploy
| Command | Action |
|---------|--------|
| `npm run build` | Build Extension (Vite -> `dist/`) |
| `npm run deploy:frontend` | Deploy Mobile PWA to Cloudflare Pages |
| `npm run deploy:backend` | Deploy Worker to Cloudflare Workers |

---

## 5. Critical Invariants (NEVER VIOLATE)

1. **Profile Isolation**: Vocabulary data MUST be stored under `vocab_{profileId}` keys. Never mix profiles.
2. **Sync Timestamp Priority**: When merging, `updatedAt` timestamp wins. Never overwrite newer data with older.
3. **View Visibility**: `.view` elements use CSS class `.active` for visibility. Never use inline `display:` that overrides this.
4. **API Key Security**: Never log API keys. Magic Link uses `btoa()` encoding (NOT encryption) - acceptable for convenience, not security.
5. **Build Before Test**: Extension changes require `npm run build` before reload.

---

## 6. Execution Context

### 6.1 Environment
- **OS**: Windows
- **Shell**: PowerShell
- **Node**: Required for npm scripts
- **Wrangler**: Cloudflare CLI for deployments

### 6.2 Extension Reload
After `npm run build`, user must manually reload extension in `chrome://extensions`.

### 6.3 Mobile Testing
Access `https://aidu-mobile.pages.dev` on phone. Cache may require hard refresh.

---

## 7. Active Roadmap (Commercial)

See `commercial_roadmap.md` for strategic vision.

**Phase 1 (Current Focus)**: No-Config Experience
- Magic Link ✅
- Profile Sync ✅
- Next: AI Proxy Server (managed API keys)

**Phase 2**: AI Private Tutor
- Lesson Prep Mode
- Explain Sentence Mode
- Word Nuance Mode

**Phase 3**: Engagement & Data Moat
- Daily Read content hooks
- Personalized AI articles

---

## 8. File Quick Reference

| Purpose | File Path |
|---------|-----------|
| Vocab Service | `src/services/vocab_service.js` |
| Sync Service | `src/services/sync_service.js` |
| Settings Modal | `src/sidepanel/features/settings/settings_modal.js` |
| Reader Dictionary | `src/sidepanel/features/reader/reader_dictionary.js` |
| Mobile App Logic | `mobile/app.js` |
| Cloudflare Worker | `worker/index.js` |
| Teacher Prompts | `brain/.../teacher_persona_prompts.md` |
| Commercial Roadmap | `brain/.../commercial_roadmap.md` |
| Magic Link Plan | `brain/.../mobile_magic_link_plan.md` |

---

## 9. Handover Checklist

When resuming work, the next agent MUST:
1. Read this document first.
2. Check `task.md` for current checklist state.
3. Run `npm run build` if touching Extension code.
4. Run `npm run deploy:frontend` if touching Mobile code.
5. Never assume inline styles are safe - check for CSS class conflicts.
6. Preserve profile isolation in all storage operations.

---

## 10. Gap Analysis (Self-Diagnosis)

### 10.1 Logic Gaps Identified
| Gap | Risk Level | Mitigation |
|-----|------------|------------|
| Magic Link is Base64, not encrypted | LOW | Acceptable for convenience; user controls their own token |
| Mobile has no offline queue for failed pushes | MEDIUM | If push fails, data exists locally but may not reach server |
| Extension `vocabService` uses `currentProfileId` which is set at init | LOW | Profile switch triggers reload, so always fresh |
| Worker has no rate limiting | MEDIUM | Malicious actor could spam KV writes if token leaks |

### 10.2 Missing Error Handlers
| Location | Issue | Recommended Fix |
|----------|-------|-----------------|
| `mobile/app.js` `sync()` | No retry on network failure | Add exponential backoff or manual retry button |
| `settings_modal.js` `exportMobileBtn` | `btoa()` fails on non-ASCII | Pre-validate or use `encodeURIComponent` before encoding |
| `worker/index.js` | No validation of incoming JSON structure | Add schema check before KV write |

### 10.3 Untested Edge Cases
- [ ] What happens if user has 10,000+ vocabulary items? (KV size limit, JSON parse time)
- [ ] What if two devices push simultaneously? (Last-write-wins, potential data loss)
- [ ] What if `profile` query param contains special characters?

---

## 11. Data Schema Reference

### 11.1 Vocabulary Entry (Single Word)
```json
{
  "word": "apprehensive",
  "lemma": "apprehensive",
  "phonetic": "/ˌæprɪˈhensɪv/",
  "meaning": "anxious or fearful that something bad will happen",
  "definitions": [...],
  "context": { "original": "She was apprehensive about the interview." },
  "stage": "learning" | "review" | "mastered",
  "addedAt": 1705500000000,
  "updatedAt": 1705500000000,
  "nextReview": 1705600000000,
  "interval": 1,
  "easeFactor": 2.5,
  "reviews": 3
}
```

### 11.2 Sync Payload (POST to Worker)
```json
{
  "vocab": { "<lemma>": { ...entry }, ... },
  "meta": {
    "timestamp": 1705500000000,
    "device": "mobile" | "extension",
    "profile": "default"
  }
}
```

### 11.3 Settings Object (Extension)
```json
{
  "activeProfileId": "default",
  "profiles": {
    "default": {
      "name": "General Profile",
      "provider": "deepseek",
      "baseUrl": "...",
      "model": "deepseek-chat",
      "apiKey": "sk-...",
      "realtimeMode": "2",
      "builderMode": "3"
    }
  },
  "sync": {
    "provider": "gist" | "custom",
    "githubToken": "ghp_...",
    "gistId": "...",
    "customUrl": "https://...",
    "customToken": "..."
  }
}
```

---

## 12. Danger Zones (High-Risk Code Areas)

> [!CAUTION]
> Modifying these areas requires extra care. Bugs here cause data loss or broken sync.

| File | Function/Area | Risk |
|------|---------------|------|
| `vocab_service.js` | `add()`, `remove()`, `setProfile()` | Data loss if key mismatch |
| `sync_service.js` | `_mergeVocab()` | Conflict resolution, timestamp logic |
| `worker/index.js` | KV key construction | Profile data collision |
| `mobile/app.js` | `Store.getVocab()`, `Store.saveVocab()` | Profile isolation |
| `settings_modal.js` | HTML template string in `render()` | Easy to break nesting, cause null errors |

---

## 13. Communication Protocol (Agent-to-Agent)

If the next agent encounters an ambiguous situation:
1. **Default to safety**: Don't overwrite, don't delete.
2. **Log decisions**: Use `console.log` or comments to document non-obvious choices.
3. **Ask user if blocked**: Don't guess on business logic (e.g., "should 'mastered' words sync?").
4. **Update this document**: After major changes, add to Section 3.3 (Recent Fixes).

---

*End of Handover Protocol*

