#!/usr/bin/env node

const readline = require('readline');
const path = require('path');
const fs = require('fs');
const DifyDeepSeekCodeGenerator = require('./index');

// 创建命令行界面
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
});

// 解析命令行参数
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        outputDir: './output_cli',
        responseMode: 'blocking',
        templateFilePath: ''
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-o' || args[i] === '--output') {
            options.outputDir = args[i + 1] || options.outputDir;
            i++;
        } else if (args[i] === '-s' || args[i] === '--streaming') {
            options.responseMode = 'streaming';
        } else if (args[i] === '-t' || args[i] === '--template') {
            options.templateFilePath = args[i + 1] || '';
            i++;
        } else if (args[i] === '-h' || args[i] === '--help') {
            showHelp();
            process.exit(0);
        }
    }

    return options;
}

// 显示帮助信息
function showHelp() {
    console.log('Dify DeepSeek Code Generator CLI');
    console.log('--------------------------------');
    console.log('用法: node cli.js [选项]');
    console.log('');
    console.log('选项:');
    console.log('  -o, --output <目录>    指定输出目录 (默认: ./output_cli)');
    console.log('  -s, --streaming        使用流式响应模式');
    console.log('  -t, --template <文件>  指定模板文件路径');
    console.log('  -h, --help             显示帮助信息');
    console.log('');
    console.log('使用说明:');
    console.log('  在命令行中输入您想要实现的代码逻辑，按Enter键生成代码。');
    console.log('  输入exit或按Ctrl+C退出程序。');
}

// 主程序
async function main() {
    const options = parseArgs();
    
    console.log('====================================');
    console.log('     Dify DeepSeek Code Generator    ');
    console.log('====================================');
    console.log('输入您想要实现的代码逻辑，按Enter键生成代码。');
    console.log('输入exit或按Ctrl+C退出程序。');
    console.log('------------------------------------');
    
    // 获取API密钥
    let apiKey = '';
    
    try {
        // 尝试从.env文件中读取API密钥
        if (fs.existsSync('./.env')) {
            const envContent = fs.readFileSync('./.env', 'utf8');
            const apiKeyMatch = envContent.match(/API_KEY=(.*)/);
            if (apiKeyMatch && apiKeyMatch[1]) {
                apiKey = apiKeyMatch[1].trim();
            }
        }
        
        // 如果没有从.env文件中读取到API密钥，使用默认值
        if (!apiKey) {
            // 使用示例API密钥（在实际使用中应该从环境变量或配置文件中获取）
            apiKey = 'app-OhD8h8XfPg2apHjNikIjJKSO';
            console.log('警告: 正在使用示例API密钥，请在生产环境中使用您自己的API密钥。');
        }
        
        const generator = new DifyDeepSeekCodeGenerator(apiKey);
        
        rl.prompt();
        
        rl.on('line', async (line) => {
            const input = line.trim();
            
            if (input.toLowerCase() === 'exit') {
                console.log('感谢使用Dify DeepSeek Code Generator，再见！');
                rl.close();
                return;
            }
            
            if (!input) {
                rl.prompt();
                return;
            }
            
            try {
                console.log('\n正在生成代码，请稍候...');
                
                // 定义流式响应回调函数
                const streamCallback = (chunk, isComplete) => {
                    if (isComplete) {
                        console.log('\n流式响应已完成');
                    } else {
                        process.stdout.write(chunk); // 实时输出流数据
                    }
                };
                
                // 调用代码生成器
                await generator.generateCode(
                    input,                       // 用户输入的代码逻辑
                    '',                          // 模板字符串（如果提供了templateFilePath则会被覆盖）
                    options.outputDir,           // 输出目录
                    '',                          // conversationId
                    [],                          // files
                    options.responseMode,        // 响应模式
                    options.responseMode === 'streaming' ? streamCallback : null,
                    options.templateFilePath     // 模板文件路径
                );
                
                console.log(`\n代码已成功生成到目录: ${path.resolve(options.outputDir)}`);
                console.log('------------------------------------');
            } catch (error) {
                console.error('代码生成失败:', error.message);
                console.log('------------------------------------');
            } finally {
                rl.prompt();
            }
        }).on('close', () => {
            console.log('程序已退出。');
            process.exit(0);
        });
        
    } catch (error) {
        console.error('程序初始化失败:', error.message);
        process.exit(1);
    }
}

// 启动程序
main().catch(err => {
    console.error('程序运行出错:', err);
    process.exit(1);
});