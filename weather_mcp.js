// Weather MCP - 根据 IP 获取天气信息的 MCP 客户端

const http = require('http');

class WeatherMCP {
    constructor() {
        this.name = 'weather';
        this.description = '根据 IP 地址获取当前天气信息的 MCP 客户端';
        this.capabilities = ['get_weather_by_ip'];
        this.ipApiUrl = 'http://ip-api.com/json/';
        this.weatherApiUrl = 'https://api.openweathermap.org/data/2.5/weather';
        this.apiKey = ''; // 默认不设置 API 密钥，用户可以通过参数传入
    }

    /**
     * 初始化 MCP 客户端
     * @param {Object} config - 配置参数
     */
    initialize(config = {}) {
        if (config.apiKey) {
            this.apiKey = config.apiKey;
        }
    }

    /**
     * 执行 MCP 命令
     * @param {string} toolName - 工具名称
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 命令执行结果
     */
    async execute(toolName, params) {
        switch (toolName) {
            case 'get_weather_by_ip':
                return this.getWeatherByIP(params);
            case 'set_api_key':
                return this.setApiKey(params);
            case 'get_capabilities':
                return this.getCapabilities();
            default:
                return {
                    success: false,
                    error: `未知的工具名称: ${toolName}`
                };
        }
    }

    /**
     * 设置 OpenWeatherMap API 密钥
     * @param {Object} params - 参数对象，包含 apiKey
     * @returns {Object} 操作结果
     */
    setApiKey(params) {
        if (!params.apiKey) {
            return {
                success: false,
                error: '缺少 API 密钥'
            };
        }

        this.apiKey = params.apiKey;
        return {
            success: true,
            message: 'OpenWeatherMap API 密钥设置成功'
        };
    }

    /**
     * 获取 MCP 客户端的能力列表
     * @returns {Object} 能力列表
     */
    getCapabilities() {
        return {
            success: true,
            capabilities: this.capabilities,
            description: this.description,
            methods: [
                {
                    name: 'get_weather_by_ip',
                    description: '根据 IP 地址获取当前天气信息',
                    params: {
                        ip: '可选，用户的 IP 地址，如果不提供则使用当前请求的 IP',
                        apiKey: '可选，OpenWeatherMap API 密钥'
                    }
                },
                {
                    name: 'set_api_key',
                    description: '设置 OpenWeatherMap API 密钥',
                    params: {
                        apiKey: '必需，OpenWeatherMap API 密钥'
                    }
                },
                {
                    name: 'get_capabilities',
                    description: '获取 MCP 客户端的能力列表'
                }
            ]
        };
    }

    /**
     * 根据 IP 地址获取天气信息
     * @param {Object} params - 参数对象
     * @returns {Promise<Object>} 天气信息
     */
    async getWeatherByIP(params) {
        try {
            const ip = params.ip || ''; // 如果不提供 IP，则使用空字符串，让 IP-API 自动检测
            const apiKey = params.apiKey || this.apiKey;

            if (!apiKey) {
                return {
                    success: false,
                    error: '请先设置 OpenWeatherMap API 密钥，或者在参数中提供'
                };
            }

            // 1. 获取 IP 对应的地理位置信息
            const location = await this.getLocationByIP(ip);
            if (!location.success) {
                return {
                    success: false,
                    error: `获取地理位置信息失败: ${location.error}`
                };
            }

            // 2. 根据地理位置信息获取天气
            const weather = await this.getWeatherByLocation(location, apiKey);
            if (!weather.success) {
                return {
                    success: false,
                    error: `获取天气信息失败: ${weather.error}`
                };
            }

            // 3. 返回格式化的天气信息
            return {
                success: true,
                data: {
                    location: location.data,
                    weather: weather.data
                }
            };
        } catch (error) {
            console.error('获取天气信息时出错:', error);
            return {
                success: false,
                error: error.message || '未知错误'
            };
        }
    }

    /**
     * 根据 IP 地址获取地理位置信息
     * @param {string} ip - IP 地址
     * @returns {Promise<Object>} 地理位置信息
     */
    async getLocationByIP(ip) {
        return new Promise((resolve, reject) => {
            const url = `${this.ipApiUrl}${ip}`;

            http.get(url, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const locationData = JSON.parse(data);
                        
                        if (locationData.status === 'fail') {
                            resolve({
                                success: false,
                                error: locationData.message
                            });
                            return;
                        }

                        resolve({
                            success: true,
                            data: {
                                city: locationData.city,
                                region: locationData.regionName,
                                country: locationData.country,
                                lat: locationData.lat,
                                lon: locationData.lon,
                                timezone: locationData.timezone,
                                isp: locationData.isp,
                                query: locationData.query
                            }
                        });
                    } catch (error) {
                        reject(new Error(`解析地理位置数据失败: ${error.message}`));
                    }
                });
            }).on('error', (error) => {
                reject(new Error(`获取地理位置信息失败: ${error.message}`));
            });
        });
    }

    /**
     * 根据经纬度获取天气信息
     * @param {Object} location - 地理位置信息
     * @param {string} apiKey - OpenWeatherMap API 密钥
     * @returns {Promise<Object>} 天气信息
     */
    async getWeatherByLocation(location, apiKey) {
        return new Promise((resolve, reject) => {
            const { lat, lon } = location.data;
            const url = `${this.weatherApiUrl}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_cn`;

            http.get(url, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const weatherData = JSON.parse(data);
                        
                        if (weatherData.cod !== 200) {
                            resolve({
                                success: false,
                                error: weatherData.message || '获取天气信息失败'
                            });
                            return;
                        }

                        resolve({
                            success: true,
                            data: {
                                temperature: weatherData.main.temp,
                                feelsLike: weatherData.main.feels_like,
                                tempMin: weatherData.main.temp_min,
                                tempMax: weatherData.main.temp_max,
                                humidity: weatherData.main.humidity,
                                pressure: weatherData.main.pressure,
                                weather: weatherData.weather[0].description,
                                weatherMain: weatherData.weather[0].main,
                                windSpeed: weatherData.wind.speed,
                                windDeg: weatherData.wind.deg,
                                visibility: weatherData.visibility,
                                clouds: weatherData.clouds.all,
                                sunrise: new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString(),
                                sunset: new Date(weatherData.sys.sunset * 1000).toLocaleTimeString()
                            }
                        });
                    } catch (error) {
                        reject(new Error(`解析天气数据失败: ${error.message}`));
                    }
                });
            }).on('error', (error) => {
                reject(new Error(`获取天气信息失败: ${error.message}`));
            });
        });
    }
}

// 创建单例实例
const weatherMCP = new WeatherMCP();

module.exports = { weatherMCP };