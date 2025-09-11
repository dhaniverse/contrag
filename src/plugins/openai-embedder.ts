import OpenAI from 'openai';
import { EmbedderPlugin } from '../types';

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

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.client) {
      throw new Error('OpenAI client not configured');
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      throw new Error(`Failed to create embeddings: ${error}`);
    }
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
