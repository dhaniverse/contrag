import { EmbedderPlugin } from '../types';

export class GeminiEmbedderPlugin implements EmbedderPlugin {
  public readonly name = 'gemini';
  private apiKey: string | null = null;
  private model = 'embedding-001';
  private dimensions = 768;

  async configure(config: { apiKey: string; model?: string }): Promise<void> {
    this.apiKey = config.apiKey;
    
    if (config.model) {
      this.model = config.model;
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const embeddings: number[][] = [];
      
      // Process in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchEmbeddings = await this.embedBatch(batch);
        embeddings.push(...batchEmbeddings);
      }

      return embeddings;
    } catch (error) {
      throw new Error(`Failed to create Gemini embeddings: ${error}`);
    }
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    const requests = texts.map(text => ({
      model: `models/${this.model}`,
      content: { parts: [{ text }] }
    }));

    const responses = await Promise.all(
      requests.map(request => this.makeRequest(request))
    );

    return responses.map(response => {
      if (!response.embedding || !response.embedding.values) {
        throw new Error('Invalid embedding response from Gemini');
      }
      return response.embedding.values;
    });
  }

  private async makeRequest(request: any): Promise<any> {
    const fetch = (await import('node-fetch')).default;
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
