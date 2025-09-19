const DifyDeepSeekCodeGenerator = require('./index');

// 测试MCP命令检测和处理功能
async function testMCPCmdDetection() {
    console.log('开始测试MCP命令检测和处理功能...');
    
    // 创建一个生成器实例（使用示例API密钥）
    const generator = new DifyDeepSeekCodeGenerator('app-OhD8h8XfPg2apHjNikIjJKSO');
    
    // 测试用例1：包含单个MCP命令的回复
    const testContent1 = `
这是一个包含MCP命令的回复示例：
[MCP](docker:create-container?image=nginx&name=test-nginx&ports=80:80)

请查看上面创建的Docker容器。
`;
    
    // 测试用例2：包含多个MCP命令的回复
    const testContent2 = `
这是一个包含多个MCP命令的回复示例：
[MCP](docker:create-container?image=redis&name=test-redis&ports=6379:6379)
[MCP](github:create_repository?name=test-repo&description=Test%20repository)

请查看上面创建的Docker容器和GitHub仓库。
`;
    
    // 测试用例3：不包含MCP命令的回复
    const testContent3 = `
这是一个不包含MCP命令的回复示例。
请按照正常流程处理。
`;
    
    // 执行测试用例1
    console.log('\n测试用例1：检测单个MCP命令');
    const cmds1 = generator.detectMCPCmds(testContent1);
    console.log('检测到的命令数量:', cmds1.length);
    console.log('检测到的命令:', cmds1);
    
    if (cmds1.length > 0) {
        const result1 = await generator.handleMCPCommand(cmds1[0]);
        console.log('命令执行结果:', result1);
    }
    
    // 执行测试用例2
    console.log('\n测试用例2：检测多个MCP命令');
    const cmds2 = generator.detectMCPCmds(testContent2);
    console.log('检测到的命令数量:', cmds2.length);
    console.log('检测到的命令:', cmds2);
    
    if (cmds2.length > 0) {
        for (const cmd of cmds2) {
            const result = await generator.handleMCPCommand(cmd);
            console.log('命令执行结果:', result);
        }
    }
    
    // 执行测试用例3
    console.log('\n测试用例3：不包含MCP命令的回复');
    const cmds3 = generator.detectMCPCmds(testContent3);
    console.log('检测到的命令数量:', cmds3.length);
    console.log('检测到的命令:', cmds3);
    
    console.log('\nMCP命令检测和处理功能测试完成！');
}

// 运行测试
 testMCPCmdDetection().catch(err => {
    console.error('测试失败:', err);
});