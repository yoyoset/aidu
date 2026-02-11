# AIDU AI-First System Manifest (v4.14.4)

This document is the **Source of Truth** for AI agents. It describes the runtime architecture, communication protocols, and core logic of AIDU.

## 1. Runtime Architecture

AIDU is a Chrome Extension built with Vite + CRXJS.

### 1.1 Context Breakdown

- **Service Worker (Background)**:
  - **PipelineManager**: Orchestrates multi-chunk LLM analysis.
  - **DraftProcessor**: Handles persistence and state transitions.
  - **SyncService**: Manages conflict-free cloud synchronization.
- **Sidepanel (Frontend)**:
  - **Dashboard**: Article and vocabulary management.
  - **Reader**: Interactive immersive reading engine.
- **Offscreen (TTS)**: (When applicable) handles sustained audio synthesis.

### 1.2 Communication Protocol

- Message passing is managed by `MessageRouter.js`.
- Key Message Types:
  - `REQUEST_ANALYSIS`: Triggers the LLM pipeline.
  - `CREATE_DRAFT`: Atomic initialization of article data.
  - `UPDATE_DRAFT`: Incremental/Partial sync between Sidepanel and Background.

## 2. Core Logic Machines

### 2.1 The Analysis Pipeline

1. **Ingestion**: User selects text or provides URL.
2. **Chunking**: Raw text is split into ~3000 token chunks.
3. **LLM Dispatch**: Parallel/Sequential requests for segmentation and analysis.
4. **JSON Repair**: `JsonCleaner` handles stream truncation and malformed JSON.
5. **Assembly**: `PipelineManager` merges results into the `DRAFT_SCHEMA`.

### 2.2 Expert Spacing Algorithm (v4.14.4)

To ensure perfect typography with interactive highlights:

- `display: inline` is forced on all segments.
- **Smart Spacing**: Spaces are injected as discrete `<span>` elements only if standard English spacing rules apply (respecting "sticky" punctuation).
- **PV Bridging**: Spaces between Phrasal Verb (PV) members inherit the `.phrasalSpace` class to provide a contiguous visual underline.

### 2.3 SRS (Spaced Repetition) Algorithm

- Uses an enhanced SM-2 logic.
- **Stages**: `learning`, `reviewing`, `mastered`.
- **Factors**: Quality (`0-5`), Interval (`days`), E-Factor (Easiness).

## 3. Storage Infrastructure

Key keys in `chrome.storage.local`:

- `BUILDER_DRAFTS`: Array of `DRAFT_OBJECT`.
- `VOCAB_LIST`: Map/Array of `VOCAB_ENTRY`.
- `USER_SETTINGS`: Global UI/API configuration.

---
**Status**: Stable (v4.14.4)
**Target Agent**: LLM / Coding Assistant
