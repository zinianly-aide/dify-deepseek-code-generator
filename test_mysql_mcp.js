// 测试MySQL MCP功能的脚本
const { mysqlMCP } = require('./mysql_mcp');

async function runTests() {
  console.log('开始测试MySQL MCP功能...\n');
  
  try {
    // 1. 连接到MySQL数据库
    console.log('1. 测试连接MySQL数据库...');
    const connectResult = await mysqlMCP.connect({
      host: 'localhost',
      port: 3306,
      user: 'user',
      password: 'userpassword',
      database: 'testdb'
    });
    console.log(connectResult.message || `连接成功: ${connectResult.success}`);
    
    // 2. 创建测试表（如果不存在）
    console.log('\n2. 创建测试表（如果不存在）...');
    try {
      await mysqlMCP.connection.execute(`
        CREATE TABLE IF NOT EXISTS employees (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          department VARCHAR(100),
          salary DECIMAL(10, 2),
          hire_date DATE
        )
      `);
      await mysqlMCP.connection.execute(`
        CREATE TABLE IF NOT EXISTS departments (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          manager VARCHAR(100)
        )
      `);
      console.log('测试表创建成功');
    } catch (error) {
      console.log(`创建测试表时出错: ${error.message}`);
    }
    
    // 3. 获取表列表
    console.log('\n3. 测试获取表列表...');
    const tablesResult = await mysqlMCP.getTables();
    if (tablesResult.success) {
      console.log('数据库表列表:');
      tablesResult.tables.forEach(table => console.log(`- ${table}`));
    } else {
      console.log(`获取表列表失败: ${tablesResult.error}`);
    }
    
    // 4. 获取表结构
    console.log('\n4. 测试获取表结构...');
    const tableStructureResult = await mysqlMCP.getTableStructure('employees');
    if (tableStructureResult.success) {
      console.log(`表结构: ${tableStructureResult.tableName}`);
      console.log('列信息:');
      tableStructureResult.structure.columns.forEach(col => {
        console.log(`- ${col.name} (${col.type}, ${col.null ? '可为空' : '不可为空'}, 键: ${col.key || '-'})`);
      });
      
      if (Object.keys(tableStructureResult.structure.indexes).length > 0) {
        console.log('索引信息:');
        Object.entries(tableStructureResult.structure.indexes).forEach(([name, info]) => {
          const type = info.primary ? '主键' : (info.unique ? '唯一索引' : '普通索引');
          console.log(`- ${name} (${type}): ${info.columns.join(', ')}`);
        });
      }
    } else {
      console.log(`获取表结构失败: ${tableStructureResult.error}`);
    }
    
    // 5. 生成表结构描述（用于大模型）
    console.log('\n5. 测试生成表结构描述...');
    const descriptionResult = await mysqlMCP.generateTableDescription(['employees', 'departments']);
    if (descriptionResult.success) {
      console.log('生成的表结构描述（用于大模型）:');
      console.log(descriptionResult.description);
    } else {
      console.log(`生成表结构描述失败: ${descriptionResult.error}`);
    }
    
    // 6. 执行简单查询
    console.log('\n6. 测试执行简单查询...');
    const queryResult = await mysqlMCP.executeQuery('SELECT COUNT(*) as count FROM employees');
    if (queryResult.success) {
      console.log(`查询结果: 共有 ${queryResult.rows[0].count} 条员工记录`);
    } else {
      console.log(`执行查询失败: ${queryResult.error}`);
    }
    
    // 7. 测试错误处理 - 缺少参数
    console.log('\n7. 测试错误处理 - 缺少参数...');
    const errorResult = await mysqlMCP.getTableStructure();
    console.log(`预期的错误: ${errorResult.error}`);
    
    // 8. 断开连接
    console.log('\n8. 测试断开连接...');
    await mysqlMCP.disconnect();
    console.log('已断开MySQL连接');
    
    console.log('\n所有测试完成！');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行测试
runTests();