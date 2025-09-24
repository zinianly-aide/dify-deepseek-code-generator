#!/usr/bin/env node

const readline = require('readline');
const path = require('path');
const fs = require('fs');
const DifyDeepSeekCodeGenerator = require('./index');
const { mysqlMCP } = require('./mysql_mcp'); // 引入MySQL MCP模块

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
        templateFilePath: '',
        mysqlHost: 'localhost',
        mysqlPort: 3306,
        mysqlUser: 'user',
        mysqlPassword: 'userpassword',
        mysqlDatabase: 'testdb'
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
        } else if (args[i] === '--mysql-host') {
            options.mysqlHost = args[i + 1] || options.mysqlHost;
            i++;
        } else if (args[i] === '--mysql-port') {
            options.mysqlPort = parseInt(args[i + 1]) || options.mysqlPort;
            i++;
        } else if (args[i] === '--mysql-user') {
            options.mysqlUser = args[i + 1] || options.mysqlUser;
            i++;
        } else if (args[i] === '--mysql-password') {
            options.mysqlPassword = args[i + 1] || options.mysqlPassword;
            i++;
        } else if (args[i] === '--mysql-database') {
            options.mysqlDatabase = args[i + 1] || options.mysqlDatabase;
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
    console.log('  --mysql-host <主机>    MySQL主机地址 (默认: localhost)');
    console.log('  --mysql-port <端口>    MySQL端口 (默认: 3306)');
    console.log('  --mysql-user <用户>    MySQL用户名 (默认: user)');
    console.log('  --mysql-password <密码> MySQL密码 (默认: userpassword)');
    console.log('  --mysql-database <数据库> MySQL数据库名 (默认: testdb)');
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
        
        // 注册MySQL MCP到CLI
        console.log('正在注册MySQL MCP功能...');
        try {
            // 尝试连接MySQL数据库（如果配置了的话）
            const result = await mysqlMCP.connect({
                host: options.mysqlHost,
                port: options.mysqlPort,
                user: options.mysqlUser,
                password: options.mysqlPassword,
                database: options.mysqlDatabase
            });
            
            if (result.success) {
                console.log(`MySQL MCP注册成功: ${result.message}`);
                console.log('您可以在代码请求中使用[MCP](mysql:xxx)格式的命令来操作数据库。');
            } else {
                console.log(`MySQL MCP注册提示: ${result.error}`);
                console.log('您仍然可以使用[MCP](mysql:connect?...)命令在会话中连接数据库。');
            }
        
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
                // 检查用户输入是否包含MCP命令
                const mcps = generator.detectMCPCmds(input);
                
                if (mcps.length > 0) {
                    // 用户直接输入了MCP命令，直接处理
                    console.log(`\n检测到 ${mcps.length} 个MCP命令，正在执行...`);
                    
                    for (const cmd of mcps) {
                        console.log(`\n执行命令: ${cmd}`);
                        const result = await generator.handleMCPCommand(cmd);
                        console.log('命令执行结果:');
                        console.log(result);
                    }
                } else {
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
                }
                
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
    // 确保程序退出时断开MySQL连接
    mysqlMCP.disconnect().finally(() => {
        process.exit(1);
    });
});