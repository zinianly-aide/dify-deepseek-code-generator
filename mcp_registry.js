/**
 * MCP Registry 类，用于管理和执行 MCP 命令
 */
const { JSONRPCParser } = require('./jsonrpc_parser');

class MCPRegistry {
  constructor() {
    this.mcpClients = new Map();
    this.defaultMCPs = new Map();
    this.eventListeners = new Map(); // 存储事件监听器
  }
  
  /**
   * 订阅事件
   * @param {string} eventName - 事件名称
   * @param {Function} listener - 事件监听器函数
   */
  on(eventName, listener) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName).push(listener);
  }
  
  /**
   * 取消订阅事件
   * @param {string} eventName - 事件名称
   * @param {Function} listener - 要取消的事件监听器函数
   */
  off(eventName, listener) {
    if (!this.eventListeners.has(eventName)) return;
    
    const listeners = this.eventListeners.get(eventName);
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }
  
  /**
   * 触发事件
   * @param {string} eventName - 事件名称
   * @param {*} data - 事件数据
   */
  emit(eventName, data) {
    if (!this.eventListeners.has(eventName)) return;
    
    const listeners = this.eventListeners.get(eventName);
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error(`触发事件 ${eventName} 的监听器时出错:`, error);
      }
    }
  }

  /**
   * 为了兼容性，提供executeCommand作为execute的别名
   */
  async executeCommand(serverName, toolName, params = {}) {
    return this.execute(serverName, toolName, params);
  }

  /**
   * 注册一个新的 MCP client
   * @param {string} name - MCP client 的名称
   * @param {Object} client - MCP client 实例
   * @param {Object} metadata - MCP client 的元数据，包括描述、能力等
   * @returns {boolean} 注册是否成功
   */
  register(name, client, metadata = {}) {
    if (!name || !client) {
      throw new Error('MCP名称和客户端实例是必需的');
    }

    if (this.mcpClients.has(name)) {
      console.warn(`MCP客户端 ${name} 已经存在，将被替换`);
    }

    // 确保客户端实现了必要的接口
    if (typeof client.execute !== 'function') {
      throw new Error(`MCP客户端 ${name} 必须实现 execute 方法`);
    }

    this.mcpClients.set(name, {
      client,
      metadata,
      registeredAt: new Date()
    });

    console.log(`MCP客户端 ${name} 注册成功`);
    
    // 触发MCP注册事件
    this.emit('mcp.registered', {
      name,
      metadata
    });
    
    return true;
  }

  /**
   * 注销一个 MCP client
   * @param {string} name - MCP client 的名称
   * @returns {boolean} 注销是否成功
   */
  unregister(name) {
    if (!this.mcpClients.has(name)) {
      console.warn(`MCP客户端 ${name} 不存在`);
      return false;
    }

    // 获取要注销的客户端的元数据
    const clientInfo = this.mcpClients.get(name);
    
    this.mcpClients.delete(name);
    console.log(`MCP客户端 ${name} 已注销`);
    
    // 触发MCP注销事件
    this.emit('mcp.unregistered', {
      name,
      metadata: clientInfo ? clientInfo.metadata : {}
    });
    
    return true;
  }

  /**
   * 获取一个 MCP client
   * @param {string} name - MCP client 的名称
   * @returns {Object|null} MCP client 实例，如果不存在则返回 null
   */
  getClient(name) {
    const clientInfo = this.mcpClients.get(name);
    return clientInfo ? clientInfo.client : null;
  }

  /**
   * 获取所有已注册的 MCP clients
   * @returns {Array} MCP clients 列表
   */
  listClients() {
    const clients = [];
    for (const [name, clientInfo] of this.mcpClients.entries()) {
      clients.push({
        name,
        metadata: clientInfo.metadata,
        registeredAt: clientInfo.registeredAt
      });
    }
    return clients;
  }

  /**
   * 获取 MCP client 的元数据
   * @param {string} name - MCP client 的名称
   * @returns {Object|null} MCP client 的元数据，如果不存在则返回 null
   */
  getMetadata(name) {
    const clientInfo = this.mcpClients.get(name);
    return clientInfo ? clientInfo.metadata : null;
  }

  /**
   * 移除 MCP client，为了兼容性而保留的方法
   * @param {string} name - MCP client 的名称
   * @returns {boolean} 移除是否成功
   */
  remove(name) {
    return this.unregister(name);
  }

  /**
   * 执行 MCP 命令
   * @param {string} serverName - MCP server 名称
   * @param {string} toolName - 工具名称
   * @param {Object} params - 参数对象
   * @returns {Promise<Object>} 命令执行结果
   */
  async execute(serverName, toolName, params = {}) {
    const client = this.getClient(serverName);
    if (!client) {
      throw new Error(`未找到 MCP 客户端: ${serverName}`);
    }

    try {
      console.log(`执行 MCP 命令: ${serverName}:${toolName}`, params);
      const result = await client.execute(toolName, params);
      return result;
    } catch (error) {
      console.error(`执行 MCP 命令失败: ${serverName}:${toolName}`, error);
      return {
        success: false,
        error: error.message || '未知错误'
      };
    }
  }

  /**
   * 使用JSON-RPC 2.0格式执行MCP命令
   * @param {Object} jsonrpcRequest - JSON-RPC格式的请求对象
   * @returns {Promise<Object>} JSON-RPC格式的响应对象
   */
  async executeJSONRPC(jsonrpcRequest) {
    try {
      // 验证并解析JSON-RPC请求
      if (!JSONRPCParser.validateRequest(jsonrpcRequest)) {
        return JSONRPCParser.buildErrorResponse(
          -32600, // 无效请求
          '无效的JSON-RPC请求格式',
          null,
          jsonrpcRequest.id || null
        );
      }

      // 解析为内部格式
      const { serverName, toolName, params, id } = JSONRPCParser.parseRequestToInternal(jsonrpcRequest);

      // 执行命令
      const internalResponse = await this.execute(serverName, toolName, params);

      // 转换为JSON-RPC响应格式
      return JSONRPCParser.convertToJSONRPCResponse(internalResponse, id);
    } catch (error) {
      console.error('执行JSON-RPC请求失败:', error);
      return JSONRPCParser.buildErrorResponse(
        -32603, // 内部错误
        error.message || '处理请求时发生错误',
        null,
        jsonrpcRequest.id || null
      );
    }
  }

  /**
   * 初始化默认的 MCP 客户端
   */
  async initializeDefaultClients() {
    // 初始化内置的 MCP 客户端
    for (const [name, initFn] of Object.entries(this.defaultMCPs)) {
      try {
        const { client, metadata } = await initFn();
        this.register(name, client, metadata);
      } catch (error) {
        console.error(`初始化默认 MCP 客户端 ${name} 失败`, error);
      }
    }
  }
}

// 创建单例实例
const mcpRegistry = new MCPRegistry();

module.exports = {
  MCPRegistry,
  mcpRegistry,
  JSONRPCParser
};