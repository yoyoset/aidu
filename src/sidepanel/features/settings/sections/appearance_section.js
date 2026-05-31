import { t, getSupportedLocales, getCurrentLocale, setLocale } from '../../../../locales/index.js';
import styles from '../settings_shared.module.css';
import { PERSONA_OPTIONS } from '../../../../background/llm/persona.js';
import { notificationService } from '../../../../utils/notification_service.js';

export class AppearanceSection {
    constructor(parent) {
        this.parent = parent;
    }

    render() {
        return `
            <!-- Quiet Study Appearance Section -->
            <div class="${styles.formSection}">
                <label class="${styles.sectionTitle}">${t('settings.appearance')}</label>

                <!-- Theme Selection -->
                <div class="${styles.formGroup}">
                    <label class="${styles.label}">${t('settings.appearance.theme')}</label>
                    <div style="display:flex; gap:8px;">
                        <button id="theme-light" style="flex:1; padding:8px; border:1px solid var(--line); border-radius:var(--r-sm); background:var(--surface); color:var(--ink); cursor:pointer; transition:all 0.2s var(--ease);">${t('settings.appearance.light')}</button>
                        <button id="theme-dark" style="flex:1; padding:8px; border:1px solid var(--line); border-radius:var(--r-sm); background:var(--surface); color:var(--ink); cursor:pointer; transition:all 0.2s var(--ease);">${t('settings.appearance.dark')}</button>
                    </div>
                </div>

                <!-- Accent Selection -->
                <div class="${styles.formGroup}">
                    <label class="${styles.label}">${t('settings.appearance.accent')}</label>
                    <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:8px;">
                        <button id="accent-clay" data-accent="clay" style="padding:12px; border:1px solid var(--line); border-radius:var(--r-sm); background:linear-gradient(135deg,#BF5E38,#F2E0D3); color:#fff; cursor:pointer; transition:all 0.2s var(--ease); font-weight:600;">Clay</button>
                        <button id="accent-teal" data-accent="teal" style="padding:12px; border:1px solid var(--line); border-radius:var(--r-sm); background:linear-gradient(135deg,#2F7D72,#D9ECE7); color:#fff; cursor:pointer; transition:all 0.2s var(--ease); font-weight:600;">Teal</button>
                        <button id="accent-indigo" data-accent="indigo" style="padding:12px; border:1px solid var(--line); border-radius:var(--r-sm); background:linear-gradient(135deg,#4E5BB8,#E2E4F5); color:#fff; cursor:pointer; transition:all 0.2s var(--ease); font-weight:600;">Indigo</button>
                        <button id="accent-plum" data-accent="plum" style="padding:12px; border:1px solid var(--line); border-radius:var(--r-sm); background:linear-gradient(135deg,#9B466F,#EDD8E6); color:#fff; cursor:pointer; transition:all 0.2s var(--ease); font-weight:600;">Plum</button>
                    </div>
                </div>

                <!-- Density Selection -->
                <div class="${styles.formGroup}">
                    <label class="${styles.label}">${t('settings.appearance.density')}</label>
                    <div style="display:flex; gap:8px;">
                        <button id="density-comfortable" style="flex:1; padding:8px; border:1px solid var(--line); border-radius:var(--r-sm); background:var(--surface); color:var(--ink); cursor:pointer; transition:all 0.2s var(--ease);">${t('settings.appearance.comfortable')}</button>
                        <button id="density-compact" style="flex:1; padding:8px; border:1px solid var(--line); border-radius:var(--r-sm); background:var(--surface); color:var(--ink); cursor:pointer; transition:all 0.2s var(--ease);">${t('settings.appearance.compact')}</button>
                    </div>
                </div>
            </div>

            <!-- Teaching Persona Section -->
            <div class="${styles.formSection}">
                <label class="${styles.sectionTitle}">${t('settings.persona')}</label>
                <div class="${styles.formGroup}">
                    <label class="${styles.label}" for="teaching-style">${t('settings.persona.label')}</label>
                    <select id="teaching-style" class="${styles.select}">
                        ${PERSONA_OPTIONS.map(p => `<option value="${p.id}">${p.label}</option>`).join('')}
                    </select>
                    <p id="style-desc" style="font-size:0.85em; color:var(--ink-3); margin-top:4px; font-style:italic;"></p>
                </div>
            </div>

            <!-- Interface Language Section -->
            <div class="${styles.formSection}">
                <label class="${styles.sectionTitle}">${t('settings.language')}</label>
                <div class="${styles.formGroup}">
                    <label class="${styles.label}">${t('settings.language.label')}</label>
                    <select id="language-select" class="${styles.select}">
                        ${getSupportedLocales().map(l =>
            `<option value="${l.code}" ${getCurrentLocale() === l.code ? 'selected' : ''}>${l.name}</option>`
        ).join('')}
                    </select>
                </div>
            </div>
        `;
    }

