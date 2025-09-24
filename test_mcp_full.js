// 综合测试MCP功能
const { mcpRegistry } = require('./mcp_registry');
const { mysqlMCP } = require('./mysql_mcp');
const { weatherMCP } = require('./weather_mcp');
const DifyDeepSeekCodeGenerator = require('./index');

console.log('====================================');
console.log('          MCP功能综合测试            ');
console.log('====================================');

// 测试执行顺序
(async () => {
    try {
        // 1. 测试MCP能力声明
        await testMCPDeclarations();
        
        // 2. 测试MCP热插拔管理
        await testMCPHotPlugging();
        
        // 3. 测试MCP命令执行
        await testMCPCmdExecution();
        
        // 4. 测试集成到CLI中的MCP功能
        await testCLIIntegration();
        
        console.log('====================================');
        console.log('        MCP功能测试全部通过！        ');
        console.log('====================================');
    } catch (error) {
        console.error('测试失败:', error.message);
        console.log('====================================');
        console.log('          测试未通过！               ');
        console.log('====================================');
        process.exit(1);
    }
})();

// 测试MCP能力声明
async function testMCPDeclarations() {
    console.log('\n=== 测试MCP能力声明 ===');
    
    // 注册MCP客户端
    mcpRegistry.register('mysql', mysqlMCP);
    mcpRegistry.register('weather', weatherMCP);
    
    // 获取MySQL MCP能力
    const mysqlCapabilities = await mcpRegistry.executeCommand('mysql', 'get_capabilities');
    console.log('MySQL MCP能力声明包含methods:', 'methods' in mysqlCapabilities);
    console.log('MySQL MCP能力数量:', mysqlCapabilities.methods ? mysqlCapabilities.methods.length : 0);
    
    // 获取Weather MCP能力
    const weatherCapabilities = await mcpRegistry.executeCommand('weather', 'get_capabilities');
    console.log('Weather MCP能力声明包含methods:', 'methods' in weatherCapabilities);
    console.log('Weather MCP能力数量:', weatherCapabilities.methods ? weatherCapabilities.methods.length : 0);
    
    // 验证能力声明格式是否符合GitHub MCP协议标准
    if (mysqlCapabilities.methods && weatherCapabilities.methods) {
        console.log('能力声明格式符合GitHub MCP协议标准');
    } else {
        throw new Error('能力声明格式不符合GitHub MCP协议标准');
    }
}

// 测试MCP热插拔管理
async function testMCPHotPlugging() {
    console.log('\n=== 测试MCP热插拔管理 ===');
    
    // 移除Weather MCP
    console.log('移除Weather MCP...');
    const removeResult = mcpRegistry.remove('weather');
    console.log('移除结果:', removeResult ? '成功' : '失败');
    
    // 验证移除是否成功
    const clientsAfterRemove = mcpRegistry.listClients();
    console.log('移除后注册的客户端数量:', clientsAfterRemove.length);
    
    // 重新添加Weather MCP
    console.log('重新添加Weather MCP...');
    const addResult = mcpRegistry.register('weather', weatherMCP);
    console.log('添加结果:', addResult ? '成功' : '失败');
    
    // 验证添加是否成功
    const clientsAfterAdd = mcpRegistry.listClients();
    console.log('添加后注册的客户端数量:', clientsAfterAdd.length);
    
    // 验证热插拔功能是否正常
    if (clientsAfterRemove.length === 1 && clientsAfterAdd.length === 2) {
        console.log('MCP热插拔功能正常');
    } else {
        throw new Error('MCP热插拔功能异常');
    }
}

// 测试MCP命令执行
async function testMCPCmdExecution() {
    console.log('\n=== 测试MCP命令执行 ===');
    
    // 测试执行MySQL MCP命令
    console.log('执行MySQL MCP能力获取命令...');
    const mysqlResult = await mcpRegistry.executeCommand('mysql', 'get_capabilities');
    console.log('MySQL命令执行结果:', mysqlResult.success ? '成功' : '失败');
    
    // 测试执行Weather MCP命令
    console.log('执行Weather MCP能力获取命令...');
    const weatherResult = await mcpRegistry.executeCommand('weather', 'get_capabilities');
    console.log('Weather命令执行结果:', weatherResult.success ? '成功' : '失败');
    
    // 测试执行不存在的命令
    console.log('测试执行不存在的命令...');
    try {
        await mcpRegistry.executeCommand('mysql', 'non_existent_command');
    } catch (error) {
        console.log('正确处理了不存在的命令:', error.message);
    }
    
    // 测试访问不存在的MCP客户端
    console.log('测试访问不存在的MCP客户端...');
    try {
        await mcpRegistry.executeCommand('nonExistent', 'get_capabilities');
    } catch (error) {
        console.log('正确处理了不存在的客户端:', error.message);
    }
}

// 测试集成到CLI中的MCP功能
async function testCLIIntegration() {
    console.log('\n=== 测试CLI集成MCP功能 ===');
    
    // 创建代码生成器实例
    const generator = new DifyDeepSeekCodeGenerator('test-api-key');
    
    // 测试MCP命令检测
    console.log('测试MCP命令检测...');
    const content = '请帮我获取数据库信息 [MCP](mysql:get_tables) 和天气信息 [MCP](weather:get_weather_by_ip)';
    const detectedCmds = generator.detectMCPCmds(content);
    console.log('检测到的MCP命令数量:', detectedCmds.length);
    console.log('检测到的命令:', detectedCmds);
    
    // 命令解析在handleMCPCommand方法内部完成，不需要单独调用解析方法
    
    // 测试通过生成器执行MCP命令
    if (detectedCmds.length > 0) {
        console.log('\n测试通过生成器执行MCP命令...');
        const result = await generator.handleMCPCommand(detectedCmds[0]);
        console.log('命令执行结果:', result);
    }
    
    // 验证集成是否成功
    if (detectedCmds.length === 2) {
        console.log('CLI集成MCP功能正常');
    } else {
        throw new Error('CLI集成MCP功能异常');
    }
}