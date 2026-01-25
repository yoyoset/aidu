/**
 * Aidu Mobile - Main Application Logic
 */

// --- 1. SRS Algorithm ---
const SRSAlgorithm = {
    calculate(stage, quality, interval, easeFactor) {
        if (!interval) interval = 1;
        if (!easeFactor) easeFactor = 2.5;

        // FSRS/Anki-lite Logic
        if (quality === 0) {
            interval = 1;
            easeFactor = Math.max(1.3, easeFactor - 0.2);
            stage = 'learning';
        } else if (quality === 1) {
            interval = Math.max(1, interval * 1.2);
            easeFactor = Math.max(1.3, easeFactor - 0.15);
        } else if (quality === 2) {
            interval = Math.max(1, interval * easeFactor);
        } else if (quality === 3) {
            interval = Math.max(1, interval * easeFactor * 1.3);
            easeFactor += 0.15;
        }

        return {
            interval: Math.round(interval),
            easeFactor: parseFloat(easeFactor.toFixed(2)),
            stage: 'review',
            nextReview: Date.now() + (interval * 24 * 60 * 60 * 1000)
        };
    }
};

// --- 2. Storage Adapter ---
// --- 2. Storage Adapter ---
const Store = {
    getSettings: () => JSON.parse(localStorage.getItem('aidu_settings') || '{}'),
    saveSettings: (s) => localStorage.setItem('aidu_settings', JSON.stringify(s)),

    // Profile-Aware Storage
    getVocab: (profileId) => {
        const key = `aidu_vocab_${profileId || 'default'}`;
        let data = localStorage.getItem(key);

        // Legacy Migration for 'default'
        if (!data && (profileId === 'default' || !profileId)) {
            const legacy = localStorage.getItem('aidu_vocab');
            if (legacy) {
                console.log("Migrating legacy data to default profile...");
                localStorage.setItem(key, legacy);
                // Optional: localStorage.removeItem('aidu_vocab'); 
                return JSON.parse(legacy);
            }
        }
        return JSON.parse(data || '{}');
    },

    saveVocab: (v, profileId) => {
        const key = `aidu_vocab_${profileId || 'default'}`;
        localStorage.setItem(key, JSON.stringify(v));
    }
};

