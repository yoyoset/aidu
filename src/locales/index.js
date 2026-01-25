/**
 * i18n Core Module
 * 多语言国际化核心模块
 */
import zhCN from './zh-CN.js';
import enUS from './en-US.js';
import { StorageHelper, StorageKeys } from '../utils/storage.js';

const locales = {
    'zh-CN': zhCN,
    'en-US': enUS
};

// 默认中文
let currentLocale = 'zh-CN';
let messages = locales[currentLocale];

/**
 * 初始化 i18n，必须在组件加载前调用
 * @returns {Promise<void>}
 */
export async function initI18n() {
    try {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS);
        const savedLocale = settings?.language;

        // 仅当有效语言时切换，否则保持默认中文
        if (savedLocale && locales[savedLocale]) {
            currentLocale = savedLocale;
            messages = locales[currentLocale];
        }

        console.log(`[i18n] Initialized: ${currentLocale}`);
    } catch (e) {
        console.warn('[i18n] Init failed, using default zh-CN', e);
    }
}

/**
 * 翻译函数
 * @param {string} key - 翻译键，如 'settings.title'
 * @param {Object} params - 可选参数，如 { name: 'World' }
 * @returns {string} - 翻译后的文本
 * 
 * @example
 * t('greeting') // -> "你好"
 * t('greeting', { name: 'World' }) // -> "你好, World"
 */
export function t(key, params = {}) {
    // 优先当前语言，回退英文，最后返回 key 本身
    let text = messages[key] ?? locales['en-US'][key] ?? key;

    // 参数替换: {name} -> 实际值
    Object.keys(params).forEach(k => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
    });

    return text;
}

/**
 * 切换语言（需要刷新页面生效）
 * @param {string} locale - 'zh-CN' | 'en-US'
 * @returns {Promise<boolean>}
 */
export async function setLocale(locale) {
    if (!locales[locale]) {
        console.warn(`[i18n] Unknown locale: ${locale}`);
        return false;
    }

    // 更新内存
    currentLocale = locale;
    messages = locales[locale];

    // 持久化到 USER_SETTINGS
    const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
    settings.language = locale;
    await StorageHelper.set(StorageKeys.USER_SETTINGS, settings);

    console.log(`[i18n] Locale changed to: ${locale} (reload to apply)`);
    return true;
}

/**
 * 获取当前语言
 * @returns {string}
 */
export function getCurrentLocale() {
    return currentLocale;
}

/**
 * 获取所有支持的语言
 * @returns {Array<{code: string, name: string}>}
 */
export function getSupportedLocales() {
    return [
        { code: 'zh-CN', name: '简体中文' },
        { code: 'en-US', name: 'English' }
    ];
}
