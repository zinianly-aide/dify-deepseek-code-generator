# Dify DeepSeek 代码生成工具

这是一个使用Node.js编写的工具，用于将自定义问题包装成Dify中Chat API的HTTP请求体，并发送请求到Dify中的DeepSeek模型。工具会解析返回的响应，提取DeepSeek的回复，并根据回复自动创建文件和目录结构。

## 功能特点

- 与Dify Chat API交互，使用DeepSeek模型生成代码
- 支持自定义代码模板，根据项目需求生成特定格式的代码
- 自动解析DeepSeek回复中的代码块，创建对应的文件和目录结构
- 支持多种代码格式和项目类型
- 提供完整的示例代码，易于上手

## 快速开始

### 前提条件

- Node.js 14.x 或更高版本
- Dify API密钥（可从[Dify官网](https://dify.ai/)获取）

### 安装依赖

```bash
npm install
```

### 配置API密钥

1. 将`.env.example`文件重命名为`.env`
2. 在`.env`文件中填入您的Dify API密钥：

```
DIFY_API_KEY=your-actual-dify-api-key
```

### 使用示例

运行示例代码：

```bash
npm run example
```

这将执行`example.js`文件中的三个示例：
1. 生成一个简单的React组件
2. 生成一个Express API服务器
3. 生成一个完整的命令行工具项目结构

生成的文件将保存在`output`目录下。

## 核心类：DifyDeepSeekCodeGenerator

### 构造函数

```javascript
const generator = new DifyDeepSeekCodeGenerator(apiKey, baseUrl);
```

- `apiKey`: Dify API密钥
- `baseUrl`: Dify API基础URL（可选，默认为`https://api.dify.ai`）

### 主要方法

#### generateCode

```javascript
await generator.generateCode(question, template, outputDir);
```

主函数，根据问题生成代码并创建文件。

- `question`: 用户的问题或需求描述
- `template`: 代码模板（可选），用于指导模型返回特定格式的代码
- `outputDir`: 输出目录（可选，默认为`./output`）

#### buildRequestBody

构建发送给Dify Chat API的请求体。

#### sendRequest

发送HTTP请求到Dify的Chat API。

#### extractDeepSeekResponse

从Dify响应中提取DeepSeek的回复内容。

#### createFilesFromContent

解析回复内容中的代码块，并创建对应的文件和目录。

## 自定义使用

您可以在自己的代码中引入`DifyDeepSeekCodeGenerator`类，并根据需要自定义问题和模板：

```javascript
const DifyDeepSeekCodeGenerator = require('./index');
const dotenv = require('dotenv');

dotenv.config();

async function customUsage() {
    const generator = new DifyDeepSeekCodeGenerator(process.env.DIFY_API_KEY);
    
    const customTemplate = `请按照以下格式返回代码：
```语言
// 文件名: 路径/文件名
// 文件内容
```

请确保在代码块前添加正确的文件名注释。`;
    
    const customQuestion = '请帮我创建一个...'; // 您的具体需求
    
    await generator.generateCode(customQuestion, customTemplate, './custom-output');
}

customUsage();
```

## 代码模板格式

为了确保工具能够正确解析并创建文件，建议您在模板中指定以下格式：

```
```语言
// 文件名: 路径/文件名
// 文件内容
```
```

这样工具就能自动识别文件名和文件内容，并创建对应的文件和目录结构。

## 注意事项

1. 请确保您的Dify API密钥有效，并且有足够的调用额度
2. 生成的文件将保存在指定的输出目录中，请确保您有写入权限
3. 如果DeepSeek回复中包含多个代码块，工具会为每个代码块创建对应的文件
4. 如果回复中没有代码块，工具会将所有内容保存到一个文本文件中
5. 对于大型项目，可能需要多次调用API来生成完整的代码

## 故障排除

- **API密钥错误**: 请检查`.env`文件中的API密钥是否正确
- **请求失败**: 请确保您的网络连接正常，并且Dify API服务可用
- **文件创建失败**: 请检查您是否有足够的文件系统权限
- **解析错误**: 如果工具无法正确解析回复，请检查您的模板格式是否正确

## License

ISC