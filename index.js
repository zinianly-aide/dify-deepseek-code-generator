const fs = require('fs');
const path = require('path');
const https = require('https');

// 引入mysql_mcp模块
const { mysqlMCP } = require('./mysql_mcp');
// 引入mcp_registry模块
const { mcpRegistry, JSONRPCParser } = require('./mcp_registry');
// 引入mcp_trigger_rules模块
const { mcpTriggerRules } = require('./mcp_trigger_rules');
// 引入mcp_capability_templates模块
const { mcpCapabilityTemplates } = require('./mcp_capability_templates');

class DifyDeepSeekCodeGenerator {
    constructor(apiKey, baseUrl = 'http://localhost/v1') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        
        // 监听MCP注册事件
        mcpRegistry.on('mcp.registered', (data) => {
            console.log(`MCP服务 ${data.name} 已注册，正在更新能力描述模板`);
            // 这里可以添加逻辑来动态更新MCP能力描述模板
            // 例如：如果是新的MCP服务，可以自动添加其能力描述到模板中
            if (data.metadata && data.metadata.capabilityTemplate) {
                mcpCapabilityTemplates.setTemplate(data.name, data.metadata.capabilityTemplate);
                console.log(`成功更新MCP服务 ${data.name} 的能力描述模板`);
            }
        });
        
