const axios = require('axios');

const SYSTEM_PROMPT = `你是一位苏格拉底式的智能思维引导师，你的核心使命是通过启发式提问引导用户自主思考，绝对禁止直接给出答案。

严格遵守以下规则：
1. 永远不要直接给出标准答案或解决方案
2. 始终以提问的方式引导用户思考
3. 问题要层层递进，从基础到深入
4. 当用户答错时，通过追问帮助用户发现错误，而非直接纠正
5. 用引导性语言，如："你为什么会这么认为呢？"、"能否再深入思考一下这个点？"
6. 保持耐心，鼓励用户自主推导

你的目标是帮助用户构建自己的知识体系，而不是灌输知识。`;

const KNOWLEDGE_PARSER_PROMPT = `请帮我分析以下学习资料，提取其中的知识点并构建结构化的知识框架：

学习资料内容：
{content}

请按照JSON格式输出，不要有任何多余内容：
{
  "mainPoints": ["主知识点1", "主知识点2", ...],
  "knowledgeTree": [
    {
      "id": "point1",
      "title": "知识点标题",
      "description": "知识点描述",
      "parentId": "parent_point_id",
      "level": 1
    }
  ],
  "relations": [
    { "from": "pointA", "to": "pointB", "type": "prerequisite" }
  ]
}

要求：主知识点不超过5个，层次清晰，便于学习。`;

const QUESTION_GENERATOR_PROMPT = `请基于以下知识点生成一个苏格拉底式的反向提问：

知识点：{knowledgePoint}
知识点描述：{description}
用户学习水平：{userLevel}（初级/中级/高级）

请按照以下JSON格式输出：
{
  "question": "苏格拉底式提问（引导用户自主思考，不要直接问答案）",
  "hint": "解题思路提示（隐藏，点击展开）",
  "briefAnswer": "简要答案（隐藏，点击展开）"
}

要求：
1. question要引导用户深入思考，从应用场景、对比分析、假设推理等角度提问
2. 不要直接提问"什么是XX"之类的问题
3. hint是解题的关键思路提示，帮助学生找到方向
4. briefAnswer是简要的正确答案，供学生核对`;

const ANSWER_ANALYZER_PROMPT = `请分析以下对话，判断用户答案的正确性并分类错因：

知识点：{knowledgePoint}
知识点描述：{description}
用户答案：{userAnswer}

请按照以下JSON格式输出分析结果：
{
  "correctness": "正确|部分正确|错误",
  "errorType": "概念错误|逻辑错误|遗漏要点|理解偏差|计算错误|其他",
  "explanation": "详细的分析说明",
  "suggestion": "引导方向建议"
}

要求：分析客观准确，错因分类清晰。`;

const FOLLOW_UP_GENERATOR_PROMPT = `请基于以下信息生成一个启发式追问，引导用户深入思考：

知识点：{knowledgePoint}
用户答案：{userAnswer}
分析结果：{analysis}

要求：
1. 不要直接指出错误
2. 不要直接给出正确答案
3. 以提问的方式引导用户自我发现
4. 语言友好、鼓励性强
5. 只输出追问问题，不要有其他解释`;

const REPORT_GENERATOR_PROMPT = `请基于用户的学习数据生成一份个性化学习复盘报告：

用户ID：{userId}
学习知识点：{knowledgePoints}
学习时长：{duration}分钟
交互次数：{interactions}次
正确次数：{correctCount}次
错误类型分布：{errorDistribution}
知识点掌握度变化：{masteryChange}%

请生成一份详细的复盘报告，包含：
1. 本次学习成果总结
2. 知识点掌握情况分析
3. 主要错误类型及改进建议
4. 下一步学习建议
5. 鼓励性结语

要求：报告内容详实、个性化、语言亲切自然。`;

const mockQuestions = [
  JSON.stringify({
    question: '如果将这个知识点应用到日常生活中，你会如何解释它的作用？请思考一下生活中的实际场景。',
    hint: '可以从身边的现象入手，思考这个知识点在现实中有什么对应的例子。',
    briefAnswer: '通过生活中的具体案例来理解和解释该知识点的实际作用和意义。'
  }),
  JSON.stringify({
    question: '假设我们改变其中一个关键条件，会对最终结果产生什么影响？这种影响是如何产生的？',
    hint: '分析各个条件之间的关系，思考哪些是关键因素，改变它们会带来什么连锁反应。',
    briefAnswer: '条件的改变会影响相关变量的关系，从而导致结果的相应变化。'
  }),
  JSON.stringify({
    question: '这个概念与你之前学过的哪个知识点有相似之处？它们的本质区别又是什么？',
    hint: '对比分析两个概念的共同点和不同点，关注它们的适用场景和核心特征。',
    briefAnswer: '相似点在于某些核心原理相通，区别在于适用范围和具体表现形式不同。'
  }),
  JSON.stringify({
    question: '如果让你用一句话向完全不了解这个领域的人解释这个知识点，你会怎么说？',
    hint: '抓住最核心的特征，用最通俗易懂的语言来表达，避免使用专业术语。',
    briefAnswer: '用简洁通俗的语言解释核心概念，让非专业人士也能理解。'
  }),
  JSON.stringify({
    question: '这个知识点的核心原理是什么？能否结合自己的理解，用自己的话来描述？',
    hint: '思考这个知识点最根本的逻辑是什么，为什么要这样设定。',
    briefAnswer: '核心原理是整个知识体系的基础，用自己的话重新表述可以加深理解。'
  })
];

