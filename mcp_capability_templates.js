/**
 * MCP能力描述模板管理器
 * 负责管理和提供各MCP服务的能力描述信息
 */
class MCPCapabilityTemplates {
    constructor() {
        // 存储各MCP服务的能力描述模板
        this.templates = {
            mysql: this._getMySQLTemplate(),
            weather: this._getWeatherTemplate()
        };
    }
    
    /**
     * 获取指定MCP服务的能力描述模板
     * @param {string} serverName - MCP服务名称
     * @returns {Object|null} 能力描述模板或null（不存在）
     */
    getTemplate(serverName) {
        return this.templates[serverName] || null;
    }
    
    /**
     * 获取所有MCP服务的能力描述模板列表
     * @returns {Object} 所有MCP服务的能力描述模板
     */
    getAllTemplates() {
        return { ...this.templates };
    }
    
    /**
     * 添加或更新MCP服务的能力描述模板
     * @param {string} serverName - MCP服务名称
     * @param {Object} template - 能力描述模板
     */
    setTemplate(serverName, template) {
        this.templates[serverName] = template;
    }
    
    /**
     * 获取MySQL MCP服务的能力描述模板
     * @returns {Object} MySQL能力描述模板
     * @private
     */
    _getMySQLTemplate() {
        return {
            description: 'MySQL数据库操作客户端，用于执行数据库查询、查看表结构等操作',
            methods: {
                connect: {
                    description: '连接到MySQL数据库',
                    input: {
                        type: 'object',
                        properties: {
                            host: {
                                type: 'string',
                                description: '数据库主机地址',
                                default: 'localhost'
                            },
                            port: {
                                type: 'number',
                                description: '数据库端口',
                                default: 3306
                            },
                            user: {
                                type: 'string',
                                description: '数据库用户名'
                            },
                            password: {
                                type: 'string',
                                description: '数据库密码'
                            },
                            database: {
                                type: 'string',
                                description: '数据库名称'
                            }
                        },
                        required: ['user', 'password']
                    },
                    output: {
                        type: 'object',
                        properties: {
                            success: {
                                type: 'boolean',
                                description: '连接是否成功'
                            },
                            message: {
                                type: 'string',
                                description: '连接成功的消息'
                            },
                            error: {
                                type: 'string',
                                description: '连接失败的错误信息'
                            }
                        }
                    },
                    examples: {
                        input: { host: 'localhost', port: 3306, user: 'user', password: 'userpassword', database: 'testdb' },
                        output: { success: true, message: '成功连接到MySQL数据库' }
                    },
                    exceptions: {
                        'ECONNREFUSED': '无法连接到数据库服务器，请检查主机和端口是否正确',
                        'ER_ACCESS_DENIED_ERROR': '用户名或密码错误',
                        'ER_BAD_DB_ERROR': '指定的数据库不存在'
                    },
                    performance: {
                        maxResponseTime: 5000, // 最大响应时间（毫秒）
                        maxRequestsPerSecond: 10 // 每秒最大请求次数
                    }
                },
                get_tables: {
                    description: '获取数据库中的所有表列表',
                    input: {},
                    output: {
                        type: 'object',
                        properties: {
                            success: {
                                type: 'boolean',
                                description: '查询是否成功'
                            },
                            tables: {
                                type: 'array',
                                items: {
                                    type: 'string'
                                },
                                description: '表名列表'
                            },
                            error: {
                                type: 'string',
                                description: '查询失败的错误信息'
                            }
                        }
                    },
                    examples: {
                        input: {},
                        output: { success: true, tables: ['users', 'products', 'orders'] }
                    },
                    exceptions: {
                        'Not connected': '未连接到数据库，请先调用connect方法'
                    },
                    performance: {
                        maxResponseTime: 3000,
                        maxRequestsPerSecond: 20
                    }
                },
                get_table_structure: {
                    description: '获取指定表的结构信息',
                    input: {
                        type: 'object',
                        properties: {
                            table: {
                                type: 'string',
                                description: '表名'
                            }
                        },
                        required: ['table']
                    },
                    output: {
                        type: 'object',
                        properties: {
                            success: {
                                type: 'boolean',
                                description: '查询是否成功'
                            },
                            tableName: {
                                type: 'string',
                                description: '表名'
                            },
                            structure: {
                                type: 'object',
                                properties: {
                                    columns: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                name: {
                                                    type: 'string',
                                                    description: '列名'
                                                },
                                                type: {
                                                    type: 'string',
                                                    description: '数据类型'
                                                },
                                                null: {
                                                    type: 'boolean',
                                                    description: '是否允许为空'
                                                },
                                                key: {
                                                    type: 'string',
                                                    description: '键类型'
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            error: {
                                type: 'string',
                                description: '查询失败的错误信息'
                            }
                        }
                    },
                    examples: {
                        input: { table: 'users' },
                        output: {
                            success: true,
                            tableName: 'users',
                            structure: {
                                columns: [
                                    { name: 'id', type: 'int', null: false, key: 'PRI' },
                                    { name: 'name', type: 'varchar(50)', null: false, key: '' },
                                    { name: 'email', type: 'varchar(100)', null: false, key: 'UNI' }
                                ]
                            }
                        }
                    },
                    exceptions: {
                        'Not connected': '未连接到数据库，请先调用connect方法',
                        'ER_NO_SUCH_TABLE': '指定的表不存在'
                    },
                    performance: {
                        maxResponseTime: 3000,
                        maxRequestsPerSecond: 20
                    }
                },
                execute_query: {
                    description: '执行SQL查询语句',
                    input: {
                        type: 'object',
                        properties: {
                            sql: {
                                type: 'string',
                                description: 'SQL查询语句'
                            }
                        },
                        required: ['sql']
                    },
                    output: {
                        type: 'object',
                        properties: {
                            success: {
                                type: 'boolean',
                                description: '查询是否成功'
                            },
                            results: {
                                type: 'array',
                                description: '查询结果'
                            },
                            rowCount: {
                                type: 'number',
                                description: '返回的记录数'
                            },
                            error: {
                                type: 'string',
                                description: '查询失败的错误信息'
                            }
                        }
                    },
                    examples: {
                        input: { sql: 'SELECT * FROM users LIMIT 10' },
                        output: {
                            success: true,
                            results: [[1, 'user1', 'user1@example.com'], [2, 'user2', 'user2@example.com']],
                            rowCount: 2
                        }
                    },
                    exceptions: {
                        'Not connected': '未连接到数据库，请先调用connect方法',
                        'ER_PARSE_ERROR': 'SQL语法错误',
                        'ER_NO_SUCH_TABLE': '表不存在'
                    },
                    performance: {
                        maxResponseTime: 10000, // 复杂查询可能需要更长时间
                        maxRequestsPerSecond: 5 // 限制每秒请求次数，避免数据库压力过大
                    },
                    notes: '为了安全起见，不建议执行UPDATE、DELETE等修改数据的语句'
                },
                disconnect: {
                    description: '断开与MySQL数据库的连接',
                    input: {},
                    output: {
                        type: 'object',
                        properties: {
                            success: {
                                type: 'boolean',
                                description: '断开连接是否成功'
                            },
                            message: {
                                type: 'string',
                                description: '断开连接的消息'
                            }
                        }
                    },
                    examples: {
                        input: {},
                        output: { success: true, message: '已断开MySQL连接' }
                    },
                    exceptions: {},
                    performance: {
                        maxResponseTime: 1000,
                        maxRequestsPerSecond: 30
                    }
                }
            },
            jsonrpc: {
                examples: {
                    request: {
                        jsonrpc: '2.0',
                        method: 'mysql:connect',
                        params: { host: 'localhost', user: 'user', password: 'password' },
                        id: 1
                    },
                    response: {
                        jsonrpc: '2.0',
                        result: { success: true, message: '成功连接到MySQL数据库' },
                        id: 1
                    },
                    errorResponse: {
                        jsonrpc: '2.0',
                        error: { code: -32602, message: '参数错误: 缺少用户名或密码' },
                        id: 1
                    }
                }
            }
        };
    }
    
    /**
     * 获取Weather MCP服务的能力描述模板
     * @returns {Object} Weather能力描述模板
     * @private
     */
    _getWeatherTemplate() {
        return {
            description: 'Weather天气信息客户端，用于根据IP地址或位置获取当前天气信息',
            methods: {
                get_weather_by_ip: {
                    description: '根据IP地址获取天气信息',
                    input: {
                        type: 'object',
                        properties: {
                            ip: {
                                type: 'string',
                                description: 'IP地址，可选，默认使用请求者的IP'
                            },
                            location: {
                                type: 'string',
                                description: '地理位置，可选，如果提供则直接使用该位置获取天气'
                            }
                        }
                    },
                    output: {
                        type: 'object',
                        properties: {
                            success: {
                                type: 'boolean',
                                description: '查询是否成功'
                            },
                            location: {
                                type: 'string',
                                description: '地理位置'
                            },
                            weather: {
                                type: 'string',
                                description: '天气状况'
                            },
                            temperature: {
                                type: 'number',
                                description: '温度（摄氏度）'
                            },
                            humidity: {
                                type: 'number',
                                description: '湿度（百分比）'
                            },
                            wind: {
                                type: 'string',
                                description: '风力风向'
                            },
                            error: {
                                type: 'string',
                                description: '查询失败的错误信息'
                            }
                        }
                    },
                    examples: {
                        input: { ip: '114.114.114.114' },
                        output: {
                            success: true,
                            location: '北京市',
                            weather: '晴',
                            temperature: 25,
                            humidity: 45,
                            wind: '东北风 3级'
                        }
                    },
                    exceptions: {
                        'Invalid IP': '无效的IP地址',
                        'Location not found': '无法根据IP地址确定位置',
                        'Weather data unavailable': '无法获取该位置的天气数据'
                    },
                    performance: {
                        maxResponseTime: 3000,
                        maxRequestsPerSecond: 15
                    }
                },
                set_api_key: {
                    description: '设置天气API的密钥',
                    input: {
                        type: 'object',
                        properties: {
                            apiKey: {
                                type: 'string',
                                description: '天气API的密钥'
                            }
                        },
                        required: ['apiKey']
                    },
                    output: {
                        type: 'object',
                        properties: {
                            success: {
                                type: 'boolean',
                                description: '设置是否成功'
                            },
                            message: {
                                type: 'string',
                                description: '设置成功的消息'
                            }
                        }
                    },
                    examples: {
                        input: { apiKey: 'your_api_key_here' },
                        output: { success: true, message: '天气API密钥已设置' }
                    },
                    exceptions: {},
                    performance: {
                        maxResponseTime: 500,
                        maxRequestsPerSecond: 5
                    }
                }
            },
            jsonrpc: {
                examples: {
                    request: {
                        jsonrpc: '2.0',
                        method: 'weather:get_weather_by_ip',
                        params: { location: '北京市' },
                        id: 2
                    },
                    response: {
                        jsonrpc: '2.0',
                        result: {
                            success: true,
                            location: '北京市',
                            weather: '晴',
                            temperature: 25,
                            humidity: 45,
                            wind: '东北风 3级'
                        },
                        id: 2
                    },
                    errorResponse: {
                        jsonrpc: '2.0',
                        error: { code: -32000, message: '无法获取该位置的天气数据' },
                        id: 2
                    }
                }
            }
        };
    }
    
    /**
     * 生成完整的MCP系统提示词片段
     * @returns {string} MCP系统提示词片段
     */
    generateSystemPromptFragment() {
        let fragment = '可用的MCP服务能力描述：\n';
        
        for (const [serverName, template] of Object.entries(this.templates)) {
            fragment += `\n## ${serverName.toUpperCase()} 服务\n`;
            fragment += `${template.description}\n\n`;
            
            fragment += '### 支持的方法\n';
            for (const [methodName, methodInfo] of Object.entries(template.methods)) {
                fragment += `- **${methodName}**: ${methodInfo.description}\n`;
                
                // 添加输入参数描述
                if (methodInfo.input && methodInfo.input.properties && Object.keys(methodInfo.input.properties).length > 0) {
                    fragment += '  - 输入参数：\n';
                    for (const [paramName, paramInfo] of Object.entries(methodInfo.input.properties)) {
                        const required = methodInfo.input.required && methodInfo.input.required.includes(paramName) ? ' (必需)' : '';
                        const defaultValue = paramInfo.default !== undefined ? `，默认值: ${paramInfo.default}` : '';
                        fragment += `    - ${paramName}${required}: ${paramInfo.description}${defaultValue}\n`;
                    }
                }
                
                // 添加性能约束
                if (methodInfo.performance) {
                    fragment += `  - 性能约束：最大响应时间${methodInfo.performance.maxResponseTime}ms，每秒最大请求数${methodInfo.performance.maxRequestsPerSecond}\n`;
                }
            }
            
            // 添加JSON-RPC示例
            if (template.jsonrpc && template.jsonrpc.examples) {
                fragment += '\n### JSON-RPC 2.0调用示例\n';
                fragment += '请求示例：\n';
                fragment += `\`\`\`json\n${JSON.stringify(template.jsonrpc.examples.request, null, 2)}\n\`\`\`\n`;
                fragment += '成功响应示例：\n';
                fragment += `\`\`\`json\n${JSON.stringify(template.jsonrpc.examples.response, null, 2)}\n\`\`\`\n`;
            }
        }
        
        fragment += '\n## MCP调用触发规则\n';
        fragment += '1. **无法独立完成操作**：当你需要执行数据库查询、获取实时天气等专业操作时，自动触发相应MCP服务调用\n';
        fragment += '2. **不确定结果**：当你对回答的准确性没有足够信心时，触发相关MCP服务获取更准确结果\n';
        
        fragment += '\n## 调用格式\n';
        fragment += '你可以使用以下两种格式调用MCP服务：\n';
        fragment += '1. 传统格式：`[MCP](server_name:tool_name?param1=value1&param2=value2)`\n';
        fragment += '2. JSON-RPC 2.0格式：`[MCP]({"jsonrpc":"2.0","method":"server_name:tool_name","params":{"id":1}}]`\n';
        
        return fragment;
    }
}

// 导出MCPCapabilityTemplates类和实例
module.exports = {
    MCPCapabilityTemplates,
    mcpCapabilityTemplates: new MCPCapabilityTemplates()
};