        // 监听MCP注销事件
        mcpRegistry.on('mcp.unregistered', (data) => {
            console.log(`MCP服务 ${data.name} 已注销，正在更新能力描述模板`);
            // 这里可以添加逻辑来动态更新MCP能力描述模板
            // 例如：从模板中移除已注销的MCP服务描述
            // 注意：在实际生产环境中，可能需要更复杂的策略来处理模板更新
        });
    }

    /**
     * 构建发送给Dify Chat API的请求体
     * @param {string} question - 用户的问题或需求
     * @param {string} template - 代码模板（可选）
     * @param {string} conversationId - 会话ID（可选）
     * @param {Array} files - 文件列表（可选）
     * @param {string} responseMode - 响应模式：'blocking'或'streaming'（可选，默认'blocking'）
     * @returns {Object} 请求体
     */
    buildRequestBody(question, template = '', conversationId = '', files = [], responseMode = 'blocking') {
        // 获取详细的MCP服务能力描述信息，用于动态更新系统提示词
        const mcpServicesDescription = mcpCapabilityTemplates.generateSystemPromptFragment();
        
        // 将MCP服务描述信息添加到查询前，确保模型了解可用的MCP服务
        const enhancedQuery = mcpServicesDescription + '\n\n' + (template ? template + '\n\n' + question : question);
        
        return {
            inputs: {},
            query: enhancedQuery,
            response_mode: responseMode,
            conversation_id: conversationId,
            user: 'nodejs-client',
            files: files
        };
    }

    /**
     * 从外部文件加载模板
     * @param {string} templatePath - 模板文件的路径
     * @returns {string} 模板内容
     */
    loadTemplateFromFile(templatePath) {
        if (!templatePath) {
            return '';
        }
        
        try {
            // 确保路径是绝对路径或相对于当前工作目录
            const absolutePath = path.isAbsolute(templatePath) 
                ? templatePath 
                : path.join(process.cwd(), templatePath);
            
            if (!fs.existsSync(absolutePath)) {
                throw new Error(`模板文件不存在: ${templatePath}`);
            }
            
            return fs.readFileSync(absolutePath, 'utf8');
        } catch (error) {
            console.error('加载模板文件失败:', error.message);
            throw error;
        }
    }

    /**
     * 发送请求到Dify的Chat API
     * @param {Object} requestBody - 请求体
     * @param {Function} onStreamChunk - 流式响应的回调函数（可选）
     * @returns {Promise<Object>} API返回的响应
     */
    async sendRequest(requestBody, onStreamChunk = null) {
        return new Promise((resolve, reject) => {
            // 解析URL以获取hostname和其他部分
            const url = new URL(this.baseUrl + '/chat-messages');
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.apiKey
                }
            };

            // 根据URL协议选择http或https模块
            const httpModule = url.protocol === 'https:' ? https : require('http');
            
            const req = httpModule.request(options, (res) => {
                let data = '';
                let fullAnswer = '';
                let isStreamingComplete = false;

                res.on('data', (chunk) => {
                    if (requestBody.response_mode === 'streaming') {
                        // 处理流式响应
                        try {
                            const chunkStr = chunk.toString();
                            // 检查是否包含完整的JSON对象（可能在流结束时）
                            if (chunkStr.trim().startsWith('{') && chunkStr.trim().endsWith('}')) {
                                const parsedChunk = JSON.parse(chunkStr);
                                if (parsedChunk.answer) {
                                    fullAnswer = parsedChunk.answer;
                                    if (onStreamChunk) {
                                        onStreamChunk(parsedChunk.answer, true);
                                    }
                                    isStreamingComplete = true;
                                }
                            } else {
                                // 处理SSE格式的流式响应
                                const lines = chunkStr.split('\n');
                                for (const line of lines) {
                                    if (line.trim().startsWith('data:')) {
                                        const dataPart = line.substring(5).trim();
                                        if (dataPart === '[DONE]') {
                                            isStreamingComplete = true;
                                            if (onStreamChunk) {
                                                onStreamChunk(fullAnswer, true);
                                            }
                                        } else {
                                            try {
                                                const parsedData = JSON.parse(dataPart);
                                                if (parsedData.answer) {
                                                    fullAnswer += parsedData.answer;
                                                    if (onStreamChunk) {
                                                        onStreamChunk(parsedData.answer, false);
                                                    }
                                                }
                                            } catch (e) {
                                                console.warn('解析流数据失败:', e);
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (error) {
                            console.warn('处理流式数据失败:', error);
                        }
                    } else {
                        // 阻塞式响应，累积数据
                        data += chunk;
                    }
                });

                res.on('end', () => {
                    try {
                        if (requestBody.response_mode === 'streaming') {
                            // 对于流式响应，返回完整的answer
                            resolve({ answer: fullAnswer });
                        } else {
                            // 阻塞式响应，解析完整的JSON
                            const response = JSON.parse(data);
                            resolve(response);
                        }
                    } catch (error) {
                        reject(new Error('解析响应失败: ' + error.message));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error('请求失败: ' + error.message));
            });

            req.write(JSON.stringify(requestBody));
            req.end();
        });
    }

    /**
     * 从Dify响应中提取DeepSeek的回复
     * @param {Object} response - Dify API返回的响应
     * @returns {string} DeepSeek的回复内容
     */
    extractDeepSeekResponse(response) {
        console.log('response', response);
        // 根据用户提供的Dify API响应体格式提取回复内容
        if (response && response.answer) {
            return response.answer;
        }
        throw new Error('未能从响应中提取DeepSeek回复');
    }

    /**
     * 检测DeepSeek响应中的特定标记命令
     * @param {string} content - DeepSeek的回复内容
     * @returns {Array} 检测到的命令列表
     */
    detectMCPCmds(content) {
        // 修复正则表达式以确保正确捕获完整的MCP命令
        const cmdPattern = /\[MCP\]\s*\((.+?)\)/g;
        const cmds = [];
        let match;
        
        while ((match = cmdPattern.exec(content)) !== null) {
            cmds.push(match[1].trim());
        }
        
        return cmds;
    }

    /**
     * 处理MCP命令
     * 支持两种格式:
     * 1. 传统格式: server_name:tool_name?param1=value1&param2=value2
     * 2. JSON-RPC 2.0格式: {"jsonrpc":"2.0","method":"server_name:tool_name","params":{...},"id":1}
     * @param {string|Object} cmd - MCP命令或JSON-RPC请求对象
     * @returns {Promise<Object>} 命令执行结果
     */
    async handleMCPCommand(cmd) {
        try {
            console.log(`检测到MCP命令: ${typeof cmd === 'string' ? cmd : JSON.stringify(cmd)}`);
            
            // 检查是否为JSON-RPC格式请求
            if (typeof cmd === 'object' && cmd.jsonrpc === '2.0' && cmd.method) {
                return await mcpRegistry.executeJSONRPC(cmd);
            }
            
            // 传统格式命令处理
            if (typeof cmd === 'string') {
                // 解析命令格式: server_name:tool_name?param1=value1&param2=value2
                const [serverToolPart, paramsPart] = cmd.split('?');
                const [serverName, toolName] = serverToolPart.split(':');
                
                // 解析参数
                const params = {};
                if (paramsPart) {
                    paramsPart.split('&').forEach(param => {
                        const [key, value] = param.split('=');
                        params[key] = decodeURIComponent(value);
                    });
                }
                
                // 使用MCP注册表执行命令
                const result = await mcpRegistry.executeCommand(serverName, toolName, params);
                return result;
            }
            
            throw new Error('无效的MCP命令格式');
        } catch (error) {
            console.error('处理MCP命令失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 处理MySQL相关的MCP命令
     * @param {string} toolName - 工具名称
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} - 命令执行结果
     */
    async handleMySQLCommand(toolName, params) {
        try {
            switch (toolName) {
                case 'connect':
                    // 连接到MySQL数据库
                    const connectionResult = await mysqlMCP.connect({
                        host: params.host || 'localhost',
                        port: params.port ? parseInt(params.port) : 3306,
                        user: params.user || 'user',
                        password: params.password || 'userpassword',
                        database: params.database || 'testdb'
                    });
                    return connectionResult.success 
                        ? connectionResult.message 
                        : `MySQL连接失败: ${connectionResult.error}`;
                        
                case 'get_tables':
                    // 获取数据库中的所有表
                    const tablesResult = await mysqlMCP.getTables();
                    if (!tablesResult.success) {
                        return `获取表列表失败: ${tablesResult.error}`;
                    }
                    return `数据库表列表: ${tablesResult.tables.join(', ')}`;
                    
                case 'describe_table':
                    // 获取表结构
                    if (!params.table) {
                        return '参数错误: 缺少表名(table)';
                    }
                    const tableResult = await mysqlMCP.getTableStructure(params.table);
                    if (!tableResult.success) {
                        return `获取表结构失败: ${tableResult.error}`;
                    }
                    // 格式化表结构输出
                    let structureOutput = `表结构: ${tableResult.tableName}\n`;
                    structureOutput += '列名 | 类型 | 是否为空 | 键\n';
                    structureOutput += '-----|-----|----------|-----\n';
                    tableResult.structure.columns.forEach(col => {
                        structureOutput += `${col.name} | ${col.type} | ${col.null ? '是' : '否'} | ${col.key || '-'}\n`;
                    });
                    return structureOutput;
                    
                case 'generate_description':
                    // 生成表结构描述（用于大模型）
                    if (!params.tables) {
                        return '参数错误: 缺少表名(tables)，多个表用逗号分隔';
                    }
                    const tableNames = params.tables.split(',').map(t => t.trim());
                    const descriptionResult = await mysqlMCP.generateTableDescription(tableNames);
                    if (!descriptionResult.success) {
                        return `生成表结构描述失败: ${descriptionResult.error}`;
                    }
                    return descriptionResult.description;
                    
                case 'execute_query':
                    // 执行SQL查询
                    if (!params.sql) {
                        return '参数错误: 缺少SQL查询语句(sql)';
                    }
                    const queryResult = await mysqlMCP.executeQuery(params.sql);
                    if (!queryResult.success) {
                        return `执行查询失败: ${queryResult.error}`;
                    }
                    return `查询成功，返回 ${queryResult.rowCount} 条记录`;
                    
                case 'disconnect':
                    // 断开连接
                    await mysqlMCP.disconnect();
                    return '已断开MySQL连接';
                    
                default:
                    return `未知的MySQL工具: ${toolName}`;
            }
        } catch (error) {
            console.error('MySQL命令执行失败:', error);
            return `MySQL命令执行失败: ${error.message}`;
        }
    }

    /**
     * 解析代码块并创建文件
     * @param {string} content - 包含代码块的内容
     * @param {string} outputDir - 输出目录
     */
    async createFilesFromContent(content, outputDir = './output') {
        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 使用更简单的方式匹配代码块
        const lines = content.split('\n');
        let inCodeBlock = false;
        let currentLanguage = '';
        let currentFilePath = '';
        let currentContent = [];
        let hasFiles = false;
        let codeBlockIndex = 0;

        // 逐行解析内容
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 检查是否是代码块开始
            if (line.startsWith('```')) {
                if (inCodeBlock) {
                    // 代码块结束，处理当前文件
                    if (currentFilePath) {
                        hasFiles = true;
                        const fullPath = path.join(outputDir, currentFilePath);
                        const fileDir = path.dirname(fullPath);
                        
                        if (!fs.existsSync(fileDir)) {
                            fs.mkdirSync(fileDir, { recursive: true });
                        }
                        
                        fs.writeFileSync(fullPath, currentContent.join('\n'));
                        console.log('已创建文件: ' + fullPath);
                    }
                    
                    // 重置状态
                    inCodeBlock = false;
                    currentLanguage = '';
                    currentFilePath = '';
                    currentContent = [];
                    codeBlockIndex++;
                } else {
                    // 代码块开始
                    inCodeBlock = true;
                    currentLanguage = line.substring(3).trim();
                }
            } else if (inCodeBlock && line.startsWith('// 文件名:')) {
                // 提取文件名
                currentFilePath = line.substring(6).trim();
            } else if (inCodeBlock && currentFilePath && !line.startsWith('// ')) {
                // 收集文件内容（跳过注释行）
                currentContent.push(lines[i]);
            }
        }

        // 如果没有找到带文件名的代码块，尝试创建默认文件
        if (!hasFiles) {
            // 简单查找所有代码块并创建默认文件
            const codeBlocks = content.match(/```([\w]+)?\s*([\s\S]*?)```/g) || [];
            
            if (codeBlocks.length > 0) {
                hasFiles = true;
                codeBlocks.forEach((block, index) => {
                    let language = block.match(/```([\w]+)/)?.[1] || 'txt';
                    let content = block.replace(/```[\w]*\s*|```/g, '').trim();
                    let fileName = this.generateSmartFileName(content, index, language);
                    let fullPath = path.join(outputDir, fileName);
                    
                    fs.writeFileSync(fullPath, content);
                    console.log('已创建文件: ' + fullPath);
                });
            }
        }

        // 如果仍未找到代码块，创建一个包含所有内容的文本文件
        if (!hasFiles) {
            const fullPath = path.join(outputDir, 'response.txt');
            fs.writeFileSync(fullPath, content);
            console.log('已创建文件: ' + fullPath);
        }
    }

    /**
     * 根据代码内容智能生成文件名
     * @param {string} content - 代码内容
     * @param {number} index - 代码块索引
     * @param {string} language - 代码语言
     * @returns {string} 生成的文件名
     */
    generateSmartFileName(content, index, language) {
        const lines = content.split('\n');
        
        // React组件识别
        if (language === 'javascript' || language === 'jsx') {
            // 检查是否有App组件
            if (content.includes('function App') || content.includes('const App =')) {
                return 'App.js';
            }
            // 检查是否有ReactDOM.render或createRoot
            if (content.includes('ReactDOM.createRoot') || content.includes('ReactDOM.render')) {
                return 'index.js';
            }
            // 检查是否有export default
            const defaultExport = lines.find(line => line.includes('export default'));
            if (defaultExport) {
                const match = defaultExport.match(/export default\s+(\w+)/);
                if (match && match[1]) {
                    return match[1] + '.js';
                }
            }
        }
        
        // Bash脚本识别
        if (language === 'bash') {
            // 检查是否有特定的命令
            if (content.includes('npm start') && content.includes('create-react-app')) {
                return 'start_react.sh';
            }
            return 'script.sh';
        }
        
        // HTML文件识别
        if (language === 'html') {
            if (content.includes('<html') || content.includes('<body')) {
                return 'index.html';
            }
        }
        
        // 其他情况使用默认命名
        return 'code_' + (index + 1) + '.' + language;
    }

    /**
     * 主函数：根据问题生成代码并创建文件
     * @param {string} question - 用户的问题或需求
     * @param {string} template - 代码模板（可选）
     * @param {string} outputDir - 输出目录（可选）
     * @param {string} conversationId - 会话ID（可选）
     * @param {Array} files - 文件列表（可选）
     * @param {string} responseMode - 响应模式：'blocking'或'streaming'（可选，默认'blocking'）
     * @param {Function} onStreamChunk - 流式响应的回调函数（可选）
     * @param {string} templateFilePath - 模板文件路径（可选，如果提供，将覆盖template参数）
     */
    async generateCode(question, template = '', outputDir = './output', conversationId = '', files = [], responseMode = 'blocking', onStreamChunk = null, templateFilePath = '') {
        try {
            console.log('正在准备请求...');
            
            // 如果提供了模板文件路径，从文件加载模板
            let finalTemplate = template;
            if (templateFilePath) {
                console.log(`正在从文件加载模板: ${templateFilePath}`);
                finalTemplate = this.loadTemplateFromFile(templateFilePath);
                console.log('从文件加载的模板:', finalTemplate);
            }
            
            // 自动触发规则1: 分析用户请求是否需要MCP服务支持
            const mcpTriggerInfo = mcpTriggerRules.analyzeRequest(question);
            let mcpResults = {};
            
            if (mcpTriggerInfo) {
                console.log(`自动触发MCP调用: ${mcpTriggerInfo.serverName}:${mcpTriggerInfo.toolName}`);
                // 执行MCP调用
                const result = await this.handleMCPCommand(`${mcpTriggerInfo.serverName}:${mcpTriggerInfo.toolName}?${this._formatParamsForCommand(mcpTriggerInfo.params)}`);
                
                if (result.success) {
                    console.log(`MCP调用成功: ${result.message}`);
                    // 保存MCP调用结果，用于增强后续查询
                    mcpResults[`${mcpTriggerInfo.serverName}:${mcpTriggerInfo.toolName}`] = result.message;
                } else {
                    console.error(`MCP调用失败: ${result.error}`);
                }
            }
            
            // 构建请求体，并将MCP调用结果添加到查询中
            let enhancedQuestion = question;
            if (Object.keys(mcpResults).length > 0) {
                enhancedQuestion += '\n\n已获取的相关信息:\n';
                for (const [cmd, result] of Object.entries(mcpResults)) {
                    enhancedQuestion += `- ${cmd}: ${result}\n`;
                }
            }
            
            const requestBody = this.buildRequestBody(enhancedQuestion, finalTemplate, conversationId, files, responseMode);
            
            console.log('正在发送请求到Dify DeepSeek模型...');
            const response = await this.sendRequest(requestBody, onStreamChunk);
            
            console.log('正在提取DeepSeek回复...');
            const dsResponse = this.extractDeepSeekResponse(response);
            
            console.log('\nDeepSeek回复:\n' + dsResponse + '\n');
            
            // 自动触发规则2: 检查模型回复中是否有低置信度的暗示
            // 这里简化实现，实际应用中可能需要更复杂的NLP分析
            if (dsResponse.includes('可能') || dsResponse.includes('不确定') || dsResponse.includes('大概') || dsResponse.includes('大约')) {
                console.log('检测到模型回复中包含不确定的表述，尝试通过MCP获取更准确的信息');
                // 再次分析用户请求，以获取更准确的MCP调用信息
                const lowConfidenceTriggerInfo = mcpTriggerRules.analyzeRequest(question, 0.5); // 假设置信度为0.5
                if (lowConfidenceTriggerInfo) {
                    console.log(`低置信度触发MCP调用: ${lowConfidenceTriggerInfo.serverName}:${lowConfidenceTriggerInfo.toolName}`);
                    const result = await this.handleMCPCommand(`${lowConfidenceTriggerInfo.serverName}:${lowConfidenceTriggerInfo.toolName}?${this._formatParamsForCommand(lowConfidenceTriggerInfo.params)}`);
                    if (result.success) {
                        console.log(`低置信度MCP调用成功，结果将用于优化回答`);
                        // 这里可以选择重新生成回答，或者直接使用MCP结果来增强当前回答
                        // 简化实现：在返回结果中添加MCP获取的额外信息
                        return dsResponse + '\n\n[额外信息（来自MCP服务）]:\n' + result.message;
                    }
                }
            }
            
            // 检查是否包含手动触发的MCP命令
            const mcpCmds = this.detectMCPCmds(dsResponse);
            if (mcpCmds.length > 0) {
                console.log(`检测到 ${mcpCmds.length} 个MCP命令，正在执行...`);
                for (const cmd of mcpCmds) {
                    const result = await this.handleMCPCommand(cmd);
                    if (result.success) {
                        console.log(`命令执行成功: ${result.message}`);
                    } else {
                        console.error(`命令执行失败: ${result.error}`);
                    }
                }
            }
            
            console.log('正在根据回复创建文件...');
            await this.createFilesFromContent(dsResponse, outputDir);
            
            console.log('代码生成完成！');
            return dsResponse;
        } catch (error) {
            console.error('代码生成失败:', error.message);
            throw error;
        }
    }
    
    /**
     * 将参数对象格式化为命令行参数字符串
     * @param {Object} params - 参数对象
     * @returns {string} 格式化后的参数字符串
     * @private
     */
    _formatParamsForCommand(params) {
        return Object.entries(params)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
    }
}

// 导出类以便在其他文件中使用
module.exports = DifyDeepSeekCodeGenerator;

// 如果直接运行此文件，提供一个简单的示例
if (require.main === module) {
    // 示例用法
    async function example() {
        // 这里应该从环境变量或配置文件中获取API密钥
    
        // const apiKey = 'app-qy82BxH7hEOsab34M3ytPjgT';  
        const apiKey = 'app-OhD8h8XfPg2apHjNikIjJKSO';
        if (!apiKey) {
            console.error('请提供Dify API密钥');
            return;
        }
        
        const generator = new DifyDeepSeekCodeGenerator(apiKey);
        
        // 示例问题和代码模板
        const codeTemplate = '请按照以下格式返回代码：\n```javascript\n// 文件名: example.js\n// 这里是JavaScript代码\n```\n\n请确保在代码块前添加正确的文件名注释。';
        
        // 创建一个示例模板文件
        const templateFilePath = './templates/code_template.txt';
        const templateDir = path.dirname(templateFilePath);
        if (!fs.existsSync(templateDir)) {
            fs.mkdirSync(templateDir, { recursive: true });
        }
        // fs.writeFileSync(templateFilePath, codeTemplate);
        console.log(`已创建示例模板文件: ${templateFilePath}`);
        
        const question = '请帮我写一个简单的Node.js函数，用于计算斐波那契数列的第n项';
        
        // 示例文件数组（按照用户提供的格式）
        const files = [
            {
                type: 'image',
                transfer_method: 'remote_url',
                url: 'https://cloud.dify.ai/logo/logo-site.png'
            }
        ];
        
        try {
            // console.log('示例1：使用阻塞式响应模式');
            // await generator.generateCode(question, codeTemplate, './output_blocking', '', files);
            
            // console.log('\n示例2：使用流式响应模式');
            // // 定义流式响应回调函数
            // const streamCallback = (chunk, isComplete) => {
            //     if (isComplete) {
            //         console.log('\n流式响应已完成');
            //     } else {
            //         process.stdout.write(chunk); // 实时输出流数据
            //     }
            // };
            
            // await generator.generateCode(
            //     question,
            //     codeTemplate,
            //     './output_streaming',
            //     '',
            //     files,
            //     'streaming',
            //     streamCallback
            // );
            
            console.log('\n示例3：使用外部模板文件');
            await generator.generateCode(
                question,
                '', // 这个参数将被templateFilePath覆盖
                './output_template_file',
                '',
                files,
                'blocking',
                null,
                templateFilePath // 使用外部模板文件
            );
        } catch (error) {
            console.error('示例执行失败:', error);
        }
    }
    
    example();
}