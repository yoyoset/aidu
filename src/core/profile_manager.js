import { StorageHelper, StorageKeys } from '../utils/storage.js';
import { vocabService } from '../services/vocab_service.js';

/**
 * ProfileManager - 领域服务，负责用户配置与 Profile 的生命周期管理
 * 遵循 SRP 原则，将数据操纵逻辑从 UI (SettingsModal) 中完全剥离
 */
export class ProfileManager {
    constructor() {
        this.settings = null;
    }

    /**
     * 加载并初始化设置
     * 包含默认值注入与遗留数据迁移逻辑
     */
    async load() {
        const rawSettings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};

        // 1. 默认 Schema 初始化 (从 SettingsModal.show 迁移)
        if (!rawSettings.profiles) {
            this.settings = {
                activeProfileId: 'default',
                profiles: {
                    'default': {
                        name: 'General Profile',
                        provider: 'gemini',
                        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
                        model: 'gemini-2.0-flash',
                        apiKey: '',
                        realtimeMode: '2',
                        builderMode: '3',
                        debugMode: false,
                        typography: {
                            fontSize: 100,
                            lineHeight: 2.0,
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: "400"
                        }
                    }
                }
            };
        } else {
            this.settings = rawSettings;
        }

        // 2. 自动迁移逻辑 (从 SettingsModal.show 迁移)
        this._migrateProfileConfigs();

        return this.settings;
    }

    /**
     * 获取当前活跃 Profile
     */
    getActiveProfile() {
        if (!this.settings) return null;
        return this.settings.profiles[this.settings.activeProfileId];
    }

    /**
     * 切换活跃 Profile
     */
    async switchProfile(profileId) {
        if (!this.settings || !this.settings.profiles[profileId]) return false;

        this.settings.activeProfileId = profileId;
        await this.save();

        // 同步通知词汇服务切换上下文
        vocabService.setProfile(profileId);
        return true;
    }

    /**
     * 创建新 Profile
     */
    async createProfile(name = 'New Profile') {
        const newId = 'profile_' + Date.now();
        this.settings.profiles[newId] = {
            name: name,
            provider: 'deepseek',
            baseUrl: 'https://api.deepseek.com/v1',
            model: 'deepseek-chat',
            apiKey: '',
            realtimeMode: '2',
            builderMode: '3',
            providerConfig: {}
        };

        await this.switchProfile(newId);
        return newId;
    }

    /**
     * 删除 Profile
     */
    async deleteProfile(profileId) {
        if (profileId === 'default') return false;

        // 1. 清理关联词汇数据 (防止存储泄漏)
        const vocabKey = `vocab_${profileId}`;
        await StorageHelper.remove(vocabKey);

        // 2. 移除配置
        delete this.settings.profiles[profileId];

        // 3. 强制切回默认
        await this.switchProfile('default');
        return true;
    }

    /**
     * 更新当前 Profile 属性 (包含 providerConfig 自动处理)
     */
    updateActiveProfile(updates) {
        const profile = this.getActiveProfile();
        if (!profile) return;

        // 处理 providerConfig 的特殊逻辑
        if (updates.provider && updates.apiKey !== undefined) {
            if (!profile.providerConfig) profile.providerConfig = {};
            profile.providerConfig[updates.provider] = {
                apiKey: updates.apiKey,
                baseUrl: updates.baseUrl,
                model: updates.model
            };
        }

        Object.assign(profile, updates);
        profile.updatedAt = Date.now();
    }

    /**
     * 更新全局设置 (Sync, TeachingStyle, etc.)
     */
    updateGlobalSettings(updates) {
        if (!this.settings) return;

        if (updates.sync) {
            this.settings.sync = {
                ...(this.settings.sync || {}),
                ...updates.sync
            };
        }

        if (updates.debugMode !== undefined) {
            this.settings.debugMode = !!updates.debugMode;
        }

        // 处理其他可能的全局字段
        const reserved = ['profiles', 'activeProfileId', 'sync', 'teachingStyle', 'debugMode'];
        Object.keys(updates).forEach(key => {
            if (!reserved.includes(key)) {
                this.settings[key] = updates[key];
            }
        });
    }

    /**
     * 持久化到存储
     */
    async save() {
        if (!this.settings) return;
        await StorageHelper.set(StorageKeys.USER_SETTINGS, this.settings);

        // 触发词汇服务同步（确保 Profile ID 一致）
        vocabService.setProfile(this.settings.activeProfileId);
    }

    /**
     * 私有迁移逻辑：确保 providerConfig 结构正确
     */
    _migrateProfileConfigs() {
        Object.keys(this.settings.profiles).forEach(id => {
            const profile = this.settings.profiles[id];
            if (!profile.providerConfig) {
                profile.providerConfig = {};
                // 将旧的平辅配置迁移到对应的 provider 桶中
                if (profile.apiKey) {
                    profile.providerConfig[profile.provider] = {
                        apiKey: profile.apiKey,
                        model: profile.model,
                        baseUrl: profile.baseUrl
                    };
                }
            }
        });
    }
}

export const profileManager = new ProfileManager();
