import {
  PreferenceExtractor,
  PreferenceExtractionRequest,
  PreferenceExtractionResult,
  UserPreference,
  BehaviorPattern,
  ConnectionTestResult,
  EmbedderPlugin
} from '../types';

export class LLMPreferenceExtractor implements PreferenceExtractor {
  name = 'LLM Preference Extractor';
  private embedderPlugin: EmbedderPlugin | null = null;
  private config: any = null;

  async configure(config: Record<string, any>): Promise<void> {
    this.config = config;
    this.embedderPlugin = config.embedderPlugin;
  }

  async extractFromConversation(request: PreferenceExtractionRequest): Promise<PreferenceExtractionResult> {
    if (!this.embedderPlugin) {
      throw new Error('Embedder plugin not configured for preference extraction');
    }

    const startTime = Date.now();
    
    // Build extraction prompt
    const extractionPrompt = this.buildExtractionPrompt(request);
    
    // Use embedder's generation capability if available
    let extractionResponse: string;
    
    if (this.embedderPlugin.generateWithPrompt) {
      extractionResponse = await this.embedderPlugin.generateWithPrompt(
        request.conversationText,
        extractionPrompt
      );
    } else {
      // Fallback: analyze text patterns for basic preference extraction
      extractionResponse = await this.fallbackExtraction(request);
    }

    // Parse the extraction response
    const extractedPreferences = this.parseExtractionResponse(
      extractionResponse, 
      request.userId, 
      request.sessionId, 
      request.conversationId
    );

    const processingTime = Date.now() - startTime;

    return {
      userId: request.userId,
      extractedPreferences,
      confidence: this.calculateOverallConfidence(extractedPreferences),
      processingTime,
      llmModel: this.config?.model || this.embedderPlugin.name,
      metadata: {
        totalTokens: extractionResponse.length,
        reasoning: `Extracted ${extractedPreferences.length} preferences using ${this.name}`
      }
    };
  }

