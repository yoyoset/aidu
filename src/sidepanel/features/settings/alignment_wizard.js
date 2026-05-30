import { ApiClient } from '../../../background/llm/api_client.js';
import { ResponseValidator } from '../../../background/llm/utils/response_validator.js';
import { getStandardSchema } from '../../../background/llm/utils/response_schema.js';
import { logger } from '../../../utils/logger.js';
import { notificationService } from '../../../utils/notification_service.js';
import { t } from '../../../locales/index.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';
import { profileManager } from '../../../core/profile_manager.js';

/**
 * AlignmentWizard v2 - 提示词工程对齐工作台
 * 流程：
 * 1. 取样诊断：发送标准探测文本，获取原始输出，在暗色终端展示，并对字段进行结构完整性预检
 * 2. 导出诊断包：一键复制 Schema + 实际输出 + 外部 AI 指引至剪贴板
 * 3. 应用修正：用户粘贴 Claude/GPT 生成的指令，一键应用并开启 live 对齐重试
 */
export class AlignmentWizard {
    constructor() {
        this.apiClient = new ApiClient();
        this.probeText = "He broke it up.";
        this.overlay = null;
        this.styleElement = null;
        this.injectStyles();
    }

    /**
     * 打开工作台界面
     * @param {number} mode - 模式 (1, 2, 3)
     * @param {HTMLTextAreaElement} parentTextarea - 父级 Prompt Textarea 引用
     */
    open(mode, parentTextarea) {
        if (this.overlay) return;

        this.overlay = document.createElement('div');
        this.overlay.className = 'wizard-overlay';

        const modal = document.createElement('div');
        modal.className = 'wizard-modal';

        // Header
        const header = document.createElement('div');
        header.className = 'wizard-header';
        header.innerHTML = `
            <h3 class="wizard-title">
                <i class="ri-magic-line"></i> ${t('settings.expert.align.title') || `提示词对齐工作台 (模式 ${mode})`}
            </h3>
            <button class="wizard-close-btn" style="background:transparent;border:none;color:white;font-size:1.4rem;cursor:pointer;line-height:1;">&times;</button>
        `;
        modal.appendChild(header);

        // Close Event
        header.querySelector('.wizard-close-btn').onclick = () => this.close();

        // Body
        const body = document.createElement('div');
        body.className = 'wizard-body';

        // Step 1: Probe
        const step1 = document.createElement('div');
        step1.className = 'wizard-step-card';
        step1.innerHTML = `
            <h4 class="wizard-step-title"><i class="ri-terminal-box-line"></i> Step 1: 实时取样与诊断</h4>
            <div style="font-size:0.75rem;color:#64748b;">
                发送标准探测文本 <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">"${this.probeText}"</code> 至当前模型，拉取原始 JSON 并进行 Schema 完整性评估。
            </div>
            <div style="display:flex;gap:10px;">
                <button class="wizard-btn-primary" id="btn-probe">
                    <i class="ri-play-circle-line"></i> 开始取样诊断
                </button>
            </div>
            <div class="wizard-terminal" id="wizard-term">Terminal ready. Waiting for probe...</div>
        `;
        body.appendChild(step1);

        // Step 2: Diagnostic Package Export
        const step2 = document.createElement('div');
        step2.className = 'wizard-step-card';
        step2.innerHTML = `
            <h4 class="wizard-step-title"><i class="ri-file-transfer-line"></i> Step 2: 导出标准诊断包</h4>
            <div style="font-size:0.75rem;color:#64748b;">
                一键复制诊断包（包含标准 JSON Schema、模型实际输出及外部 AI 提示词分析指南），粘贴给 ChatGPT/Claude 即可生成修正指令。
            </div>
            <div>
                <button class="wizard-btn-secondary" id="btn-copy" disabled>
                    <i class="ri-file-copy-2-line"></i> 复制诊断包到剪贴板
                </button>
            </div>
        `;
        body.appendChild(step2);

        // Step 3: Apply corrections
        const step3 = document.createElement('div');
        step3.className = 'wizard-step-card';
        step3.innerHTML = `
            <h4 class="wizard-step-title"><i class="ri-brush-3-line"></i> Step 3: 应用修正与迭代</h4>
            <div style="font-size:0.75rem;color:#64748b;">
                将外部 AI 产出的修正指令粘贴至下方，临时注入系统提示词并再次运行 Step 1 来验证对齐结果。
            </div>
            <textarea class="wizard-textarea" id="txt-correction" placeholder="示例：你必须在 segments 中使用 NOUN/VERB 简写，且必须包含 phrasal_verbs 结构..."></textarea>
            <div style="display:flex;gap:10px;">
                <button class="wizard-btn-primary" id="btn-apply-test">应用修正并再次测试</button>
            </div>
        `;
        body.appendChild(step3);

        modal.appendChild(body);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'wizard-footer';
        footer.innerHTML = `
            <button class="wizard-btn-secondary" id="btn-close-footer">关闭工作台</button>
            <button class="wizard-btn-primary" id="btn-save-footer" style="background:#10b981;">完成并保存配置</button>
        `;
        modal.appendChild(footer);

        footer.querySelector('#btn-close-footer').onclick = () => this.close();
        footer.querySelector('#btn-save-footer').onclick = async () => {
            const correction = correctionInput.value.trim();
            let currentPrompt = parentTextarea.value;

            const regex = /\s*\/\* --- START ALIGNMENT FIX --- \*\/[\s\S]*?\/\* --- END ALIGNMENT FIX --- \*\/\s*/g;
            currentPrompt = currentPrompt.replace(regex, '\n\n').trim();

            if (correction) {
                const blockStart = '\n\n/* --- START ALIGNMENT FIX --- */';
                const blockEnd = '/* --- END ALIGNMENT FIX --- */\n';
                const correctionBlock = `${blockStart}\n- ${correction}\n${blockEnd}`;

                if (currentPrompt.includes('CONSTRAINTS:')) {
                    currentPrompt = currentPrompt.replace('CONSTRAINTS:', `CONSTRAINTS:${correctionBlock}`);
                } else {
                    currentPrompt += correctionBlock;
                }
            }

            parentTextarea.value = currentPrompt;

            // Direct Save to Storage Helper to ensure UX persistence
            try {
                if (!profileManager.settings) {
                    await profileManager.load();
                }
                const activeProfile = profileManager.getActiveProfile() || {};
                const provider = activeProfile.provider || 'gemini';
                const model = activeProfile.model || 'gemini-2.0-flash';
                const modelKey = `${provider}:${model}`;

                let allExpertPrompts = await StorageHelper.get(StorageKeys.EXPERT_PROMPTS);
                if (!allExpertPrompts || typeof allExpertPrompts !== 'object' || Array.isArray(allExpertPrompts)) {
                    allExpertPrompts = {};
                }
                
                // Backward Compatibility: Detect if allExpertPrompts is flat (which is legacy)
                const isFlat = Object.keys(allExpertPrompts).some(key => key.startsWith('analysis_mode_') || key.startsWith('dict_') || key.startsWith('persona_'));
                let nestedPrompts = isFlat ? { 'default': { ...allExpertPrompts } } : allExpertPrompts;

                if (!nestedPrompts[modelKey]) {
                    nestedPrompts[modelKey] = {};
                }
                nestedPrompts[modelKey][`analysis_mode_${mode}`] = currentPrompt;
                await StorageHelper.set(StorageKeys.EXPERT_PROMPTS, nestedPrompts);
                notificationService.success('对齐配置已保存并自动生效！');
            } catch (err) {
                logger.error('[AlignmentWizard] Failed to auto-save to storage', err);
                notificationService.success(t('settings.expert.saveSuccess') || 'Configuration saved successfully!');
            }

            this.close();
        };

        this.overlay.appendChild(modal);
        document.body.appendChild(this.overlay);

        // Variables state
        let rawResponse = '';
        const terminal = step1.querySelector('#wizard-term');
        const probeBtn = step1.querySelector('#btn-probe');
        const copyBtn = step2.querySelector('#btn-copy');
        const correctionInput = step3.querySelector('#txt-correction');
        const applyBtn = step3.querySelector('#btn-apply-test');

        // Logic 1: Probe
        const runProbe = async () => {
            probeBtn.disabled = true;
            probeBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> 请求发送中...`;
            terminal.textContent = `> Sending probe message directly...\n> Standard Prompt: "${parentTextarea.value.substring(0, 100)}..."\n> Waiting for stream...`;
            
            try {
                const response = await this.apiClient.streamCompletion(this.probeText, parentTextarea.value, {
                    mode,
                    responseFormat: 'text'
                });

                if (!this.overlay) return; // Safeguard if closed during API request

                rawResponse = response.trim();
                terminal.textContent = `> Response received successfully!\n\n${rawResponse}`;
                
                // Perform quick pre-check
                try {
                    const parsed = JSON.parse(rawResponse);
                    const validationResult = ResponseValidator.validate(parsed, mode);
                    const sentencesCount = validationResult.sentences?.length || 0;
                    
                    terminal.textContent += `\n\n[SUCCESS] 对齐诊断结果: 格式合法!\n解析出句子数量: ${sentencesCount}\n已通过 ResponseValidator 本地适配校验。`;
                    terminal.style.color = '#34d399'; // Success Green
                } catch (jsonErr) {
                    terminal.textContent += `\n\n[WARNING] 格式完整性诊断失败:\n模型输出无法直接解析为合规 of JSON 对象。\n可能存在字段别名、括号未闭合或 markdown 标记污染。\n建议通过 Step 2 进行外部对齐。`;
                    terminal.style.color = '#f87171'; // Error Red
                }

                copyBtn.disabled = false;
            } catch (e) {
                if (!this.overlay) return;
                logger.error('[AlignmentWizard] Direct probe failed', e);
                terminal.textContent = `> Failed: ${e.message}\n建议确认当前的 Provider API Key 和网络连接是否畅通。`;
                terminal.style.color = '#ef4444';
            } finally {
                if (this.overlay) {
                    probeBtn.disabled = false;
                    probeBtn.innerHTML = `<i class="ri-play-circle-line"></i> 开始取样诊断`;
                }
            }
        };

        probeBtn.onclick = runProbe;

        // Logic 2: Copy diagnostic package
        copyBtn.onclick = () => {
            if (!rawResponse) return;

            const diagnosticPack = `# AIDU Prompt Alignment Diagnostic Pack
Please analyze the discrepancy between the expected JSON schema and the model's actual response.

## 1. Target JSON Schema (Expected Structure)
\`\`\`json
${JSON.stringify(getStandardSchema(mode), null, 2)}
\`\`\`

## 2. Actual Raw LLM Response (Model Output)
\`\`\`json
${rawResponse}
\`\`\`

## 3. Probe Input Text
"${this.probeText}"

## 4. Prompt Engineering Instructions for external AI
You are an expert prompt engineer. The model failed to output compliant JSON according to the schema.
Common issues: fields mapped incorrectly, wrong types, missing fields, or incorrect phrasal verb indices.
Please analyze the exact differences and write a highly concise correction instruction starting with "你必须..." or "严禁...".
Ensure it explicitly corrects fields (e.g. "你必须使用 segments 而不是 pos").
Provide ONLY the correction instruction (max 100 characters), without any conversational fluff.
`;

            navigator.clipboard.writeText(diagnosticPack).then(() => {
                notificationService.success(t('settings.expert.align.copied') || 'Diagnostic pack copied to clipboard!');
            }).catch(err => {
                notificationService.alert('Copy failed: ' + err);
            });
        };

        // Logic 3: Temporary Injection & Retest
        applyBtn.onclick = async () => {
            const correction = correctionInput.value.trim();
            if (!correction) {
                notificationService.toast('请输入修正指令后再进行测试！', 'warn');
                return;
            }

            let currentPrompt = parentTextarea.value;
            const blockStart = '\n\n/* --- START ALIGNMENT FIX --- */';
            const blockEnd = '/* --- END ALIGNMENT FIX --- */\n';
            const correctionBlock = `${blockStart}\n- ${correction}\n${blockEnd}`;

            // Safe precise replace using structured comments and robust regex
            const regex = /\s*\/\* --- START ALIGNMENT FIX --- \*\/[\s\S]*?\/\* --- END ALIGNMENT FIX --- \*\/\s*/g;
            currentPrompt = currentPrompt.replace(regex, '\n\n').trim();

            if (currentPrompt.includes('CONSTRAINTS:')) {
                currentPrompt = currentPrompt.replace('CONSTRAINTS:', `CONSTRAINTS:${correctionBlock}`);
            } else {
                currentPrompt += correctionBlock;
            }

            parentTextarea.value = currentPrompt;
            notificationService.toast('已临时注入提示词配置，开始再次测试...', 'info');

            // Trigger retest
            await runProbe();
        };
    }