const mockFollowUps = [
  '你为什么会这么认为呢？能否解释一下你的思考过程？',
  '这个角度很有意思，能否再深入思考一下这个点？',
  '如果换个角度看这个问题，你会有什么不同的发现？',
  '你提到了这一点，那你觉得还有哪些因素需要考虑？',
  '能否举一个具体的例子来说明你的观点？',
  '这个想法很有启发性，再想想看有没有遗漏的地方？',
  '如果我们从反面来思考这个问题，会得出什么结论？'
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

class AIService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    this.useMock = !this.apiKey || this.apiKey === 'your_deepseek_api_key_here';
    console.log('AI服务配置:', {
      provider: 'DeepSeek',
      apiUrl: this.apiUrl,
      model: this.model,
      useMock: this.useMock
    });
  }

  async callAI(prompt) {
    if (this.useMock) {
      console.log('使用模拟响应（未配置API Key或为测试环境）');
      return this.generateMockResponse(prompt);
    }

    try {
      console.log('调用DeepSeek API:', { model: this.model, promptLength: prompt.length });
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('API响应成功');
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('DeepSeek API 调用失败:', error.response?.data || error.message);
      console.log('回退到模拟响应');
      return this.generateMockResponse(prompt);
    }
  }

  generateMockResponse(prompt) {
    if (prompt.includes('生成一个苏格拉底式的反向提问')) {
      return getRandomItem(mockQuestions);
    }
    
    if (prompt.includes('分析以下学习资料') || prompt.includes('提取其中的知识点')) {
      return JSON.stringify({
        mainPoints: ['数学函数', '物理力学', '化学方程式'],
        knowledgeTree: [
          { id: 'point1', title: '函数的定义与性质', description: '理解函数的基本概念和性质', parentId: '', level: 1 },
          { id: 'point2', title: '函数的图像与变换', description: '掌握函数图像的绘制和变换方法', parentId: '', level: 1 },
          { id: 'point3', title: '常见函数类型', description: '学习常见函数的特点和应用', parentId: '', level: 1 },
          { id: 'point4', title: '函数的应用', description: '函数在实际问题中的应用', parentId: '', level: 1 }
        ],
        relations: []
      });
    }
    
    if (prompt.includes('分析以下对话') || prompt.includes('判断用户答案')) {
      const correctness = Math.random() > 0.5 ? '正确' : (Math.random() > 0.5 ? '部分正确' : '错误');
      const errorTypes = ['概念错误', '逻辑错误', '遗漏要点', '理解偏差', '计算错误', '其他'];
      return JSON.stringify({
        correctness,
        errorType: correctness === '正确' ? '其他' : getRandomItem(errorTypes),
        explanation: correctness === '正确'
          ? '回答正确，你对这个知识点有很好的理解！'
          : '你的回答有一些需要改进的地方，请继续思考。',
        suggestion: '请继续深入思考这个问题'
      });
    }
    
    if (prompt.includes('生成一个启发式追问')) {
      return getRandomItem(mockFollowUps);
    }
    
    if (prompt.includes('学习数据') || prompt.includes('复盘报告')) {
      return `## 学习复盘报告

### 一、本次学习成果总结
你完成了「数学函数」知识点的学习，表现出色！

### 二、知识点掌握情况分析
- 函数的定义与性质：掌握度 85%
- 函数的图像与变换：掌握度 70%
- 常见函数类型：掌握度 90%

### 三、主要错误类型及改进建议
- 概念理解：建议多做相关练习加深理解
- 逻辑推理：可以尝试用思维导图梳理思路

### 四、下一步学习建议
1. 复习本次学习的知识点
2. 完成相关练习题
3. 尝试将知识应用到实际问题中

### 五、结语
继续保持，你的努力一定会有收获！🎉`;
    }
    
    return '这是一个模拟响应';
  }

  async parseKnowledge(content) {
    const prompt = KNOWLEDGE_PARSER_PROMPT.replace('{content}', content);
    const result = await this.callAI(prompt);
    try {
      const parsed = this.extractJSON(result);

      if (!parsed.mainPoints || parsed.mainPoints.length === 0) {
        console.log('AI返回空结果，使用模拟数据');
        return this.generateMockKnowledge(content);
      }

      return parsed;
    } catch (e) {
      console.log('JSON解析失败:', e.message, '| 原始响应前200字:', result.substring(0, 200));
      return this.generateMockKnowledge(content);
    }
  }

  // 从 LLM 响应中提取 JSON（处理 markdown 代码块等包装）
  extractJSON(text) {
    // 尝试匹配 ```json ... ``` 代码块
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1].trim());
    }
    // 尝试匹配 { ... } 最外层 JSON 对象
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    // 直接解析
    return JSON.parse(text.trim());
  }

  generateMockKnowledge(content) {
    const knowledgePoints = [];
    let id = 1;
    
    if (content.includes('共产党宣言') || content.includes('马克思')) {
      knowledgePoints.push(
        { id: `point${id++}`, title: '《共产党宣言》的历史背景', description: '1848年发表，是马克思主义诞生的重要标志', parentId: '', level: 1 },
        { id: `point${id++}`, title: '阶级斗争理论', description: '人类社会的发展史就是阶级斗争的历史', parentId: '', level: 1 },
        { id: `point${id++}`, title: '资产阶级与无产阶级', description: '资本主义社会两大对立阶级的产生与发展', parentId: '', level: 1 },
        { id: `point${id++}`, title: '共产主义目标', description: '实现人的自由全面发展', parentId: '', level: 1 },
        { id: `point${id++}`, title: '国际主义精神', description: '全世界无产者联合起来', parentId: '', level: 1 }
      );
    } else if (content.includes('函数') || content.includes('数学')) {
      knowledgePoints.push(
        { id: `point${id++}`, title: '函数的定义与性质', description: '理解函数的基本概念和性质', parentId: '', level: 1 },
        { id: `point${id++}`, title: '函数的图像与变换', description: '掌握函数图像的绘制和变换方法', parentId: '', level: 1 },
        { id: `point${id++}`, title: '常见函数类型', description: '学习常见函数的特点和应用', parentId: '', level: 1 }
      );
    } else if (content.includes('物理') || content.includes('力学')) {
      knowledgePoints.push(
        { id: `point${id++}`, title: '牛顿运动定律', description: '三大运动定律的基本内容', parentId: '', level: 1 },
        { id: `point${id++}`, title: '力学平衡', description: '物体平衡的条件和应用', parentId: '', level: 1 },
        { id: `point${id++}`, title: '动量与能量', description: '动量守恒和能量守恒定律', parentId: '', level: 1 }
      );
    } else {
      knowledgePoints.push(
        { id: `point${id++}`, title: '知识点1', description: '主要概念和核心内容', parentId: '', level: 1 },
        { id: `point${id++}`, title: '知识点2', description: '相关理论和应用', parentId: '', level: 1 },
        { id: `point${id++}`, title: '知识点3', description: '实际应用案例', parentId: '', level: 1 }
      );
    }
    
    return {
      mainPoints: knowledgePoints.map(p => p.title),
      knowledgeTree: knowledgePoints,
      relations: []
    };
  }

  async generateQuestion(knowledgePoint, description, userLevel = '中级') {
    const prompt = QUESTION_GENERATOR_PROMPT
      .replace('{knowledgePoint}', knowledgePoint)
      .replace('{description}', description)
      .replace('{userLevel}', userLevel);
    const result = await this.callAI(prompt);
    try {
      const parsed = typeof result === 'string' ? this.extractJSON(result) : result;
      if (parsed.question) {
        return {
          question: parsed.question,
          hint: parsed.hint || '',
          briefAnswer: parsed.briefAnswer || ''
        };
      }
      return { question: result, hint: '', briefAnswer: '' };
    } catch {
      return { question: result, hint: '', briefAnswer: '' };
    }
  }

  async analyzeAnswer(knowledgePoint, description, userAnswer) {
    const prompt = ANSWER_ANALYZER_PROMPT
      .replace('{knowledgePoint}', knowledgePoint)
      .replace('{description}', description)
      .replace('{userAnswer}', userAnswer);
    const result = await this.callAI(prompt);
    try {
      return this.extractJSON(result);
    } catch {
      return {
        correctness: '部分正确',
        errorType: '其他',
        explanation: '分析失败',
        suggestion: '请重新回答'
      };
    }
  }

  async generateFollowUp(knowledgePoint, userAnswer, analysis) {
    const prompt = FOLLOW_UP_GENERATOR_PROMPT
      .replace('{knowledgePoint}', knowledgePoint)
      .replace('{userAnswer}', userAnswer)
      .replace('{analysis}', JSON.stringify(analysis));
    return await this.callAI(prompt);
  }

  async generateReport(userId, knowledgePoints, duration, interactions, correctCount, errorDistribution, masteryChange) {
    const prompt = REPORT_GENERATOR_PROMPT
      .replace('{userId}', userId)
      .replace('{knowledgePoints}', knowledgePoints.join(', '))
      .replace('{duration}', duration)
      .replace('{interactions}', interactions)
      .replace('{correctCount}', correctCount)
      .replace('{errorDistribution}', JSON.stringify(errorDistribution))
      .replace('{masteryChange}', masteryChange);
    return await this.callAI(prompt);
  }
}

module.exports = new AIService();