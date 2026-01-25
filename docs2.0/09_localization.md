# Localization (i18n) System

Feature Version: v4.8.0
Added: 2026-01-20

AIDU now supports a modular Internationalization (i18n) system, allowing for complete UI localization. The default language is **Simplified Chinese (zh-CN)**, with **English (en-US)** as the fallback.

## 1. Architecture

The localization logic is centralized in `src/locales/index.js` and decoupled from UI components.

- **`src/locales/`**: Contains all locale files and the core i18n module.
    - `index.js`: The main entry point. Exports `t(key, params)`, `initI18n()`, `setLocale()`, etc.
    - `zh-CN.js`: Simplified Chinese translations (Source of Truth).
    - `en-US.js`: English translations (Fallback).

## 2. Usage in Code

### Importing
```javascript
import { t } from '../../locales/index.js'; // Adjust path relative to your file
```

### Translating Strings
Use the `t()` function with a dot-notated key.

```javascript
// Simple string
button.textContent = t('common.save');

// With parameters
message.innerHTML = t('dashboard.sync.failed', { error: e.message });
```

### Initializing
The system must be initialized before any UI rendering to load the saved language preference.

```javascript
// src/sidepanel/index.js
import { initI18n } from '../locales/index.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initI18n(); // Loads 'zh-CN' or user setting
    // ... start app
});
```

## 3. Adding a New Language

1.  **Create Locale File**: Duplicate `src/locales/en-US.js` and rename it (e.g., `ja-JP.js`).
2.  **Translate**: Replace values with the new language. Ensure keys match `zh-CN.js`.
3.  **Register**: Import and add the new locale in `src/locales/index.js`.

```javascript
// src/locales/index.js
import jaJP from './ja-JP.js';

const messages = {
    'zh-CN': zhCN,
    'en-US': enUS,
    'ja-JP': jaJP // Add here
};
```

## 4. User Settings

- **Persistence**: Language preference is stored in `chrome.storage.local` under `USER_SETTINGS.language`.
- **UI**: Users can switch languages in the **Settings Modal**.
- **Effect**: Changing language usually requires a page reload (`window.location.reload()`) to apply globally.
