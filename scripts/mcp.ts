import 'dotenv/config';

import { createCerebras } from '@ai-sdk/cerebras';
import { createMCPClient } from '@ai-sdk/mcp';
import { generateText, stepCountIs } from 'ai';
import { SYSTEM_PROMPT } from '../src/util/constants.js';

(async () => {
  const mcpClient = await createMCPClient({
    transport: {
      type: 'http',
      url: 'https://docs.clashperk.com/~gitbook/mcp'
    },
    onUncaughtError(error) {
      console.error(error);
    }
  });

  const tools = await mcpClient.tools();

  const cerebras = createCerebras({
    apiKey: process.env.CEREBRAS_API_KEY
  });

  const result = await generateText({
    model: cerebras('gpt-oss-120b'),
    tools,
    onFinish: async () => {
      await mcpClient.close();
    },
    stopWhen: stepCountIs(5),
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: [{ type: 'text', text: 'Can anyone give war log reminder set up commands' }]
      }
    ],
    maxOutputTokens: 4096
  });

  console.log(result.text);
  console.log(result.usage.totalTokens);
})();
