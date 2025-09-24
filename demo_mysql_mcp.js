// 演示如何通过提示词触发MySQL MCP功能
const DifyDeepSeekCodeGenerator = require('./index');

// 模拟DeepSeek的响应，包含MCP命令
const mockDeepSeekResponse = `
我可以帮您编写查询员工的SQL。为了更精确地编写SQL语句，让我先了解一下数据库结构。

[MCP](mysql:connect?host=localhost&port=3306&user=user&password=userpassword&database=testdb)

[MCP](mysql:generate_description?tables=employees,departments)

根据以上表结构，以下是查询所有部门经理的员工信息的SQL语句：

SELECT e.id, e.name, e.department, e.salary, d.manager 
FROM employees e 
JOIN departments d ON e.department = d.name 
WHERE e.name = d.manager;

[MCP](mysql:execute_query?sql=SELECT 1 FROM dual)

[MCP](mysql:disconnect)
`;

async function simulateDeepSeekResponse() {
  console.log('开始演示通过提示词触发MySQL MCP功能...\n');
  
  try {
    // 创建代码生成器实例（这里使用一个模拟的API密钥）
    const generator = new DifyDeepSeekCodeGenerator('mock-api-key');
    
    console.log('模拟的DeepSeek响应内容：');
    console.log(mockDeepSeekResponse);
    console.log('\n=======================\n');
    
    // 模拟生成代码过程，重点是处理MCP命令
    console.log('处理DeepSeek响应中的MCP命令：');
    
    // 检测MCP命令
    const mcps = generator.detectMCPCmds(mockDeepSeekResponse);
    
    if (mcps.length > 0) {
      console.log(`检测到 ${mcps.length} 个MCP命令：`);
      
      // 逐个执行MCP命令
      for (const cmd of mcps) {
        console.log(`\n执行命令: ${cmd}`);
        const result = await generator.handleMCPCommand(cmd);
        console.log('命令执行结果:');
        console.log(result);
      }
    } else {
      console.log('未检测到MCP命令');
    }
    
    console.log('\n演示完成！');
    
  } catch (error) {
    console.error('演示过程中发生错误:', error);
  }
}

// 运行演示
simulateDeepSeekResponse();