    bind(content) {
        // Appearance (QS Theme) logic
        const currentTheme = document.documentElement.dataset.theme || 'light';
        const currentAccent = document.documentElement.dataset.accent || 'clay';
        const currentDensity = document.documentElement.dataset.density || 'comfortable';

        // Theme buttons
        const themeLightBtn = content.querySelector('#theme-light');
        const themeDarkBtn = content.querySelector('#theme-dark');
        const updateThemeUI = () => {
            if (currentTheme === 'light') {
                themeLightBtn.style.borderColor = 'var(--primary)';
                themeLightBtn.style.background = 'var(--primary-soft)';
                themeLightBtn.style.color = 'var(--primary-ink)';
                themeDarkBtn.style.borderColor = 'var(--line)';
                themeDarkBtn.style.background = 'var(--surface)';
                themeDarkBtn.style.color = 'var(--ink)';
            } else {
                themeDarkBtn.style.borderColor = 'var(--primary)';
                themeDarkBtn.style.background = 'var(--primary-soft)';
                themeDarkBtn.style.color = 'var(--primary-ink)';
                themeLightBtn.style.borderColor = 'var(--line)';
                themeLightBtn.style.background = 'var(--surface)';
                themeLightBtn.style.color = 'var(--ink)';
            }
        };
        updateThemeUI();
        themeLightBtn.onclick = () => {
            document.documentElement.dataset.theme = 'light';
            updateThemeUI();
        };
        themeDarkBtn.onclick = () => {
            document.documentElement.dataset.theme = 'dark';
            updateThemeUI();
        };

        // Accent buttons
        const accentBtns = content.querySelectorAll('[data-accent]');
        const updateAccentUI = () => {
            accentBtns.forEach(btn => {
                if (btn.dataset.accent === currentAccent) {
                    btn.style.borderColor = '#fff';
                    btn.style.boxShadow = '0 0 0 2px var(--ink)';
                } else {
                    btn.style.borderColor = 'var(--line)';
                    btn.style.boxShadow = 'none';
                }
            });
        };
        updateAccentUI();
        accentBtns.forEach(btn => {
            btn.onclick = () => {
                document.documentElement.dataset.accent = btn.dataset.accent;
                updateAccentUI();
            };
        });

        // Density buttons
        const densityComfortableBtn = content.querySelector('#density-comfortable');
        const densityCompactBtn = content.querySelector('#density-compact');
        const updateDensityUI = () => {
            if (currentDensity === 'comfortable') {
                densityComfortableBtn.style.borderColor = 'var(--primary)';
                densityComfortableBtn.style.background = 'var(--primary-soft)';
                densityComfortableBtn.style.color = 'var(--primary-ink)';
                densityCompactBtn.style.borderColor = 'var(--line)';
                densityCompactBtn.style.background = 'var(--surface)';
                densityCompactBtn.style.color = 'var(--ink)';
            } else {
                densityCompactBtn.style.borderColor = 'var(--primary)';
                densityCompactBtn.style.background = 'var(--primary-soft)';
                densityCompactBtn.style.color = 'var(--primary-ink)';
                densityComfortableBtn.style.borderColor = 'var(--line)';
                densityComfortableBtn.style.background = 'var(--surface)';
                densityComfortableBtn.style.color = 'var(--ink)';
            }
        };
        updateDensityUI();
        densityComfortableBtn.onclick = () => {
            document.documentElement.dataset.density = 'comfortable';
            updateDensityUI();
        };
        densityCompactBtn.onclick = () => {
            document.documentElement.dataset.density = 'compact';
            updateDensityUI();
        };

        // Persona logic
        const styleSelect = content.querySelector('#teaching-style');
        const styleDesc = content.querySelector('#style-desc');
        if (this.parent.settings.teachingStyle) {
            styleSelect.value = this.parent.settings.teachingStyle;
        }
        const updateDesc = () => {
            const opt = PERSONA_OPTIONS.find(p => p.id === styleSelect.value);
            styleDesc.textContent = opt?.desc || '';
        };
        updateDesc();
        styleSelect.onchange = () => {
            this.parent.settings.teachingStyle = styleSelect.value;
            updateDesc();
        };
    }

    async collectData(content) {
        const language = content.querySelector('#language-select').value;
        if (language && language !== getCurrentLocale()) {
            await setLocale(language);
        }
        return {
            appearance: {
                theme: document.documentElement.dataset.theme || 'light',
                accent: document.documentElement.dataset.accent || 'clay',
                density: document.documentElement.dataset.density || 'comfortable'
            },
            teachingStyle: content.querySelector('#teaching-style').value
        };
    }
}
