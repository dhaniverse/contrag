import OpenAI from 'openai';
import { EmbedderPlugin, ConnectionTestResult } from '../types';
import { DEFAULT_CONFIG } from '../constants';

export class OpenAIEmbedderPlugin implements EmbedderPlugin {
  public readonly name = 'openai';
  private client: OpenAI | null = null;
  private model = 'text-embedding-ada-002';
  private dimensions = 1536;

  async configure(config: { apiKey: string; model?: string }): Promise<void> {
    this.client = new OpenAI({
      apiKey: config.apiKey
    });

    if (config.model) {
      this.model = config.model;
      // Update dimensions based on model
      if (config.model === 'text-embedding-3-small') {
        this.dimensions = 1536;
      } else if (config.model === 'text-embedding-3-large') {
        this.dimensions = 3072;
      }
    }
  }

  async embed(texts: string[], systemPrompt?: string): Promise<number[][]> {
    if (!this.client) {
      throw new Error('OpenAI client not configured');
    }

    try {
      // For embeddings, we don't use system prompts directly, but we could preprocess the text
      let processedTexts = texts;
      if (systemPrompt) {
        // Optionally prepend system context to each text for better embedding
        processedTexts = texts.map(text => `${systemPrompt}\n\n${text}`);
      }

      const response = await this.client.embeddings.create({
        model: this.model,
        input: processedTexts,
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      throw new Error(`Failed to create embeddings: ${error}`);
    }
  }

  getDimensions(): number {
    return this.dimensions;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      if (!this.client) {
        throw new Error('OpenAI client not configured');
      }

      // Test with a simple embedding request
      await this.client.embeddings.create({
        model: this.model,
        input: ['test connection'],
      });
      
      const latency = Date.now() - startTime;
      
      return {
        plugin: this.name,
        connected: true,
        latency,
        details: {
          model: this.model,
          dimensions: this.dimensions
        }
      };
    } catch (error) {
      return {
        plugin: this.name,
        connected: false,
        error: String(error)
      };
    }
  }

  async generateWithPrompt(text: string, systemPrompt: string): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not configured');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo', // Use a chat model for text generation
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      throw new Error(`Failed to generate text: ${error}`);
    }
  }
}
