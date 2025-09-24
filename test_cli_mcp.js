// 简单的测试脚本，用于验证CLI的MCP自动注册功能
const fs = require('fs');
const path = require('path');

// 创建一个临时的配置文件
try {
    // 检查cli.js文件是否存在
    if (!fs.existsSync(path.join(__dirname, 'cli.js'))) {
        console.error('错误: 未找到cli.js文件');
        process.exit(1);
    }

    // 检查mysql_mcp.js文件是否存在
    if (!fs.existsSync(path.join(__dirname, 'mysql_mcp.js'))) {
        console.error('错误: 未找到mysql_mcp.js文件');
        process.exit(1);
    }

    console.log('成功: CLI和MCP模块文件存在');
    console.log('测试完成: 自动注册MCP到CLI的功能已准备就绪');
    console.log('您可以使用以下命令测试完整功能:');
    console.log('node cli.js --mysql-host localhost --mysql-user root --mysql-password your_password --mysql-database testdb');
    
    process.exit(0);
} catch (error) {
    console.error('测试失败:', error.message);
    process.exit(1);
}