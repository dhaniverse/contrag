import {
  UserProfile,
  UserPreference,
  BehaviorPattern,
  UserAnalytics,
  PrivacySettings,
  PreferenceCapableDBPlugin
} from './types';

export class UserProfileBuilder {
  private dbPlugin: PreferenceCapableDBPlugin | null = null;
  private config: any = {};

  constructor(dbPlugin?: PreferenceCapableDBPlugin, config?: any) {
    this.dbPlugin = dbPlugin || null;
    this.config = config || {};
  }

  /**
   * Create a new user profile with default settings
   */
  async createUserProfile(userId: string, initialPreferences?: UserPreference[]): Promise<UserProfile> {
    const profile: UserProfile = {
      userId,
      createdAt: new Date(),
      lastUpdated: new Date(),
      preferences: initialPreferences || [],
      segments: [],
      behaviorPatterns: [],
      privacySettings: this.getDefaultPrivacySettings(),
      analytics: this.getDefaultAnalytics(),
      metadata: {}
    };

    if (this.dbPlugin?.updateUserProfile) {
      await this.dbPlugin.updateUserProfile(profile);
    }

    return profile;
  }

  /**
   * Get or create user profile
   */
  async getOrCreateProfile(userId: string): Promise<UserProfile> {
    if (this.dbPlugin?.getUserProfile) {
      const existingProfile = await this.dbPlugin.getUserProfile(userId);
      if (existingProfile) {
        return existingProfile;
      }
    }

    return this.createUserProfile(userId);
  }

  /**
   * Update user profile with new preferences
   */
  async updateProfileWithPreferences(userId: string, newPreferences: UserPreference[]): Promise<UserProfile> {
    const profile = await this.getOrCreateProfile(userId);

    // Merge new preferences with existing ones
    const updatedPreferences = this.mergePreferences(profile.preferences, newPreferences);
    
    // Update analytics
    const updatedAnalytics = this.updateAnalytics(profile.analytics, newPreferences);
    
    // Update segments based on preferences
    const updatedSegments = this.calculateUserSegments(updatedPreferences);

    const updatedProfile: UserProfile = {
      ...profile,
      preferences: updatedPreferences,
      segments: updatedSegments,
      analytics: updatedAnalytics,
      lastUpdated: new Date()
    };

    if (this.dbPlugin?.updateUserProfile) {
      await this.dbPlugin.updateUserProfile(updatedProfile);
    }

    return updatedProfile;
  }

  /**
   * Update behavior patterns for a user
   */
  async updateBehaviorPatterns(userId: string, newPatterns: BehaviorPattern[]): Promise<UserProfile> {
    const profile = await this.getOrCreateProfile(userId);

    // Merge new patterns with existing ones
    const updatedPatterns = this.mergeBehaviorPatterns(profile.behaviorPatterns, newPatterns);
    
    const updatedProfile: UserProfile = {
      ...profile,
      behaviorPatterns: updatedPatterns,
      lastUpdated: new Date()
    };

    if (this.dbPlugin?.updateUserProfile) {
      await this.dbPlugin.updateUserProfile(updatedProfile);
    }

    return updatedProfile;
  }

  /**
   * Get personalized context for a user
   */
  async getPersonalizedContext(userId: string, query: string): Promise<{
    enhancedQuery: string;
    relevantPreferences: UserPreference[];
    contextualInfo: Record<string, any>;
  }> {
    const profile = await this.getOrCreateProfile(userId);
    
    // Find preferences relevant to the query
    const relevantPreferences = this.findRelevantPreferences(profile.preferences, query);
    
    // Generate enhanced query with preference context
    const enhancedQuery = this.enhanceQueryWithPreferences(query, relevantPreferences);
    
    // Build contextual information
    const contextualInfo = {
      userSegments: profile.segments,
      topCategories: profile.analytics.topCategories,
      behaviorPatterns: profile.behaviorPatterns.slice(0, 3), // Top 3 patterns
      engagementScore: profile.analytics.engagementScore
    };

    return {
      enhancedQuery,
      relevantPreferences,
      contextualInfo
    };
  }

