const DifyDeepSeekCodeGenerator = require('./index');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

/**
 * 示例：使用Dify DeepSeek模型生成代码并创建文件
 */
async function main() {
    try {
        // 从环境变量获取API密钥，如果不存在则提示用户输入
        let apiKey = process.env.DIFY_API_KEY;
        
        if (!apiKey) {
            console.log('请在.env文件中设置DIFY_API_KEY环境变量，或者直接在这里输入');
            // 在实际使用时，你可以通过命令行参数或其他方式获取API密钥
            // 这里为了简化示例，我们使用一个占位符
            apiKey = 'your-dify-api-key'; // 请替换为你的实际API密钥
        }

        // 创建代码生成器实例
        const generator = new DifyDeepSeekCodeGenerator(apiKey);

        // 示例1：生成一个简单的React组件
        console.log('\n=== 示例1: 生成React组件 ===');
        const reactTemplate = '请按照以下格式返回代码：\n```jsx\n// 文件名: src/components/Greeting.jsx\n// React组件代码\n```\n\n请确保在代码块前添加正确的文件名注释，并确保代码可以直接运行。';
        
        const reactQuestion = '请帮我创建一个简单的React Greeting组件，它接收一个name属性并显示问候信息';
        
        await generator.generateCode(reactQuestion, reactTemplate, './output/react-example');

        // 示例2：生成一个Express API服务器
        console.log('\n=== 示例2: 生成Express API服务器 ===');
        const expressTemplate = '请按照以下格式返回代码：\n```javascript\n// 文件名: server.js\n// Express服务器代码\n```\n```json\n// 文件名: package.json\n// 项目依赖配置\n```\n\n请确保在代码块前添加正确的文件名注释，并确保代码可以直接运行。';
        
        const expressQuestion = '请帮我创建一个简单的Express API服务器，包含一个GET路由/health返回健康状态，以及一个POST路由/api/data接收和返回JSON数据';
        
        await generator.generateCode(expressQuestion, expressTemplate, './output/express-example');

        // 示例3：生成一个完整的项目结构（根据用户需求）
        console.log('\n=== 示例3: 生成完整项目结构 ===');
        const projectTemplate = '请根据用户需求生成完整的项目结构，每个文件都必须按照以下格式：\n```文件类型\n// 文件名: 路径/文件名\n// 文件内容\n```\n\n请确保在代码块前添加正确的文件名注释，并确保代码可以直接运行。如果需要多个文件，请为每个文件创建单独的代码块。';
        
        const projectQuestion = '请帮我创建一个简单的Node.js命令行工具项目结构，功能是读取一个文本文件并统计其中的单词数量。项目应该包含主程序文件、package.json配置文件和一个示例文本文件。';
        
        await generator.generateCode(projectQuestion, projectTemplate, './output/cli-tool-example');

        console.log('\n所有示例执行完成！请查看output目录下的生成文件。');
    } catch (error) {
        console.error('执行过程中出错:', error);
    }
}

// 运行示例
main();

/**
 * 使用说明：
 * 1. 首先需要安装依赖：npm install dotenv
 * 2. 创建.env文件，添加DIFY_API_KEY=your-actual-api-key
 * 3. 运行示例：node example.js
 * 
 * 注意事项：
 * - 请确保你有有效的Dify API密钥
 * - 生成的文件将保存在output目录下
 * - 你可以根据自己的需求修改示例中的问题和模板
 */