/**
 * JSON-RPC 2.0 协议解析器
 * 用于处理符合JSON-RPC 2.0标准的请求和响应
 */

class JSONRPCParser {
  /**
   * 验证JSON-RPC 2.0请求格式
   * @param {Object} request - JSON-RPC请求对象
   * @returns {boolean} - 是否是有效的JSON-RPC请求
   */
  static validateRequest(request) {
    if (!request || typeof request !== 'object') {
      return false;
    }
    
    // 验证版本号
    if (request.jsonrpc !== '2.0') {
      return false;
    }
    
    // 验证方法名
    if (typeof request.method !== 'string' || request.method === '') {
      return false;
    }
    
    // 验证参数（如果存在）
    if ('params' in request && typeof request.params !== 'object') {
      return false;
    }
    
    // id字段可以是null，但如果存在则必须是字符串、数字或null
    if ('id' in request && request.id !== null && 
        typeof request.id !== 'string' && typeof request.id !== 'number') {
      return false;
    }
    
    return true;
  }

  /**
   * 构建JSON-RPC 2.0请求对象
   * @param {string} method - 方法名
   * @param {Object|Array} params - 参数对象或数组
   * @param {string|number|null} id - 请求ID
   * @returns {Object} - 格式化后的JSON-RPC请求对象
   */
  static buildRequest(method, params = {}, id = 1) {
    const request = {
      jsonrpc: '2.0',
      method: method,
      id: id
    };
    
    if (params && typeof params === 'object') {
      request.params = params;
    }
    
    return request;
  }

  /**
   * 构建JSON-RPC 2.0成功响应
   * @param {*} result - 调用结果
   * @param {string|number|null} id - 请求ID
   * @returns {Object} - 格式化后的JSON-RPC响应对象
   */
  static buildSuccessResponse(result, id) {
    return {
      jsonrpc: '2.0',
      result: result,
      id: id
    };
  }

  /**
   * 构建JSON-RPC 2.0错误响应
   * @param {number} code - 错误码
   * @param {string} message - 错误消息
   * @param {*} data - 附加错误数据（可选）
   * @param {string|number|null} id - 请求ID
   * @returns {Object} - 格式化后的JSON-RPC错误响应对象
   */
  static buildErrorResponse(code, message, data = null, id) {
    const error = {
      code: code,
      message: message
    };
    
    if (data !== null) {
      error.data = data;
    }
    
    return {
      jsonrpc: '2.0',
      error: error,
      id: id
    };
  }

  /**
   * 从标准格式转换为内部格式
   * @param {Object} jsonrpcRequest - JSON-RPC请求对象
   * @returns {Object} - 内部格式的请求对象 {serverName, toolName, params}
   */
  static parseRequestToInternal(jsonrpcRequest) {
    if (!this.validateRequest(jsonrpcRequest)) {
      throw new Error('无效的JSON-RPC请求格式');
    }
    
    // 解析方法名为 serverName:toolName 格式
    const [serverName, toolName] = jsonrpcRequest.method.split(':');
    
    if (!serverName || !toolName) {
      throw new Error('方法名必须为 serverName:toolName 格式');
    }
    
    return {
      serverName: serverName,
      toolName: toolName,
      params: jsonrpcRequest.params || {},
      id: jsonrpcRequest.id
    };
  }

  /**
   * 从内部格式转换为JSON-RPC格式
   * @param {Object} internalResponse - 内部格式的响应
   * @param {string|number|null} id - 请求ID
   * @returns {Object} - JSON-RPC格式的响应
   */
  static convertToJSONRPCResponse(internalResponse, id) {
    if (internalResponse.success) {
      // 成功响应
      return this.buildSuccessResponse(internalResponse.data || internalResponse, id);
    } else {
      // 错误响应
      const errorCode = this.getErrorCodeForMessage(internalResponse.error);
      return this.buildErrorResponse(
        errorCode,
        internalResponse.error || '未知错误',
        null,
        id
      );
    }
  }

  /**
   * 根据错误消息获取对应的JSON-RPC错误码
   * @param {string} errorMessage - 错误消息
   * @returns {number} - 错误码
   */
  static getErrorCodeForMessage(errorMessage) {
    if (!errorMessage) return -32603; // 内部错误
    
    if (errorMessage.includes('未找到') || errorMessage.includes('不存在')) {
      return -32601; // 方法未找到
    } else if (errorMessage.includes('参数') || errorMessage.includes('格式')) {
      return -32602; // 参数错误
    } else {
      return -32603; // 内部错误
    }
  }

  /**
   * 处理批量请求
   * @param {Array} batchRequests - 批量请求数组
   * @param {Function} executor - 请求执行器函数
   * @returns {Promise<Array>} - 批量响应数组
   */
  static async handleBatchRequest(batchRequests, executor) {
    if (!Array.isArray(batchRequests)) {
      throw new Error('批量请求必须是数组');
    }
    
    const responses = [];
    
    for (const request of batchRequests) {
      try {
        // 跳过通知（没有id的请求）
        if (!('id' in request)) {
          await executor(request);
          continue;
        }
        
        const response = await executor(request);
        responses.push(response);
      } catch (error) {
        // 为有id的请求生成错误响应
        if ('id' in request) {
          responses.push(
            this.buildErrorResponse(
              -32603, // 内部错误
              error.message || '处理请求时发生错误',
              null,
              request.id
            )
          );
        }
      }
    }
    
    // 只在有响应时返回数组
    return responses.length > 0 ? responses : null;
  }
}

module.exports = { JSONRPCParser };