  /**
   * Calculate user engagement score
   */
  calculateEngagementScore(preferences: UserPreference[], behaviorPatterns: BehaviorPattern[], analytics: UserAnalytics): number {
    let score = 0;

    // Base score from preference diversity
    const categories = new Set(preferences.map(p => p.category));
    score += Math.min(categories.size * 10, 50); // Max 50 points for diversity

    // Score from behavior patterns
    score += behaviorPatterns.length * 5; // 5 points per pattern

    // Score from interaction frequency
    if (analytics.totalInteractions > 100) score += 30;
    else if (analytics.totalInteractions > 50) score += 20;
    else if (analytics.totalInteractions > 10) score += 10;

    // Score from preference confidence
    const avgConfidence = preferences.reduce((sum, p) => sum + p.confidence, 0) / preferences.length || 0;
    score += avgConfidence * 20; // Max 20 points for confidence

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Get user segments based on preferences and behavior
   */
  private calculateUserSegments(preferences: UserPreference[]): string[] {
    const segments: string[] = [];
    const categoryGroups: Record<string, number> = {};

    // Group preferences by category
    preferences.forEach(pref => {
      categoryGroups[pref.category] = (categoryGroups[pref.category] || 0) + 1;
    });

    // Determine segments based on preference patterns
    Object.entries(categoryGroups).forEach(([category, count]) => {
      if (count >= 5) {
        segments.push(`${category}_enthusiast`);
      } else if (count >= 3) {
        segments.push(`${category}_interested`);
      }
    });

    // Activity-based segments
    const explicitPrefs = preferences.filter(p => p.type === 'explicit').length;
    const implicitPrefs = preferences.filter(p => p.type === 'implicit').length;

    if (explicitPrefs > implicitPrefs * 2) {
      segments.push('direct_communicator');
    } else if (implicitPrefs > explicitPrefs * 2) {
      segments.push('subtle_communicator');
    }

    // Confidence-based segments
    const highConfidencePrefs = preferences.filter(p => p.confidence > 0.8).length;
    if (highConfidencePrefs / preferences.length > 0.7) {
      segments.push('clear_preferences');
    }

    return segments;
  }

  /**
   * Merge new preferences with existing ones
   */
  private mergePreferences(existing: UserPreference[], newPrefs: UserPreference[]): UserPreference[] {
    const merged = [...existing];
    
    newPrefs.forEach(newPref => {
      const existingIndex = merged.findIndex(p => 
        p.category === newPref.category && 
        p.type === newPref.type && 
        JSON.stringify(p.value) === JSON.stringify(newPref.value)
      );

      if (existingIndex >= 0) {
        // Update existing preference
        merged[existingIndex] = {
          ...merged[existingIndex],
          confidence: Math.max(merged[existingIndex].confidence, newPref.confidence),
          lastUpdated: new Date(),
          metadata: { ...merged[existingIndex].metadata, ...newPref.metadata }
        };
      } else {
        // Add new preference
        merged.push(newPref);
      }
    });

    // Sort by confidence and recency
    return merged.sort((a, b) => {
      const confidenceDiff = b.confidence - a.confidence;
      if (Math.abs(confidenceDiff) > 0.1) return confidenceDiff;
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    });
  }

  /**
   * Merge behavior patterns
   */
  private mergeBehaviorPatterns(existing: BehaviorPattern[], newPatterns: BehaviorPattern[]): BehaviorPattern[] {
    const merged = [...existing];
    
    newPatterns.forEach(newPattern => {
      const existingIndex = merged.findIndex(p => p.type === newPattern.type);
      
      if (existingIndex >= 0) {
        // Update existing pattern
        merged[existingIndex] = {
          ...merged[existingIndex],
          frequency: newPattern.frequency,
          confidence: Math.max(merged[existingIndex].confidence, newPattern.confidence),
          lastSeen: new Date(),
          trending: newPattern.trending
        };
      } else {
        // Add new pattern
        merged.push(newPattern);
      }
    });

    return merged.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Update user analytics
   */
  private updateAnalytics(current: UserAnalytics, newPreferences: UserPreference[]): UserAnalytics {
    const categories = new Set(newPreferences.map(p => p.category));
    
    return {
      ...current,
      totalInteractions: current.totalInteractions + 1,
      preferenceChanges: current.preferenceChanges + newPreferences.length,
      lastActive: new Date(),
      topCategories: this.updateTopCategories(current.topCategories, Array.from(categories)),
      trendingPreferences: this.calculateTrendingPreferences(newPreferences)
    };
  }

  /**
   * Find preferences relevant to a query
   */
  private findRelevantPreferences(preferences: UserPreference[], query: string): UserPreference[] {
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(' ').filter(word => word.length > 2);
    
    return preferences.filter(pref => {
      const prefValue = String(pref.value).toLowerCase();
      const category = pref.category.toLowerCase();
      
      return keywords.some(keyword => 
        prefValue.includes(keyword) || 
        category.includes(keyword) ||
        keyword.includes(prefValue) ||
        keyword.includes(category)
      );
    }).slice(0, 5); // Top 5 relevant preferences
  }

  /**
   * Enhance query with user preferences
   */
  private enhanceQueryWithPreferences(query: string, preferences: UserPreference[]): string {
    if (preferences.length === 0) {
      return query;
    }

    const preferenceContext = preferences
      .map(pref => `${pref.category}: ${pref.value}`)
      .join(', ');

    return `${query} (User preferences: ${preferenceContext})`;
  }

  /**
   * Update top categories based on new activity
   */
  private updateTopCategories(current: string[], newCategories: string[]): string[] {
    const categoryCount: Record<string, number> = {};
    
    // Count existing categories
    current.forEach(cat => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    
    // Add new categories
    newCategories.forEach(cat => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 2; // Weight new activity higher
    });
    
    // Return top 5 categories
    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category]) => category);
  }

  /**
   * Calculate trending preferences
   */
  private calculateTrendingPreferences(preferences: UserPreference[]): string[] {
    const recent = preferences.filter(pref => {
      const daysSince = (Date.now() - pref.extractedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7; // Last 7 days
    });
    
    const categoryCount: Record<string, number> = {};
    recent.forEach(pref => {
      categoryCount[pref.category] = (categoryCount[pref.category] || 0) + 1;
    });
    
    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
  }

  /**
   * Get default privacy settings
   */
  private getDefaultPrivacySettings(): PrivacySettings {
    return {
      dataCollection: true,
      personalizedContent: true,
      analytics: true,
      retentionPeriod: this.config.defaultRetentionDays || 365,
      shareWithThirdParty: false,
      deleteOnRequest: true
    };
  }

  /**
   * Get default analytics
   */
  private getDefaultAnalytics(): UserAnalytics {
    return {
      totalInteractions: 0,
      preferenceChanges: 0,
      engagementScore: 0,
      lastActive: new Date(),
      avgSessionDuration: 0,
      topCategories: [],
      trendingPreferences: []
    };
  }
}
