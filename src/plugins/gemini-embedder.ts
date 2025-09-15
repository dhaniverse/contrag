import { EmbedderPlugin, ConnectionTestResult } from '../types';
import { DEFAULT_CONFIG } from '../constants';

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

  async embed(texts: string[], systemPrompt?: string): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      // Process texts with optional system prompt
      let processedTexts = texts;
      if (systemPrompt) {
        processedTexts = texts.map(text => `${systemPrompt}\n\n${text}`);
      }

      const embeddings: number[][] = [];
      
      // Process in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < processedTexts.length; i += batchSize) {
        const batch = processedTexts.slice(i, i + batchSize);
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

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      if (!this.apiKey) {
        throw new Error('Gemini API key not configured');
      }

      // Test with a simple embedding request
      await this.embedBatch(['test connection']);
      
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
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const fetch = (await import('node-fetch')).default;
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`;
      
      const request = {
        contents: [
          {
            parts: [
              { text: `${systemPrompt}\n\nUser: ${text}\nAssistant:` }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7
        }
      };

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

      const result = await response.json();
      return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      throw new Error(`Failed to generate text: ${error}`);
    }
  }
}
