const mysql = require('mysql2/promise');

class MySQLMCP {
  constructor() {
    this.connection = null;
    this.description = 'MySQL数据库操作客户端';
  }

  /**
   * 建立MySQL连接
   * @param {Object} config - MySQL连接配置
   * @returns {Promise<Object>} 连接结果
   */
  async connect(config) {
    try {
      this.connection = await mysql.createConnection({
        host: config.host || 'localhost',
        port: config.port || 3306,
        user: config.user || 'root',
        password: config.password,
        database: config.database || 'testdb',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      
      return {
        success: true,
        message: `成功连接到MySQL数据库: ${config.database || 'testdb'}`
      };
    } catch (error) {
      console.error('MySQL连接错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 关闭MySQL连接
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  /**
   * 获取数据库中所有表的列表
   * @returns {Promise<Object>} 表列表结果
   */
  async getTables() {
    try {
      if (!this.connection) {
        return {
          success: false,
          error: '未连接到MySQL数据库'
        };
      }

      const [rows] = await this.connection.execute(
        'SHOW TABLES'
      );

      const tables = rows.map(row => Object.values(row)[0]);
      
      return {
        success: true,
        tables: tables
      };
    } catch (error) {
      console.error('获取表列表错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取表的结构信息
   * @param {string} tableName - 表名
   * @returns {Promise<Object>} 表结构结果
   */
  async getTableStructure(tableName) {
    try {
      if (!this.connection) {
        return {
          success: false,
          error: '未连接到MySQL数据库'
        };
      }
      
      if (!tableName) {
        return {
          success: false,
          error: '参数错误: 缺少表名(tableName)'
        };
      }

      const [rows] = await this.connection.execute(
        'DESCRIBE `' + tableName + '`'
      );

      // 获取表的索引信息
      const [indexRows] = await this.connection.execute(
        'SHOW INDEX FROM `' + tableName + '`'
      );

      const indexes = {};
      indexRows.forEach(row => {
        if (!indexes[row.Key_name]) {
          indexes[row.Key_name] = {
            columns: [],
            unique: row.Non_unique === 0,
            primary: row.Key_name === 'PRIMARY'
          };
        }
        indexes[row.Key_name].columns.push(row.Column_name);
      });

      // 格式化表结构信息
      const structure = {
        columns: rows.map(column => ({
          name: column.Field,
          type: column.Type,
          null: column.Null === 'YES',
          key: column.Key,
          default: column.Default,
          extra: column.Extra
        })),
        indexes: indexes,
        primaryKey: rows.find(column => column.Key === 'PRI')?.Field
      };

      return {
        success: true,
        tableName: tableName,
        structure: structure
      };
    } catch (error) {
      console.error('获取表结构错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 执行命令
   * @param {string} command - 命令名称
   * @param {Object} params - 命令参数
   * @returns {Promise<Object>} 命令执行结果
   */
  async execute(command, params = {}) {
    switch (command) {
      case 'connect':
        return await this.connect(params);
      case 'disconnect':
        return await this.disconnect();
      case 'get_tables':
        return await this.getTables();
      case 'get_table_structure':
        return await this.getTableStructure(params.tableName);
      case 'get_capabilities':
        return this.getCapabilities();
      default:
        throw new Error(`不支持的命令: ${command}`);
    }
  }

  /**
   * 获取MCP客户端的能力声明
   * @returns {Object} 能力声明
   */
  getCapabilities() {
    return {
      success: true,
      description: 'MySQL数据库操作客户端，支持数据库连接、表列表查询和表结构查询等功能',
      methods: [
        {
          name: 'connect',
          description: '连接到MySQL数据库',
          params: {
            host: '数据库主机地址',
            port: '数据库端口',
            user: '数据库用户名',
            password: '数据库密码',
            database: '数据库名称'
          }
        },
        {
          name: 'disconnect',
          description: '断开与MySQL数据库的连接'
        },
        {
          name: 'get_tables',
          description: '获取数据库中的表列表'
        },
        {
          name: 'get_table_structure',
          description: '获取指定表的结构信息',
          params: {
            tableName: '表名称'
          }
        },
        {
          name: 'get_capabilities',
          description: '获取MCP客户端的能力声明'
        }
      ]
    };
  }

  /**
   * 获取多个表的结构信息
   * @param {Array<string>} tableNames - 表名数组
   * @returns {Promise<Object>} 多表结构结果
   */
  async getMultipleTableStructures(tableNames) {
    try {
      const results = {};
      
      for (const tableName of tableNames) {
        const result = await this.getTableStructure(tableName);
        if (result.success) {
          results[tableName] = result.structure;
        } else {
          results[tableName] = { error: result.error };
        }
      }

      return {
        success: true,
        structures: results
      };
    } catch (error) {
      console.error('获取多表结构错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 执行SQL查询（只读）
   * @param {string} sql - SQL查询语句
   * @param {Array} params - 参数数组
   * @returns {Promise<Object>} 查询结果
   */
  async executeQuery(sql, params = []) {
    try {
      if (!this.connection) {
        return {
          success: false,
          error: '未连接到MySQL数据库'
        };
      }

      // 仅允许SELECT查询
      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        return {
          success: false,
          error: '只允许执行SELECT查询'
        };
      }

      const [rows] = await this.connection.execute(sql, params);
      
      return {
        success: true,
        rows: rows,
        rowCount: rows.length
      };
    } catch (error) {
      console.error('执行查询错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 生成用于大模型的表结构描述
   * @param {string|Array<string>} tables - 表名或表名数组
   * @returns {Promise<Object>} 格式化的表结构描述
   */
  async generateTableDescription(tables) {
    try {
      let structures;
      
      if (typeof tables === 'string') {
        const result = await this.getTableStructure(tables);
        if (!result.success) {
          return result;
        }
        structures = { [tables]: result.structure };
      } else {
        const result = await this.getMultipleTableStructures(tables);
        if (!result.success) {
          return result;
        }
        structures = result.structures;
      }

      // 格式化表结构描述
      let description = '### 数据库表结构\n\n';
      
      Object.entries(structures).forEach(([tableName, structure]) => {
        if (structure.error) {
          description += `#### ${tableName}\n**错误**: ${structure.error}\n\n`;
          return;
        }

        description += `#### ${tableName}\n`;
        description += '| 列名 | 类型 | 是否为空 | 键 | 默认值 | 额外信息 |\n';
        description += '|------|------|----------|-----|--------|----------|\n';
        
        structure.columns.forEach(column => {
          description += `| ${column.name} | ${column.type} | ${column.null ? '是' : '否'} | ${column.key || '-'} | ${column.default || '-'} | ${column.extra || '-'} |\n`;
        });

        // 添加索引信息
        if (Object.keys(structure.indexes).length > 0) {
          description += '\n**索引**:\n';
          Object.entries(structure.indexes).forEach(([indexName, indexInfo]) => {
            const type = indexInfo.primary ? '主键' : (indexInfo.unique ? '唯一索引' : '普通索引');
            description += `- ${indexName} (${type}): ${indexInfo.columns.join(', ')}\n`;
          });
        }

        description += '\n';
      });

      return {
        success: true,
        description: description
      };
    } catch (error) {
      console.error('生成表结构描述错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// 创建单例实例
const mysqlMCP = new MySQLMCP();

module.exports = {
  MySQLMCP,
  mysqlMCP
};