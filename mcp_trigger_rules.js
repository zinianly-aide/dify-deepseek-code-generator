/**
 * MCP触发规则管理器
 * 负责分析用户请求并决定是否需要调用MCP服务
 */
class MCPTriggerRules {
    constructor() {
        // 置信度阈值配置
        this.confidenceThreshold = 0.6;
        
        // 定义需要MCP服务支持的专业领域关键词
        this.specializedDomains = {
            database: ['查询数据库', '数据库', 'SQL', '表结构', '数据统计'],
            weather: ['天气', '气温', '温度', '预报', '下雨', '晴天'],
            calculation: ['计算', '数学', '公式', '方程', '统计', '概率']
        };
        
        // 记录MCP服务调用历史
        this.callHistory = [];
    }
    
    /**
     * 更新置信度阈值
     * @param {number} threshold - 新的置信度阈值 (0-1)
     */
    updateConfidenceThreshold(threshold) {
        if (threshold >= 0 && threshold <= 1) {
            this.confidenceThreshold = threshold;
        }
    }
    
    /**
     * 分析用户请求并确定是否需要触发MCP调用
     * @param {string} userRequest - 用户请求文本
     * @param {number} confidence - 大模型对自身回答的置信度 (0-1)
     * @returns {Object|null} MCP调用信息或null（不需要调用）
     */
    analyzeRequest(userRequest, confidence = 1.0) {
        const lowerCaseRequest = userRequest.toLowerCase();
        
        // 检查是否为无法独立完成的专业领域操作
        const specializedDomain = this._detectSpecializedDomain(lowerCaseRequest);
        if (specializedDomain) {
            const mcpInfo = this._getMCPInfoForDomain(specializedDomain, lowerCaseRequest);
            if (mcpInfo) {
                // 记录调用历史
                this._recordCallHistory(userRequest, 'specialized_domain', mcpInfo);
                return mcpInfo;
            }
        }
        
        // 检查置信度是否低于阈值
        if (confidence < this.confidenceThreshold) {
            const mcpInfo = this._getMCPInfoForLowConfidence(lowerCaseRequest);
            if (mcpInfo) {
                // 记录调用历史
                this._recordCallHistory(userRequest, 'low_confidence', mcpInfo);
                return mcpInfo;
            }
        }
        
        return null;
    }
    
    /**
     * 检测请求是否属于专业领域
     * @param {string} request - 小写的用户请求文本
     * @returns {string|null} 检测到的专业领域或null
     */
    _detectSpecializedDomain(request) {
        for (const [domain, keywords] of Object.entries(this.specializedDomains)) {
            for (const keyword of keywords) {
                if (request.includes(keyword.toLowerCase())) {
                    return domain;
                }
            }
        }
        return null;
    }
    
    /**
     * 根据专业领域获取对应的MCP调用信息
     * @param {string} domain - 专业领域
     * @param {string} request - 用户请求文本
     * @returns {Object|null} MCP调用信息
     */
    _getMCPInfoForDomain(domain, request) {
        switch (domain) {
            case 'database':
                // 提取SQL相关内容或表名
                const tableMatch = request.match(/表([^，。,;.\s]+)/);
                return {
                    serverName: 'mysql',
                    toolName: 'get_tables',
                    params: tableMatch ? { tableName: tableMatch[1] } : {}
                };
                
            case 'weather':
                // 提取位置信息
                const locationMatch = request.match(/(北京|上海|广州|深圳|杭州|成都|重庆|武汉|西安|苏州|天津|南京|长沙|郑州|东莞|青岛|沈阳|宁波|昆明)[的天气]/);
                return {
                    serverName: 'weather',
                    toolName: 'get_weather_by_ip',
                    params: locationMatch ? { location: locationMatch[1] } : {}
                };
                
            case 'calculation':
                return {
                    serverName: 'calculator', // 假设计算器MCP服务存在
                    toolName: 'calculate',
                    params: { expression: request }
                };
                
            default:
                return null;
        }
    }
    
    /**
     * 根据低置信度情况获取MCP调用信息
     * @param {string} request - 用户请求文本
     * @returns {Object|null} MCP调用信息
     */
    _getMCPInfoForLowConfidence(request) {
        // 这里可以根据请求类型推荐合适的MCP服务
        // 简化实现：检查是否包含已知领域的关键词
        const domain = this._detectSpecializedDomain(request);
        if (domain) {
            return this._getMCPInfoForDomain(domain, request);
        }
        return null;
    }
    
    /**
     * 记录MCP调用历史
     * @param {string} userRequest - 用户请求
     * @param {string} reason - 调用原因
     * @param {Object} mcpInfo - MCP调用信息
     */
    _recordCallHistory(userRequest, reason, mcpInfo) {
        const record = {
            timestamp: new Date().toISOString(),
            userRequest,
            reason,
            mcpInfo,
            confidenceThreshold: this.confidenceThreshold
        };
        
        this.callHistory.push(record);
        
        // 保持历史记录不超过100条
        if (this.callHistory.length > 100) {
            this.callHistory.shift();
        }
    }
    
    /**
     * 获取最近的调用历史
     * @param {number} limit - 返回的记录数量限制
     * @returns {Array} 调用历史记录
     */
    getCallHistory(limit = 10) {
        return this.callHistory.slice(-limit);
    }
    
    /**
     * 获取系统提示词中需要包含的MCP服务描述
     * 用于动态更新系统提示词
     * @returns {string} MCP服务描述文本
     */
    getMCPServicesDescription() {
        return `
可用的MCP服务：
1. MySQL数据库操作客户端 - 用于数据库查询、表结构查看等操作
2. Weather天气信息客户端 - 根据IP地址获取当前天气信息

触发条件：
- 当遇到数据库查询、天气查询等专业操作时，自动调用相应MCP服务
- 当对回答的置信度低于${this.confidenceThreshold * 100}%时，自动调用相关MCP服务获取更准确结果

调用格式：
- 可以使用传统格式：server_name:tool_name?param1=value1&param2=value2
- 也可以使用JSON-RPC 2.0格式：{"jsonrpc":"2.0","method":"server_name:tool_name","params":{...},"id":1}
`;
    }
}

// 创建单例实例
const mcpTriggerRules = new MCPTriggerRules();

module.exports = { MCPTriggerRules, mcpTriggerRules };