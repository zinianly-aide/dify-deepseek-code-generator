const fs = require('fs');
const path = require('path');
const https = require('https');

class DifyDeepSeekCodeGenerator {
    constructor(apiKey, baseUrl = 'http://localhost/v1') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
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
        return {
            inputs: {},
            query: template ? template + '\n\n' + question : question,
            response_mode: responseMode,
            conversation_id: conversationId,
            user: 'nodejs-client',
            files: files
        };
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
                    let fileName = 'code_' + (index + 1) + '.' + language;
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
     * 主函数：根据问题生成代码并创建文件
     * @param {string} question - 用户的问题或需求
     * @param {string} template - 代码模板（可选）
     * @param {string} outputDir - 输出目录（可选）
     * @param {string} conversationId - 会话ID（可选）
     * @param {Array} files - 文件列表（可选）
     * @param {string} responseMode - 响应模式：'blocking'或'streaming'（可选，默认'blocking'）
     * @param {Function} onStreamChunk - 流式响应的回调函数（可选）
     */
    async generateCode(question, template = '', outputDir = './output', conversationId = '', files = [], responseMode = 'blocking', onStreamChunk = null) {
        try {
            console.log('正在准备请求...');
            const requestBody = this.buildRequestBody(question, template, conversationId, files, responseMode);
            
            console.log('正在发送请求到Dify DeepSeek模型...');
            const response = await this.sendRequest(requestBody, onStreamChunk);
            
            console.log('正在提取DeepSeek回复...');
            const dsResponse = this.extractDeepSeekResponse(response);
            
            console.log('\nDeepSeek回复:\n' + dsResponse + '\n');
            
            console.log('正在根据回复创建文件...');
            await this.createFilesFromContent(dsResponse, outputDir);
            
            console.log('代码生成完成！');
            return dsResponse;
        } catch (error) {
            console.error('代码生成失败:', error.message);
            throw error;
        }
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
            console.log('示例1：使用阻塞式响应模式');
            await generator.generateCode(question, codeTemplate, './output_blocking', '', files);
            
            console.log('\n示例2：使用流式响应模式');
            // 定义流式响应回调函数
            const streamCallback = (chunk, isComplete) => {
                if (isComplete) {
                    console.log('\n流式响应已完成');
                } else {
                    process.stdout.write(chunk); // 实时输出流数据
                }
            };
            
            await generator.generateCode(
                question,
                codeTemplate,
                './output_streaming',
                '',
                files,
                'streaming',
                streamCallback
            );
        } catch (error) {
            console.error('示例执行失败:', error);
        }
    }
    
    example();
}