  async analyzeUserBehavior(userId: string, interactions: any[]): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];
    
    if (interactions.length === 0) {
      return patterns;
    }

    // Analyze interaction frequency patterns
    const frequencyPattern = this.analyzeFrequencyPatterns(interactions);
    if (frequencyPattern) {
      patterns.push(frequencyPattern);
    }

    // Analyze time-based patterns
    const timePattern = this.analyzeTimePatterns(interactions);
    if (timePattern) {
      patterns.push(timePattern);
    }

    // Analyze content preference patterns
    const contentPatterns = this.analyzeContentPatterns(interactions);
    patterns.push(...contentPatterns);

    return patterns;
  }

  async generatePersonalizedContext(userId: string, query: string): Promise<string> {
    // This would typically fetch user preferences and create personalized context
    // For now, return enhanced query with personalization markers
    return `Personalized query for user ${userId}: ${query}`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const startTime = Date.now();
      
      // Test basic extraction with a simple request
      const testRequest: PreferenceExtractionRequest = {
        userId: 'test-user',
        conversationText: 'I really love pizza and prefer spicy food.',
        extractionOptions: {
          categories: ['food'],
          confidenceThreshold: 0.5,
          maxPreferences: 2
        }
      };

      const result = await this.extractFromConversation(testRequest);
      const latency = Date.now() - startTime;

      return {
        plugin: this.name,
        connected: result.extractedPreferences.length > 0,
        latency,
        details: {
          preferencesExtracted: result.extractedPreferences.length,
          avgConfidence: result.confidence
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

  private buildExtractionPrompt(request: PreferenceExtractionRequest): string {
    const categories = request.extractionOptions?.categories?.join(', ') || 'any category';
    const confidenceThreshold = request.extractionOptions?.confidenceThreshold || 0.7;
    
    return `
Analyze the following conversation text and extract user preferences.

Instructions:
- Extract preferences related to: ${categories}
- Only include preferences with confidence >= ${confidenceThreshold}
- Classify preferences as 'explicit' (directly stated) or 'implicit' (inferred)
- Provide a confidence score (0-1) for each preference
- Format response as JSON array

Conversation text:
${request.conversationText}

Expected JSON format:
[{
  "category": "string",
  "type": "explicit|implicit",
  "value": "any",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}]
`;
  }

  private async fallbackExtraction(request: PreferenceExtractionRequest): Promise<string> {
    // Simple keyword-based extraction as fallback
    const text = request.conversationText.toLowerCase();
    const preferences: any[] = [];

    // Food preferences
    if (text.includes('love') || text.includes('like') || text.includes('prefer')) {
      const foodKeywords = ['pizza', 'burger', 'salad', 'spicy', 'sweet', 'healthy', 'fast food'];
      for (const keyword of foodKeywords) {
        if (text.includes(keyword)) {
          preferences.push({
            category: 'food',
            type: text.includes('love') || text.includes('prefer') ? 'explicit' : 'implicit',
            value: keyword,
            confidence: 0.8,
            reasoning: `Found keyword "${keyword}" with positive sentiment`
          });
        }
      }
    }

    return JSON.stringify(preferences);
  }

  private parseExtractionResponse(
    response: string, 
    userId: string, 
    sessionId?: string, 
    conversationId?: string
  ): UserPreference[] {
    try {
      const parsedResponse = JSON.parse(response);
      const preferences: UserPreference[] = [];

      for (const item of parsedResponse) {
        if (item.category && item.type && item.confidence >= 0.5) {
          preferences.push({
            id: `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId,
            category: item.category,
            type: item.type,
            value: item.value,
            confidence: item.confidence,
            source: 'conversation',
            extractedAt: new Date(),
            lastUpdated: new Date(),
            context: {
              reasoning: item.reasoning
            },
            metadata: {
              sessionId,
              conversationId,
              extractionMethod: this.name,
              llmModel: this.config?.model
            }
          });
        }
      }

      return preferences;
    } catch (error) {
      console.warn('Failed to parse extraction response:', error);
      return [];
    }
  }

  private calculateOverallConfidence(preferences: UserPreference[]): number {
    if (preferences.length === 0) return 0;
    
    const totalConfidence = preferences.reduce((sum, pref) => sum + pref.confidence, 0);
    return totalConfidence / preferences.length;
  }

  private analyzeFrequencyPatterns(interactions: any[]): BehaviorPattern | null {
    const dailyInteractions = this.groupByDay(interactions);
    const avgDaily = Object.values(dailyInteractions).reduce((sum: number, count) => sum + (count as number), 0) / Object.keys(dailyInteractions).length;

    if (avgDaily >= 5) {
      return {
        id: `frequency-${Date.now()}`,
        type: 'high_frequency_user',
        pattern: { avgDailyInteractions: avgDaily },
        frequency: avgDaily,
        confidence: 0.9,
        lastSeen: new Date(),
        trending: true
      };
    }

    return null;
  }

  private analyzeTimePatterns(interactions: any[]): BehaviorPattern | null {
    const hourCounts: Record<number, number> = {};
    
    interactions.forEach(interaction => {
      const hour = new Date(interaction.timestamp || Date.now()).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHour = Object.entries(hourCounts).reduce((peak, [hour, count]) => 
      count > peak.count ? { hour: parseInt(hour), count } : peak,
      { hour: 0, count: 0 }
    );

    if (peakHour.count >= 3) {
      let timeOfDay = 'morning';
      if (peakHour.hour >= 12 && peakHour.hour < 17) timeOfDay = 'afternoon';
      else if (peakHour.hour >= 17 && peakHour.hour < 21) timeOfDay = 'evening';
      else if (peakHour.hour >= 21 || peakHour.hour < 6) timeOfDay = 'night';

      return {
        id: `time-${Date.now()}`,
        type: `${timeOfDay}_user`,
        pattern: { peakHour: peakHour.hour, timeOfDay },
        frequency: peakHour.count,
        confidence: 0.8,
        lastSeen: new Date(),
        trending: false
      };
    }

    return null;
  }

  private analyzeContentPatterns(interactions: any[]): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];
    const contentTypes: Record<string, number> = {};

    interactions.forEach(interaction => {
      const content = interaction.content || interaction.query || '';
      
      // Simple content categorization
      if (content.toLowerCase().includes('food') || content.toLowerCase().includes('restaurant')) {
        contentTypes['food'] = (contentTypes['food'] || 0) + 1;
      }
      if (content.toLowerCase().includes('travel') || content.toLowerCase().includes('trip')) {
        contentTypes['travel'] = (contentTypes['travel'] || 0) + 1;
      }
      if (content.toLowerCase().includes('tech') || content.toLowerCase().includes('software')) {
        contentTypes['technology'] = (contentTypes['technology'] || 0) + 1;
      }
    });

    Object.entries(contentTypes).forEach(([type, count]) => {
      if (count >= 3) {
        patterns.push({
          id: `content-${type}-${Date.now()}`,
          type: `${type}_interest`,
          pattern: { category: type, interactions: count },
          frequency: count,
          confidence: Math.min(0.9, count / 10),
          lastSeen: new Date(),
          trending: count > interactions.length * 0.3
        });
      }
    });

    return patterns;
  }

  private groupByDay(interactions: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    interactions.forEach(interaction => {
      const date = new Date(interaction.timestamp || Date.now()).toISOString().split('T')[0];
      grouped[date] = (grouped[date] || 0) + 1;
    });

    return grouped;
  }
}
