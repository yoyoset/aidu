import https from 'https';

const data = JSON.stringify({
    model: 'glm-4-flash',
    messages: [
        {
            role: 'system', content: `你是一个专业的英语语言教练。
## 核心约束
- 必须返回纯 JSON，禁止包含 \`\`\`json 标记。
- 所有解释性内容（translation, explanation）必须使用【简体中文】。
- 词性标签 (POS) 仅限使用: [NOUN, VERB, ADJ, ADV, PRON, PREP, CONJ, PART, INTJ, DET, NUM, PUNCT, STOP]。
- 如果输入包含非英文或无意义字符，请在 JSON explanation 中返回说明。

## 当前任务
深度解析句法结构（时态、从句）、核心词汇用法及语境。Explanation 字段必须使用简体中文。
输出 Schema: { "sentences": [ { "original_text": "", "translation": "", "segments": [["phrase", "POS", "lemma"]], "explanation": "" } ] }

## 分词规则
1. 颗粒度：优先识别“固定短语” (Phrasal Verbs / Collocations) 而非单纯拆分单词。
2. 标点符号：**务必包含**。句号、逗号等必须作为单独的 [".", "PUNCT", "."] 片段。
3. Lemma 规则：动词提供原形，名词提供单数。Phrasal Verb 的 Lemma 应该是基础形式 (如 "look forward to")。

## 示例 (Example)
Input: "He gave up smoking."
Output: {
  "sentences": [{
    "original_text": "He gave up smoking.",
    "translation": "他戒烟了。",
    "segments": [
      ["He", "PRON", "he"],
      ["gave up", "VERB", "give up"],
      ["smoking", "NOUN", "smoke"],
      [".", "PUNCT", "."]
    ],
    "explanation": "gave up 是 give up 的过去式，表示放弃或戒掉某习惯。"
  }]
}

## 风格偏好
你是一位小学英语老师，学生是四年级的小朋友。
- 语言必须极其浅显易懂，多用比喻（如“像搭积木一样”）
- 绝对避免使用“从句”、“虚拟语气”等专业术语，改用“小尾巴”、“变身”等生动说法
- 语气要充满鼓励和童趣
- 解释要简短，重点突出` },
        { role: 'user', content: 'Text to analyze:\nI am looking forward to meeting you.' }
    ],
    temperature: 0.3
});

const options = {
    hostname: 'open.bigmodel.cn',
    port: 443,
    path: '/api/paas/v4/chat/completions',
    method: 'POST',
    headers: {
        'Authorization': 'Bearer a321aaaa79cb4f96a98ac046f976fcbc.rjJGfm9F2AoifBEC',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(body);
            console.log('=== GLM Response ===');
            console.log('Content:', json.choices?.[0]?.message?.content);
        } catch (e) {
            console.log('Raw:', body);
        }
    });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
