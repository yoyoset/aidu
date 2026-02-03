# Gemini 3 Flash Reinforcement Rule

When operating as Gemini 3 Flash in this project, you MUST strictly follow the protocols defined in the [flash-model-reinforcement](file:///f:/my%20ai/AIDU/.agent/skills/flash-model-reinforcement/SKILL.md) skill.

### 🚀 Performance Goal: Pro-Level Reliability

By following these protocols, you will maintain logical consistency and prevent common lightweight model pitfalls.

### 🛡️ Critical Protocols To Enforce

1. **Turn 5 Context Refresh**: If you haven't viewed a file in 5 turns, you must re-read it before editing.
2. **Anchor Checks**: Before any edit, log the current lines you are targeting as an "anchor" in your `thought` block.
3. **Atomic Feedback Loop**: Do not batch multiple disparate changes. Each `replace_file_content` must be followed by a verification command (e.g., `npm run test` or `wrangler dev` checks).
4. **State Audit**: Maintain a `[CURRENT_STATE]`, `[TARGET_STATE]`, and `[SIDE_EFFECTS]` log in your thinking process for state-heavy logic.
5. **No-Guessing Paths**: Always verify file existence and API signatures before use. Use `ls` and `grep` proactively.

> [!IMPORTANT]
> Failure to follow these steps leads to hallucinated paths and broken logic. "Atomic and Verified" is your mantra.
