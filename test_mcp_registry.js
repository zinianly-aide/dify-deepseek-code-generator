// 测试MCP注册表功能
const { mcpRegistry } = require('./mcp_registry');
const { mysqlMCP } = require('./mysql_mcp');
const { weatherMCP } = require('./weather_mcp');

console.log('开始测试MCP注册表功能...');

// 测试注册MCP客户端
testRegister();

// 测试列出已注册的MCP客户端
testListClients();

// 测试执行MCP命令
testExecuteCommand();

// 测试移除MCP客户端
testRemoveClient();

// 测试获取MCP客户端能力
testGetCapabilities();

console.log('MCP注册表功能测试完成！');

function testRegister() {
    console.log('\n=== 测试注册MCP客户端 ===');
    
    // 注册MySQL MCP
    const mysqlResult = mcpRegistry.register('mysql', mysqlMCP);
    console.log('注册MySQL MCP结果:', mysqlResult ? '成功' : '失败');
    
    // 注册Weather MCP
    const weatherResult = mcpRegistry.register('weather', weatherMCP);
    console.log('注册Weather MCP结果:', weatherResult ? '成功' : '失败');
    
    // 测试重复注册
    const duplicateResult = mcpRegistry.register('mysql', mysqlMCP);
    console.log('重复注册MySQL MCP结果:', duplicateResult ? '成功' : '失败');
}

function testListClients() {
    console.log('\n=== 测试列出已注册的MCP客户端 ===');
    const clients = mcpRegistry.listClients();
    console.log('已注册的MCP客户端数量:', clients.length);
    console.log('已注册的MCP客户端列表:', clients);
}

function testGetClient() {
    console.log('\n=== 测试获取MCP客户端 ===');
    const mysqlClient = mcpRegistry.getClient('mysql');
    const weatherClient = mcpRegistry.getClient('weather');
    const nonExistentClient = mcpRegistry.getClient('nonExistent');
    
    console.log('MySQL客户端存在:', mysqlClient !== null);
    console.log('Weather客户端存在:', weatherClient !== null);
    console.log('不存在的客户端返回null:', nonExistentClient === null);
}

async function testExecuteCommand() {
    console.log('\n=== 测试执行MCP命令 ===');
    
    try {
        // 测试获取MySQL MCP能力
        const mysqlCapabilities = await mcpRegistry.executeCommand('mysql', 'get_capabilities');
        console.log('MySQL MCP能力:', mysqlCapabilities);
        
        // 测试获取Weather MCP能力
        const weatherCapabilities = await mcpRegistry.executeCommand('weather', 'get_capabilities');
        console.log('Weather MCP能力:', weatherCapabilities);
        
        // 测试执行不存在的命令
        try {
            await mcpRegistry.executeCommand('mysql', 'non_existent_command');
        } catch (error) {
            console.log('执行不存在的命令错误处理:', error.message);
        }
        
        // 测试访问不存在的MCP客户端
        try {
            await mcpRegistry.executeCommand('nonExistent', 'get_capabilities');
        } catch (error) {
            console.log('访问不存在的MCP客户端错误处理:', error.message);
        }
    } catch (error) {
        console.error('执行命令测试失败:', error.message);
    }
}

function testRemoveClient() {
    console.log('\n=== 测试移除MCP客户端 ===');
    
    // 移除Weather MCP
    const removeResult = mcpRegistry.remove('weather');
    console.log('移除Weather MCP结果:', removeResult ? '成功' : '失败');
    
    // 检查移除后的客户端列表
    const clientsAfterRemove = mcpRegistry.listClients();
    console.log('移除后的客户端数量:', clientsAfterRemove.length);
    console.log('移除后的客户端列表:', clientsAfterRemove);
    
    // 测试移除不存在的客户端
    const removeNonExistent = mcpRegistry.remove('nonExistent');
    console.log('移除不存在的客户端结果:', removeNonExistent ? '成功' : '失败');
}

async function testGetCapabilities() {
    console.log('\n=== 测试获取MCP客户端详细能力 ===');
    
    try {
        // 重新注册Weather MCP以便测试
        mcpRegistry.register('weather', weatherMCP);
        
        // 获取MySQL MCP详细能力
        const mysqlClient = mcpRegistry.getClient('mysql');
        if (mysqlClient) {
            const mysqlCapabilities = await mysqlClient.execute('get_capabilities');
            console.log('\nMySQL MCP详细能力:');
            console.log(`描述: ${mysqlCapabilities.description}`);
            console.log('可用方法:');
            mysqlCapabilities.methods.forEach(method => {
                console.log(`  - ${method.name}: ${method.description}`);
                if (method.params) {
                    console.log('    参数:');
                    Object.entries(method.params).forEach(([param, desc]) => {
                        console.log(`      ${param}: ${desc}`);
                    });
                }
            });
        }
        
        // 获取Weather MCP详细能力
        const weatherClient = mcpRegistry.getClient('weather');
        if (weatherClient) {
            const weatherCapabilities = await weatherClient.execute('get_capabilities');
            console.log('\nWeather MCP详细能力:');
            console.log(`描述: ${weatherCapabilities.description}`);
            console.log('可用方法:');
            weatherCapabilities.methods.forEach(method => {
                console.log(`  - ${method.name}: ${method.description}`);
                if (method.params) {
                    console.log('    参数:');
                    Object.entries(method.params).forEach(([param, desc]) => {
                        console.log(`      ${param}: ${desc}`);
                    });
                }
            });
        }
    } catch (error) {
        console.error('获取能力测试失败:', error.message);
    }
}