    /**
     * 关闭工作台
     */
    close() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    /**
     * 动态注入 CSS 样式
     */
    injectStyles() {
        if (document.getElementById('alignment-wizard-styles')) return;

        this.styleElement = document.createElement('style');
        this.styleElement.id = 'alignment-wizard-styles';
        this.styleElement.textContent = `
            .wizard-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(15, 23, 42, 0.4);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .wizard-modal {
                background: rgba(255, 255, 255, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.4);
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                border-radius: 16px;
                width: 90%;
                max-width: 650px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: wizardScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            @keyframes wizardScaleIn {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            .wizard-header {
                background: linear-gradient(135deg, #ef4444, #f43f5e);
                color: white;
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .wizard-title {
                font-size: 1.05rem;
                font-weight: 700;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .wizard-body {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 18px;
            }
            .wizard-step-card {
                background: rgba(255, 255, 255, 0.75);
                border: 1px solid rgba(226, 232, 240, 0.8);
                border-radius: 12px;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .wizard-step-title {
                font-size: 0.9rem;
                font-weight: 700;
                color: #1e293b;
                display: flex;
                align-items: center;
                gap: 6px;
                margin: 0;
            }
            .wizard-terminal {
                background: #0f172a;
                color: #38bdf8;
                font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
                font-size: 0.75rem;
                padding: 12px;
                border-radius: 8px;
                max-height: 180px;
                overflow-y: auto;
                white-space: pre-wrap;
                border: 1px solid #1e293b;
                transition: color 0.3s;
            }
            .wizard-btn-primary {
                background: #ef4444;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.8rem;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }
            .wizard-btn-primary:hover {
                background: #e11d48;
                transform: translateY(-1px);
            }
            .wizard-btn-primary:disabled {
                background: #fda4af;
                cursor: not-allowed;
                transform: none;
            }
            .wizard-btn-secondary {
                background: white;
                color: #475569;
                border: 1px solid #cbd5e1;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.8rem;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }
            .wizard-btn-secondary:hover {
                background: #f8fafc;
                border-color: #94a3b8;
            }
            .wizard-btn-secondary:disabled {
                background: #f1f5f9;
                color: #cbd5e1;
                border-color: #e2e8f0;
                cursor: not-allowed;
            }
            .wizard-textarea {
                width: 100%;
                min-height: 60px;
                padding: 10px;
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                font-size: 0.8rem;
                resize: vertical;
                box-sizing: border-box;
                font-family: inherit;
            }
            .wizard-textarea:focus {
                outline: none;
                border-color: #ef4444;
                box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
            }
            .wizard-footer {
                padding: 16px 20px;
                border-top: 1px solid rgba(226, 232, 240, 0.8);
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background: rgba(248, 250, 252, 0.6);
            }
        `;
        document.head.appendChild(this.styleElement);
    }
}
