#!/usr/bin/env node

const readline = require('readline');
const path = require('path');
const fs = require('fs');
const DifyDeepSeekCodeGenerator = require('./index');
const { mysqlMCP } = require('./mysql_mcp'); // 引入MySQL MCP模块
const { weatherMCP } = require('./weather_mcp'); // 引入Weather MCP模块
const { mcpRegistry } = require('./mcp_registry'); // 引入MCP注册表

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
        mysqlDatabase: 'testdb',
        mcpAction: '',
        mcpName: '',
        mcpConfig: {}
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
        } else if (args[i] === '--mcp' && args[i + 1]) {
            options.mcpAction = args[i + 1];
            i++;
        } else if (args[i] === '--mcp-name' && args[i + 1]) {
            options.mcpName = args[i + 1];
            i++;
        } else if (args[i].startsWith('--mcp-') && args[i + 1]) {
            // 解析MCP配置参数
            const key = args[i].substring(6); // 去除 --mcp- 前缀
            options.mcpConfig[key] = args[i + 1];
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
    console.log('  --mcp <操作> [名称] [配置] MCP客户端管理: add/remove/list/capabilities');
    console.log('  -h, --help             显示帮助信息');
    console.log('');
    console.log('使用说明:');
    console.log('  在命令行中输入您想要实现的代码逻辑，按Enter键生成代码。');
    console.log('  输入exit或按Ctrl+C退出程序。');
    console.log('');
    console.log('MCP命令:');
    console.log('  mcp list                 列出所有已注册的MCP客户端');
    console.log('  mcp add <名称> [配置]    添加MCP客户端');
    console.log('  mcp remove <名称>        移除MCP客户端');
    console.log('  mcp capabilities <名称>  查看MCP客户端的能力');
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
        
        // 初始化MCP注册表 - 注意：这是异步函数，需要使用await
        await initializeMCPClients(options);
        
        // 处理MCP命令行操作 - 注意：这是异步函数，需要使用await
        if (options.mcpAction) {
            await handleMCPAction(options.mcpAction, options.mcpName, options.mcpConfig);
            return;
        }
        
        // 显示当前已注册的MCP客户端和能力
        showRegisteredMCPs();
        
        rl.prompt();
        
        rl.on('line', async (line) => {
            const input = line.trim();
            
            if (input.toLowerCase() === 'exit') {
                console.log('感谢使用Dify DeepSeek Code Generator，再见！');
                rl.close();
                return;
            }
            
            // 处理MCP管理命令
            if (input.startsWith('mcp ')) {
                handleMCPManagementCommand(input);
                rl.prompt();
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
                    // 用户直接输入了MCP命令，使用MCP注册表处理
                    console.log(`\n检测到 ${mcps.length} 个MCP命令，正在执行...`);
                    
                    for (const cmd of mcps) {
                        console.log(`\n执行命令: ${cmd}`);
                        const result = await processMCPCmd(cmd, generator);
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
    
    // 初始化MCP客户端
    async function initializeMCPClients(options) {
        // 注册MySQL MCP
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
                mcpRegistry.register('mysql', mysqlMCP);
            } else {
                console.log(`MySQL MCP注册提示: ${result.error}`);
                console.log('您仍然可以使用[MCP](mysql:connect?...)命令在会话中连接数据库。');
                mcpRegistry.register('mysql', mysqlMCP);
            }
        } catch (error) {
            console.log(`MySQL MCP注册提示: ${error.message}`);
            console.log('您仍然可以使用[MCP](mysql:connect?...)命令在会话中连接数据库。');
            mcpRegistry.register('mysql', mysqlMCP);
        }
        
        // 注册Weather MCP
        console.log('正在注册Weather MCP功能...');
        mcpRegistry.register('weather', weatherMCP);
        console.log('Weather MCP注册成功: 可根据IP获取天气信息');
    }
    
    // 显示已注册的MCP客户端和能力
    function showRegisteredMCPs() {
        const registeredMCs = mcpRegistry.listClients();
        if (registeredMCs.length > 0) {
            console.log('\n已注册的MCP客户端:');
            registeredMCs.forEach((clientInfo) => {
                const name = clientInfo.name;
                const client = mcpRegistry.getClient(name);
                console.log(`  - ${name}: ${client?.description || '无描述'}`);
            });
            console.log('\n可用MCP命令格式: [MCP](name:toolName?param1=value1&param2=value2)');
            console.log('使用"mcp capabilities <名称>"查看详细能力信息');
        }
    }
    
    // 处理MCP命令行操作
    async function handleMCPAction(action, name, config) {
        switch (action) {
            case 'list':
                const clients = mcpRegistry.listClients();
                console.log('已注册的MCP客户端:');
                clients.forEach((clientInfo) => {
                    const name = clientInfo.name; // 正确提取名称
                    const client = mcpRegistry.getClient(name);
                    console.log(`  - ${name}: ${client?.description || '无描述'}`);
                });
                break;
            case 'add':
                if (!name) {
                    console.error('请提供MCP客户端名称');
                    return;
                }
                // 这里简化处理，实际应用中应该根据名称动态加载不同的MCP客户端
                if (name === 'mysql') {
                    const mysqlConfig = {
                        host: config.host || options.mysqlHost,
                        port: config.port || options.mysqlPort,
                        user: config.user || options.mysqlUser,
                        password: config.password || options.mysqlPassword,
                        database: config.database || options.mysqlDatabase
                    };
                    try {
                        const result = await mysqlMCP.connect(mysqlConfig);
                        if (result.success) {
                            mcpRegistry.register('mysql', mysqlMCP);
                            console.log('MySQL MCP客户端已添加');
                        } else {
                            console.error('添加MySQL MCP客户端失败:', result.error);
                        }
                    } catch (error) {
                        console.error('添加MySQL MCP客户端失败:', error.message);
                    }
                } else if (name === 'weather') {
                    if (config.apiKey) {
                        weatherMCP.initialize({ apiKey: config.apiKey });
                    }
                    mcpRegistry.register('weather', weatherMCP);
                    console.log('Weather MCP客户端已添加');
                } else {
                    console.error('未知的MCP客户端名称:', name);
                }
                break;
            case 'remove':
                if (!name) {
                    console.error('请提供要移除的MCP客户端名称');
                    return;
                }
                mcpRegistry.remove(name);
                console.log(`MCP客户端 ${name} 已移除`);
                break;
            case 'capabilities':
                if (!name) {
                    console.error('请提供要查看能力的MCP客户端名称');
                    return;
                }
                const client = mcpRegistry.getClient(name);
                if (client) {
                    try {
                        // 注意：execute方法可能是异步的，需要使用await
                        const capabilities = await client.execute('get_capabilities');
                        console.log(`\n${name} MCP客户端能力:`);
                        console.log(`描述: ${capabilities?.description || '无描述'}`);
                        if (capabilities?.methods && Array.isArray(capabilities.methods)) {
                            console.log('可用方法:');
                            capabilities.methods.forEach(method => {
                                console.log(`  - ${method.name}: ${method.description}`);
                                if (method.params) {
                                    console.log('    参数:');
                                    Object.entries(method.params).forEach(([param, desc]) => {
                                        console.log(`      ${param}: ${desc}`);
                                    });
                                }
                            });
                        } else {
                            console.log('可用方法: 暂无');
                        }
                    } catch (error) {
                        console.error(`获取${name} MCP客户端能力失败:`, error.message);
                    }
                } else {
                    console.error('未找到指定的MCP客户端:', name);
                }
                break;
            default:
                console.error('未知的MCP操作:', action);
        }
        process.exit(0);
    }
    
    // 处理MCP管理命令
    function handleMCPManagementCommand(command) {
        const parts = command.split(' ').filter(Boolean);
        const subCommand = parts[1];
        const name = parts[2];
        
        switch (subCommand) {
            case 'list':
                showRegisteredMCPs();
                break;
            case 'add':
                if (!name) {
                    console.error('请提供MCP客户端名称');
                    return;
                }
                // 简化处理，实际应用中应该根据名称动态加载不同的MCP客户端
                if (name === 'mysql') {
                    mcpRegistry.register('mysql', mysqlMCP);
                    console.log('MySQL MCP客户端已添加');
                } else if (name === 'weather') {
                    mcpRegistry.register('weather', weatherMCP);
                    console.log('Weather MCP客户端已添加');
                } else {
                    console.error('未知的MCP客户端名称:', name);
                }
                break;
            case 'remove':
                if (!name) {
                    console.error('请提供要移除的MCP客户端名称');
                    return;
                }
                mcpRegistry.remove(name);
                console.log(`MCP客户端 ${name} 已移除`);
                break;
            case 'capabilities':
                if (!name) {
                    console.error('请提供要查看能力的MCP客户端名称');
                    return;
                }
                const client = mcpRegistry.getClient(name);
                if (client) {
                    try {
                        const capabilities = client.execute('get_capabilities');
                        console.log(`\n${name} MCP客户端能力:`);
                        console.log(`描述: ${capabilities.description}`);
                        console.log('可用方法:');
                        capabilities.methods.forEach(method => {
                            console.log(`  - ${method.name}: ${method.description}`);
                            if (method.params) {
                                console.log('    参数:');
                                Object.entries(method.params).forEach(([param, desc]) => {
                                    console.log(`      ${param}: ${desc}`);
                                });
                            }
                        });
                    } catch (error) {
                        console.error(`获取${name} MCP客户端能力失败:`, error.message);
                    }
                } else {
                    console.error('未找到指定的MCP客户端:', name);
                }
                break;
            default:
                console.error('未知的MCP管理命令:', subCommand);
        }
    }
    
    // 处理MCP命令
    async function processMCPCmd(cmd, generator) {
        try {
            // 解析MCP命令
            const { name, toolName, params } = generator.parseMCPCmd(cmd);
            
            // 使用MCP注册表执行命令
            const result = await mcpRegistry.executeCommand(name, toolName, params);
            return {
                success: true,
                data: result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
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