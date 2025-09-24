// 测试MCP客户端显示功能

const { mcpRegistry } = require('./mcp_registry');
const { weatherMCP } = require('./weather_mcp');

// 注册Weather MCP客户端进行测试
mcpRegistry.register('weather', weatherMCP);

// 测试listClients方法返回的数据格式
console.log('测试listClients返回格式:');
const clients = mcpRegistry.listClients();
console.log(clients);

// 直接模拟showRegisteredMCPs函数的功能
console.log('\n测试showRegisteredMCPs功能:');
clients.forEach((clientInfo) => {
    const name = clientInfo.name;
    const client = mcpRegistry.getClient(name);
    console.log(`  - ${name}: ${client?.description || '无描述'}`);
});

// 直接模拟capabilities显示功能
console.log('\n测试capabilities显示功能:');
const client = mcpRegistry.getClient('weather');
if (client) {
    client.execute('get_capabilities').then(capabilities => {
        console.log(`weather MCP客户端能力:`);
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
        }
    }).catch(error => {
        console.error('获取能力失败:', error.message);
    });
}