# Dify DeepSeek Code Generator - 外部模板使用指南

## 概述

本指南介绍如何使用 `DifyDeepSeekCodeGenerator` 类的外部模板功能来定义发送给大模型的内容。通过外部模板文件，您可以轻松管理和重用各种代码生成模板，无需在代码中硬编码模板字符串。

## 功能特点

- 支持从本地文件系统加载模板
- 自动处理绝对路径和相对路径
- 提供模板文件不存在的错误处理
- 支持在运行时动态切换不同的模板

## 创建模板文件

模板文件是普通的文本文件，您可以在其中定义发送给大模型的指令格式。例如：

```text
# 代码生成模板

请根据以下要求生成代码：

1. **代码风格**：使用现代ES6+语法，确保代码清晰易读
2. **注释**：为主要函数和复杂逻辑添加简洁明了的注释
3. **格式要求**：请严格按照以下格式返回代码：

```javascript
// 文件名: [文件名]
// 描述: [简短描述]

[代码内容]
```

4. **其他要求**：
   - 确保代码可以直接运行
   - 优化性能
   - 考虑可扩展性
```

您可以根据自己的需求创建多个不同的模板文件，存放在项目的任意位置。

## 使用方法

### 基本用法

```javascript
const DifyDeepSeekCodeGenerator = require('./index');

async function main() {
    // 初始化代码生成器
    const apiKey = 'your-api-key';
    const generator = new DifyDeepSeekCodeGenerator(apiKey);
    
    // 使用外部模板文件
    const question = '请帮我写一个简单的Express中间件函数，用于日志记录';
    const templateFilePath = './templates/log_middleware_template.txt';
    const outputDir = './output_with_template';
    
    try {
        await generator.generateCode(
            question,
            '', // 这个参数将被templateFilePath覆盖
            outputDir,
            '', // conversationId
            [], // files
            'blocking', // responseMode
            null, // onStreamChunk
            templateFilePath // 外部模板文件路径
        );
        console.log('代码生成完成！');
    } catch (error) {
        console.error('生成失败:', error);
    }
}

main();
```

### 使用内置的 `loadTemplateFromFile` 方法

如果您只想加载模板而不立即生成代码，可以直接使用 `loadTemplateFromFile` 方法：

```javascript
const DifyDeepSeekCodeGenerator = require('./index');

// 初始化代码生成器
const apiKey = 'your-api-key';
const generator = new DifyDeepSeekCodeGenerator(apiKey);

// 加载模板
try {
    const templateFilePath = './templates/code_template.txt';
    const template = generator.loadTemplateFromFile(templateFilePath);
    console.log('模板加载成功:', template);
    
    // 然后您可以使用加载的模板进行其他操作
} catch (error) {
    console.error('模板加载失败:', error);
}
```

## 参数说明

`generateCode` 方法的参数：

| 参数 | 类型 | 是否必需 | 描述 |
|------|------|---------|------|
| question | string | 是 | 用户的问题或需求描述 |
| template | string | 否 | 代码模板字符串，如果提供了templateFilePath则会被覆盖 |
| outputDir | string | 否 | 输出目录，默认为'./output' |
| conversationId | string | 否 | 会话ID，用于上下文保持 |
| files | Array | 否 | 文件列表，用于上传参考文件 |
| responseMode | string | 否 | 响应模式，'blocking'(默认)或'streaming' |
| onStreamChunk | Function | 否 | 流式响应的回调函数 |
| templateFilePath | string | 否 | 模板文件路径，如果提供，将覆盖template参数 |

## 示例模板文件

项目中提供了示例模板文件：

- `templates/example_template.txt` - 通用代码生成模板
- `templates/code_template.txt` - 在运行示例代码时自动创建的示例模板

您可以参考这些文件来创建自己的模板。

## 注意事项

1. 模板文件路径可以是绝对路径或相对路径（相对于当前工作目录）
2. 确保模板文件存在并且有正确的读取权限
3. 如果模板文件不存在，将会抛出错误并显示明确的错误信息
4. 如果同时提供了template参数和templateFilePath参数，templateFilePath会覆盖template参数
5. 模板文件中的内容会与用户问题拼接后发送给大模型