// --- 3. App Logic ---
window.App = {
    data: {},
    queue: [],
    currentCard: null,
    isFlipped: false,
    currentProfile: 'default',

    init() {
        // 0. MAGIC LINK HANDLER
        const params = new URLSearchParams(window.location.search);
        let autoSync = false;

        if (params.has('conf')) {
            try {
                // Decode Magic Link
                const json = JSON.parse(atob(params.get('conf')));
                if (json.u && json.t) {
                    const newProfile = json.p || 'default';
                    Store.saveSettings({
                        url: json.u,
                        token: json.t,
                        profile: newProfile
                    });
                    this.toast("Configuration Imported!");
                    // Clean URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                    autoSync = true;
                }
            } catch (e) {
                console.error("Magic Link Error", e);
                this.toast("Invalid Configuration Link");
            }
        }

        // 1. Load Settings & Profile
        const settings = Store.getSettings();
        // Compatibility: Check new 'activeProfileId' first, then legacy 'profile'
        this.currentProfile = settings.activeProfileId || settings.profile || 'default';

        // 2. Load Data for correct profile
        this.data = Store.getVocab(this.currentProfile);
        this.renderStats();

        // Fill Inputs
        if (settings.url) document.getElementById('setting-url').value = settings.url;
        if (settings.token) document.getElementById('setting-token').value = settings.token;

        // Populate Profile Dropdown
        const profileSelect = document.getElementById('setting-profile-select');
        const profiles = settings.availableProfiles || ['default'];
        // Ensure default is there if empty
        if (profiles.length === 0) profiles.push('default');

        profileSelect.innerHTML = profiles.map(p =>
            `<option value="${p}" ${p === this.currentProfile ? 'selected' : ''}>${p}</option>`
        ).join('');

        // Also fill hidden compatibility input
        document.getElementById('setting-profile').value = this.currentProfile;

        if (Object.keys(this.data).length === 0 && !autoSync) {
            this.toast("No words found. Please Sync.");
        }

        // Bindings
        document.getElementById('btn-settings').onclick = () => this.switchView('view-settings');
        document.getElementById('btn-donate').onclick = () => this.showDonateModal();
        document.getElementById('btn-home-back').onclick = () => this.switchView('view-home');
        document.getElementById('btn-start-review').onclick = () => this.startReview();
        document.getElementById('btn-sync').onclick = () => this.sync();
        document.getElementById('btn-save-settings').onclick = () => this.saveSettings();

        const card = document.querySelector('.flashcard');
        card.onclick = (e) => {
            if (e.target.closest('.card-actions')) return;
            if (e.target.tagName === 'SPAN' && e.target.textContent.includes('🔊')) return;
            this.flipCard();
        };

        document.querySelectorAll('.btn-grade').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const grade = parseInt(btn.dataset.grade);
                this.handleGrade(grade);
            };
        });

        this.switchView('view-home');

        if (autoSync) {
            setTimeout(() => this.sync(), 500);
        }
    },

    switchView(viewId) {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
    },

    toast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    },

    showDonateModal() {
        // Remove existing modal if any
        const existing = document.querySelector('.donate-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'donate-overlay';
        overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:9999;';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        const modal = document.createElement('div');
        modal.style.cssText = 'background:white; border-radius:16px; width:90%; max-width:340px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.25);';

        modal.innerHTML = `
            <div style="padding:16px 20px; background:linear-gradient(135deg, #ff6b6b, #ee5a5a); color:white; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:1.1em;">❤️ Support Author</h3>
                <button onclick="this.closest('.donate-overlay').remove()" style="background:none; border:none; color:white; font-size:1.5em; cursor:pointer;">&times;</button>
            </div>
            <div style="display:flex; align-items:center; gap:12px; padding:16px; border-bottom:1px solid #eee;">
                <img src="../SUlogo.jpg" style="width:50px; height:50px; border-radius:50%; object-fit:cover; border:2px solid #eee;">
                <div>
                    <div style="font-weight:bold; color:#333;">SquareUncle (方砖叔)</div>
                    <a href="https://squareuncle.com" target="_blank" style="color:#3b82f6; font-size:0.9em;">🔗 squareuncle.com</a>
                </div>
            </div>
            <p style="padding:12px 16px; margin:0; color:#666; font-size:0.9em; text-align:center; background:#fafafa;">Thank you for your support! ❤️</p>
            <div id="donate-tabs" style="display:flex; border-bottom:1px solid #eee;"></div>
            <div id="donate-qr" style="padding:20px; text-align:center;"></div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Tabs
        const tabs = modal.querySelector('#donate-tabs');
        const qrContainer = modal.querySelector('#donate-qr');
        const methods = [
            { key: 'alipay', label: 'Alipay', img: '../donate_alipay.png' },
            { key: 'wechat', label: 'WeChat', img: '../donate_wechat.png' },
            { key: 'paypal', label: 'PayPal', img: '../donate_paypal.png' }
        ];
        let activeTab = 'alipay';

        const renderQR = () => {
            const m = methods.find(x => x.key === activeTab);
            qrContainer.innerHTML = `<img src="${m.img}" style="max-width:160px; max-height:160px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1);" onerror="this.style.display='none';"><p style="margin:10px 0 0; color:#999; font-size:0.85em;">Scan to support</p>`;
        };

        methods.forEach(m => {
            const btn = document.createElement('button');
            btn.textContent = m.label;
            btn.style.cssText = `flex:1; padding:12px; border:none; background:none; cursor:pointer; font-size:0.9em; color:${activeTab === m.key ? '#ee5a5a' : '#666'}; font-weight:${activeTab === m.key ? 'bold' : 'normal'}; border-bottom:${activeTab === m.key ? '2px solid #ee5a5a' : 'none'};`;
            btn.onclick = () => {
                activeTab = m.key;
                tabs.querySelectorAll('button').forEach((b, i) => {
                    b.style.color = methods[i].key === activeTab ? '#ee5a5a' : '#666';
                    b.style.fontWeight = methods[i].key === activeTab ? 'bold' : 'normal';
                    b.style.borderBottom = methods[i].key === activeTab ? '2px solid #ee5a5a' : 'none';
                });
                renderQR();
            };
            tabs.appendChild(btn);
        });

        renderQR();
    },

    // --- Stats & Queue ---
    renderStats() {
        const list = Object.values(this.data);
        const total = list.length;
        const due = list.filter(v => v.stage !== 'mastered' && (!v.nextReview || v.nextReview <= Date.now())).length;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-due').textContent = due;

        const startBtn = document.getElementById('btn-start-review');
        if (due > 0) {
            startBtn.textContent = `Start Review (${due})`;
            startBtn.disabled = false;
            startBtn.classList.add('btn-primary');
            startBtn.classList.remove('btn-secondary');
        } else {
            startBtn.textContent = "All Caught Up!";
            startBtn.disabled = true;
            startBtn.classList.remove('btn-primary');
            startBtn.classList.add('btn-secondary');
        }
    },

    checkQueue() {
        // Preserving Keys for reliable update lookup
        this.queue = [];
        for (const key in this.data) {
            const v = this.data[key];
            if (!v) continue;

            // Enforce key first for reliable updates
            v._key = key;

            // Filter
            if (v.stage === 'mastered') continue;
            if (v.nextReview && v.nextReview > Date.now()) continue;

            // Sanity Filter
            if (!v.word && !v.lemma && !v.text && !v.headword) {
                console.warn('Skipping invalid entry:', key);
                continue;
            }

            this.queue.push(v);
        }

        this.queue.sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
    },

    // --- Sync ---
    async sync() {
        const settings = Store.getSettings();
        if (!settings.url || !settings.token) {
            this.toast("Please configure Settings first!");
            this.switchView('view-settings');
            return;
        }

        const btn = document.getElementById('btn-sync');
        btn.textContent = "Syncing...";
        btn.disabled = true;

        try {
            // 0. Prepare URL with Profile
            const profile = settings.profile || 'default';
            // Handle URL format (append ?profile or &profile)
            const rawUrl = settings.url;
            // Robust query param appending
            const separator = rawUrl.includes('?') ? '&' : '?';
            const urlWithProfile = `${rawUrl}${separator}profile=${encodeURIComponent(profile)}`;
            const urlObj = new URL(urlWithProfile);
            // Add cache bust
            urlObj.searchParams.append('t', Date.now());

            const authHeaders = {
                'Authorization': `Bearer ${settings.token}`,
                'Content-Type': 'application/json'
            };

            // 1. PULL (GET)
            const res = await fetch(urlObj.toString(), {
                method: 'GET',
                headers: authHeaders,
                cache: 'no-store'
            });

            if (!res.ok && res.status !== 404) throw new Error("Pull Failed: " + res.status);

            let remoteData = {};
            if (res.ok) {
                const json = await res.json();
                remoteData = json.vocab || json;
            }

            const localData = this.data;
            let incoming = 0;
            let outgoing = 0;

            // 2. MERGE (Remote -> Local)
            for (const key in remoteData) {
                const rItem = remoteData[key];
                const lItem = localData[key];
                // Resolve conflict: newer wins
                if (!lItem || (rItem.updatedAt || 0) > (lItem.updatedAt || 0)) {
                    localData[key] = rItem;
                    incoming++;
                }
            }
            this.data = localData;
            Store.saveVocab(this.data, this.currentProfile); // Save merged state to isolated profile

            // 3. PUSH (Local -> Remote)
            // Send the FULL merged dataset back to server (Simplest strategy for KV)
            // In a real DB we'd send diffs, but for KV we upload all.
            const payload = {
                vocab: this.data,
                meta: { timestamp: Date.now(), device: 'mobile', profile: profile }
            };

            // Re-use urlObj but we don't strictly need cache bust for POST, but fine.
            const pushRes = await fetch(urlObj.toString(), {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(payload)
            });

            if (!pushRes.ok) throw new Error("Push Failed: " + pushRes.status);
            outgoing = Object.keys(this.data).length; // Rough metric

            this.renderStats();
            this.toast(`Synced! ↓${incoming} ↑Saved`);

        } catch (e) {
            console.error(e);
            this.toast("Error: " + e.message);
        } finally {
            // Pull profile metadata (Best Effort)
            try {
                if (settings.url) {
                    const separator = settings.url.includes('?') ? '&' : '?';
                    const metaUrl = `${settings.url}${separator}key=meta&t=${Date.now()}`;
                    const metaRes = await fetch(metaUrl, {
                        headers: { 'Authorization': `Bearer ${settings.token}` }
                    });
                    if (metaRes.ok) {
                        const meta = await metaRes.json();
                        const currentSettings = Store.getSettings();
                        currentSettings.availableProfiles = meta.profiles || [];
                        Store.saveSettings(currentSettings);
                        console.log("Synced Profiles:", currentSettings.availableProfiles);
                    }
                }
            } catch (e) {
                console.warn('Failed to fetch profile meta', e);
            }

            btn.textContent = "☁️ Sync";
            btn.disabled = false;
        }
    },

    saveSettings() {
        const url = document.getElementById('setting-url').value.trim();
        const token = document.getElementById('setting-token').value.trim();
        const profile = document.getElementById('setting-profile-select').value || 'default';
        // Save as activeProfileId for consistency
        Store.saveSettings({ url, token, activeProfileId: profile });

        // Reload data if profile changed!
        if (profile !== this.currentProfile) {
            this.currentProfile = profile;
            this.data = Store.getVocab(profile);
            this.renderStats();
            this.toast("Settings Saved & Profile Switched");
        } else {
            this.toast("Settings Saved");
        }
        this.switchView('view-home');
    },

    // --- Review Loop ---
    startReview() {
        this.checkQueue();
        if (this.queue.length === 0) return;
        this.switchView('view-review');
        this.nextCard();
    },

    nextCard() {
        if (this.queue.length === 0) {
            this.toast("Session Complete!");
            this.switchView('view-home');
            this.renderStats();
            return;
        }

        this.currentCard = this.queue[0];
        this.isFlipped = false;

        const card = document.querySelector('.flashcard');
        card.classList.remove('flipped');

        // Smart Map Fields
        const val = this.currentCard;
        // 1. Word
        const word = val.word || val.lemma || val.text || val.headword || 'Unknown Word';

        // 2. Phonetic
        let phonetic = val.phonetic || val.reading || val.pronunciation || '';
        if (Array.isArray(phonetic)) phonetic = phonetic.join(', ');

        // 3. Meaning
        let meaning = val.meaning || val.definition || val.definitions || 'No meaning';
        if (Array.isArray(meaning)) {
            try {
                if (typeof meaning[0] === 'string') {
                    meaning = meaning.join('; ');
                } else if (meaning[0] && meaning[0].text) {
                    meaning = meaning.map(d => d.text).join('; ');
                } else if (meaning[0] && meaning[0].definition) {
                    meaning = meaning.map(d => d.definition).join('; ');
                } else {
                    meaning = JSON.stringify(meaning);
                }
            } catch (e) { meaning = JSON.stringify(meaning); }
        } else if (typeof meaning === 'object') {
            meaning = JSON.stringify(meaning);
        }

        // 4. Context
        let context = val.context || val.sentence || val.example || '';
        if (typeof context === 'object') {
            context = context.original || context.text || JSON.stringify(context);
        }
        if (!context) context = 'No context';

        document.getElementById('card-word').textContent = word;

        // TTS Inject
        const phEl = document.getElementById('card-phonetic');
        phEl.innerHTML = phonetic ? ` [${phonetic}]` : '';

        // Bind Static Speaker (Outside Card)
        const staticSpeaker = document.getElementById('btn-speak-static');
        if (staticSpeaker) {
            // Remove old listeners (cheap way: clone node? or just reassign onclick)
            staticSpeaker.onclick = (e) => {
                e.stopPropagation();
                this.speak(word);
            };
        }

        document.getElementById('card-context-front').textContent = this.cloze(context, word);

        document.getElementById('card-meaning').textContent = meaning;
        document.getElementById('card-context-back').textContent = context;

        // Auto-play TTS on Front (Optional)
        // this.speak(word);
    },

    flipCard() {
        if (this.isFlipped) return;
        this.isFlipped = true;
        document.querySelector('.flashcard').classList.add('flipped');

        // Auto-speak word on flip
        const word = this.currentCard.word || this.currentCard.lemma || 'Unknown';
        this.speak(word);
    },

    speak(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 1.0;
        window.speechSynthesis.speak(u);
    },

    async handleGrade(grade) {
        if (!this.currentCard) return;

        // Grade 4: Master (Remove from review loop)
        if (grade === 4) {
            const key = this.currentCard._key || this.currentCard.lemma || this.currentCard.word;
            if (key && this.data[key]) {
                this.data[key] = {
                    ...this.data[key],
                    stage: 'mastered',
                    reviews: (this.currentCard.reviews || 0) + 1,
                    lastReview: Date.now(),
                    updatedAt: Date.now(),
                    nextReview: 0 // No next review
                };
                Store.saveVocab(this.data, this.currentProfile);
                this.toast("Marked as Mastered! 🎉");
            }
            this.queue.shift();
            this.nextCard();
            return;
        }

        const result = SRSAlgorithm.calculate(
            this.currentCard.stage || 'new',
            grade,
            this.currentCard.interval,
            this.currentCard.easeFactor
        );

        // Robust Key: Use _key attached in checkQueue
        const key = this.currentCard._key || this.currentCard.lemma || this.currentCard.word;

        if (key && this.data[key]) {
            this.data[key] = {
                ...this.data[key],
                ...result,
                reviews: (this.currentCard.reviews || 0) + 1,
                lastReview: Date.now(),
                updatedAt: Date.now()
            };
            Store.saveVocab(this.data, this.currentProfile);
            // Optional: visual feedback
        } else {
            console.error("Critical Error: Could not find key to save progress", key);
            this.toast("Error: Could not save progress");
        }

        this.queue.shift();
        this.nextCard();
    },

    cloze(text, word) {
        if (!text) return '...';
        if (word === 'Unknown Word') return text;
        try {
            const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
            return text.replace(regex, '______');
        } catch { return text; }
    }
};

window.onload = () => App.init();
