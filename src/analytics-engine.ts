import {
  PreferenceAnalyticsQuery,
  PreferenceAnalyticsResult,
  UserPreference,
  UserProfile,
  BehaviorPattern,
  PreferenceCapableDBPlugin
} from './types';

export class PreferenceAnalyticsEngine {
  private dbPlugin: PreferenceCapableDBPlugin | null = null;
  private config: any = {};

  constructor(dbPlugin?: PreferenceCapableDBPlugin, config?: any) {
    this.dbPlugin = dbPlugin || null;
    this.config = config || {};
  }

  /**
   * Generate comprehensive preference analytics
   */
  async generateAnalytics(query: PreferenceAnalyticsQuery): Promise<PreferenceAnalyticsResult> {
    if (!this.dbPlugin?.getPreferenceAnalytics) {
      throw new Error('Database plugin does not support preference analytics');
    }

    const baseAnalytics = await this.dbPlugin.getPreferenceAnalytics(query);

    // Enhance with additional insights
    const enhancedResults = {
      ...baseAnalytics.results,
      insights: await this.generateInsights(baseAnalytics),
      recommendations: await this.generateRecommendations(baseAnalytics),
      trends: await this.analyzeTrends(query),
      segments: await this.analyzeUserSegments(query)
    };

    return {
      ...baseAnalytics,
      results: enhancedResults
    };
  }

  /**
   * Analyze user engagement patterns
   */
  async analyzeUserEngagement(userId?: string): Promise<{
    engagementScore: number;
    activityLevel: 'low' | 'medium' | 'high';
    preferenceEvolution: Array<{
      date: string;
      categories: string[];
      confidence: number;
    }>;
    recommendations: string[];
  }> {
    if (!this.dbPlugin?.getUserProfile) {
      throw new Error('Database plugin does not support user profiles');
    }

    let engagementScore = 0;
    let activityLevel: 'low' | 'medium' | 'high' = 'low';
    let preferenceEvolution: Array<{
      date: string;
      categories: string[];
      confidence: number;
    }> = [];

    if (userId) {
      const profile = await this.dbPlugin.getUserProfile(userId);
      if (profile) {
        engagementScore = profile.analytics.engagementScore;
        
        if (engagementScore >= 70) activityLevel = 'high';
        else if (engagementScore >= 40) activityLevel = 'medium';

        // Analyze preference evolution over time
        preferenceEvolution = this.calculatePreferenceEvolution(profile.preferences);
      }
    } else {
      // Aggregate analysis across all users
      const analytics = await this.generateAnalytics({
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date()
        }
      });

      // Calculate average engagement from analytics
      engagementScore = this.calculateAverageEngagement(analytics);
      if (engagementScore >= 70) activityLevel = 'high';
      else if (engagementScore >= 40) activityLevel = 'medium';
    }

    const recommendations = this.generateEngagementRecommendations(engagementScore, activityLevel);

    return {
      engagementScore,
      activityLevel,
      preferenceEvolution,
      recommendations
    };
  }

  /**
   * Generate personalization insights
   */
  async generatePersonalizationInsights(userId: string): Promise<{
    personalizedCategories: Array<{
      category: string;
      strength: number;
      trending: boolean;
    }>;
    behaviorInsights: Array<{
      type: string;
      description: string;
      confidence: number;
    }>;
    contentRecommendations: Array<{
      type: string;
      reason: string;
      priority: number;
    }>;
  }> {
    if (!this.dbPlugin?.getUserProfile) {
      throw new Error('Database plugin does not support user profiles');
    }

    const profile = await this.dbPlugin.getUserProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    // Analyze personalized categories
    const personalizedCategories = this.analyzePersonalizedCategories(profile.preferences);

    // Generate behavior insights
    const behaviorInsights = this.generateBehaviorInsights(profile.behaviorPatterns);

    // Generate content recommendations
    const contentRecommendations = this.generateContentRecommendations(profile);

    return {
      personalizedCategories,
      behaviorInsights,
      contentRecommendations
    };
  }

  /**
   * Analyze preference quality and reliability
   */
  async analyzePreferenceQuality(userId?: string): Promise<{
    overallQuality: number;
    qualityByCategory: Record<string, number>;
    reliabilityScore: number;
    consistencyScore: number;
    recommendations: string[];
  }> {
    let preferences: UserPreference[] = [];

    if (userId) {
      if (!this.dbPlugin?.getUserPreferences) {
        throw new Error('Database plugin does not support preference retrieval');
      }
      preferences = await this.dbPlugin.getUserPreferences(userId);
    } else {
      // Would need to aggregate across all users - simplified for now
      const analytics = await this.generateAnalytics({});
      // Use mock data based on analytics
      preferences = this.generateMockPreferencesFromAnalytics(analytics);
    }

    const qualityMetrics = this.calculatePreferenceQuality(preferences);

    return qualityMetrics;
  }

  /**
   * Generate real-time preference insights
   */
  async generateRealTimeInsights(userId: string, timeWindowMinutes: number = 60): Promise<{
    recentActivity: {
      newPreferences: number;
      updatedPreferences: number;
      categoriesActive: string[];
    };
    behaviorChanges: Array<{
      type: string;
      change: 'increased' | 'decreased' | 'new';
      significance: number;
    }>;
    alerts: Array<{
      type: 'trend_change' | 'new_interest' | 'behavior_shift';
      message: string;
      priority: 'low' | 'medium' | 'high';
    }>;
  }> {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    if (!this.dbPlugin?.getUserPreferences) {
      throw new Error('Database plugin does not support preference retrieval');
    }

    const allPreferences = await this.dbPlugin.getUserPreferences(userId);
    const recentPreferences = allPreferences.filter(p => p.lastUpdated > cutoffTime);

    const recentActivity = {
      newPreferences: recentPreferences.filter(p => p.extractedAt > cutoffTime).length,
      updatedPreferences: recentPreferences.filter(p => p.extractedAt <= cutoffTime).length,
      categoriesActive: [...new Set(recentPreferences.map(p => p.category))]
    };

    // Analyze behavior changes (simplified)
    const behaviorChanges = this.analyzeBehaviorChanges(allPreferences, recentPreferences);

    // Generate alerts
    const alerts = this.generateRealTimeAlerts(recentActivity, behaviorChanges);

    return {
      recentActivity,
      behaviorChanges,
      alerts
    };
  }

  private async generateInsights(analytics: PreferenceAnalyticsResult): Promise<string[]> {
    const insights: string[] = [];

    // Analyze category distribution
    const topCategory = Object.entries(analytics.results.byCategory)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topCategory) {
      insights.push(`${topCategory[0]} is the most popular preference category with ${topCategory[1]} preferences`);
    }

    // Analyze confidence distribution
    const { high, medium, low } = analytics.results.confidenceDistribution;
    const total = high + medium + low;
    
    if (total > 0) {
      const highPercent = Math.round((high / total) * 100);
      insights.push(`${highPercent}% of preferences have high confidence (>0.8)`);
    }

    // Analyze preference sources
    const topSource = Object.entries(analytics.results.bySource)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topSource) {
      insights.push(`Most preferences come from ${topSource[0]} (${topSource[1]} preferences)`);
    }

    return insights;
  }

  private async generateRecommendations(analytics: PreferenceAnalyticsResult): Promise<string[]> {
    const recommendations: string[] = [];

    // Analyze confidence distribution for recommendations
    const { high, medium, low } = analytics.results.confidenceDistribution;
    const total = high + medium + low;

    if (total > 0 && low / total > 0.3) {
      recommendations.push('Consider improving preference extraction methods to increase confidence scores');
    }

    if (Object.keys(analytics.results.byCategory).length < 3) {
      recommendations.push('Expand preference tracking to more categories for better personalization');
    }

    const explicitPrefs = analytics.results.byType['explicit'] || 0;
    const implicitPrefs = analytics.results.byType['implicit'] || 0;

    if (explicitPrefs < implicitPrefs / 2) {
      recommendations.push('Encourage more explicit preference feedback from users');
    }

    return recommendations;
  }

  private async analyzeTrends(query: PreferenceAnalyticsQuery): Promise<Array<{
    category: string;
    trend: 'up' | 'down' | 'stable';
    change: number;
  }>> {
    // This would require historical data analysis
    // For now, return mock trending data
    const mockTrends = [
      { category: 'food', trend: 'up' as const, change: 15 },
      { category: 'entertainment', trend: 'stable' as const, change: 0 },
      { category: 'technology', trend: 'down' as const, change: -8 }
    ];

    return mockTrends;
  }

  private async analyzeUserSegments(query: PreferenceAnalyticsQuery): Promise<Array<{
    segment: string;
    userCount: number;
    characteristics: string[];
  }>> {
    // This would require cross-user analysis
    // For now, return mock segment data
    const mockSegments = [
      {
        segment: 'food_enthusiasts',
        userCount: 150,
        characteristics: ['High food category preferences', 'Regular dining interactions']
      },
      {
        segment: 'tech_savvy',
        userCount: 89,
        characteristics: ['Technology preferences', 'Early adopters']
      }
    ];

    return mockSegments;
  }

  private calculatePreferenceEvolution(preferences: UserPreference[]): Array<{
    date: string;
    categories: string[];
    confidence: number;
  }> {
    const grouped: Record<string, UserPreference[]> = {};

    preferences.forEach(pref => {
      const date = pref.extractedAt.toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(pref);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7) // Last 7 days
      .map(([date, prefs]) => ({
        date,
        categories: [...new Set(prefs.map(p => p.category))],
        confidence: prefs.reduce((sum, p) => sum + p.confidence, 0) / prefs.length
      }));
  }

  private calculateAverageEngagement(analytics: PreferenceAnalyticsResult): number {
    // Simple heuristic based on preference diversity and confidence
    const categoryCount = Object.keys(analytics.results.byCategory).length;
    const { high, medium, low } = analytics.results.confidenceDistribution;
    const total = high + medium + low;
    
    if (total === 0) return 0;

    const diversityScore = Math.min(categoryCount * 10, 40);
    const confidenceScore = ((high * 1.0 + medium * 0.6 + low * 0.2) / total) * 60;

    return Math.round(diversityScore + confidenceScore);
  }

  private generateEngagementRecommendations(score: number, level: string): string[] {
    const recommendations: string[] = [];

    if (level === 'low') {
      recommendations.push('Increase user interaction frequency');
      recommendations.push('Implement preference collection prompts');
      recommendations.push('Add gamification elements for preference sharing');
    } else if (level === 'medium') {
      recommendations.push('Focus on preference quality improvement');
      recommendations.push('Expand to new preference categories');
    } else {
      recommendations.push('Maintain current engagement levels');
      recommendations.push('Focus on preference refinement and accuracy');
    }

    return recommendations;
  }

  private analyzePersonalizedCategories(preferences: UserPreference[]): Array<{
    category: string;
    strength: number;
    trending: boolean;
  }> {
    const categoryStats: Record<string, { count: number; avgConfidence: number; recent: number }> = {};

    preferences.forEach(pref => {
      if (!categoryStats[pref.category]) {
        categoryStats[pref.category] = { count: 0, avgConfidence: 0, recent: 0 };
      }

      categoryStats[pref.category].count++;
      categoryStats[pref.category].avgConfidence += pref.confidence;

      const daysSince = (Date.now() - pref.extractedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince <= 7) {
        categoryStats[pref.category].recent++;
      }
    });

    return Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      strength: Math.round((stats.count * (stats.avgConfidence / stats.count)) * 10) / 10,
      trending: stats.recent >= stats.count * 0.3
    })).sort((a, b) => b.strength - a.strength);
  }

  private generateBehaviorInsights(patterns: BehaviorPattern[]): Array<{
    type: string;
    description: string;
    confidence: number;
  }> {
    return patterns.map(pattern => ({
      type: pattern.type,
      description: this.describeBehaviorPattern(pattern),
      confidence: pattern.confidence
    }));
  }

  private generateContentRecommendations(profile: UserProfile): Array<{
    type: string;
    reason: string;
    priority: number;
  }> {
    const recommendations: Array<{
      type: string;
      reason: string;
      priority: number;
    }> = [];

    // Based on top categories
    profile.analytics.topCategories.forEach((category, index) => {
      recommendations.push({
        type: `${category}_content`,
        reason: `User shows strong interest in ${category}`,
        priority: 5 - index
      });
    });

    // Based on behavior patterns
    profile.behaviorPatterns.forEach(pattern => {
      if (pattern.confidence > 0.8) {
        recommendations.push({
          type: `${pattern.type}_optimized`,
          reason: `Strong ${pattern.type} behavior detected`,
          priority: Math.round(pattern.confidence * 5)
        });
      }
    });

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  private calculatePreferenceQuality(preferences: UserPreference[]): {
    overallQuality: number;
    qualityByCategory: Record<string, number>;
    reliabilityScore: number;
    consistencyScore: number;
    recommendations: string[];
  } {
    if (preferences.length === 0) {
      return {
        overallQuality: 0,
        qualityByCategory: {},
        reliabilityScore: 0,
        consistencyScore: 0,
        recommendations: ['No preferences available for quality analysis']
      };
    }

    const avgConfidence = preferences.reduce((sum, p) => sum + p.confidence, 0) / preferences.length;
    const overallQuality = Math.round(avgConfidence * 100);

    // Quality by category
    const qualityByCategory: Record<string, number> = {};
    const categoryGroups: Record<string, UserPreference[]> = {};

    preferences.forEach(pref => {
      if (!categoryGroups[pref.category]) categoryGroups[pref.category] = [];
      categoryGroups[pref.category].push(pref);
    });

    Object.entries(categoryGroups).forEach(([category, prefs]) => {
      const avgCatConfidence = prefs.reduce((sum, p) => sum + p.confidence, 0) / prefs.length;
      qualityByCategory[category] = Math.round(avgCatConfidence * 100);
    });

    // Reliability based on source diversity
    const sources = new Set(preferences.map(p => p.source));
    const reliabilityScore = Math.min(sources.size * 25, 100);

    // Consistency based on confidence variance
    const variance = preferences.reduce((sum, p) => sum + Math.pow(p.confidence - avgConfidence, 2), 0) / preferences.length;
    const consistencyScore = Math.max(0, 100 - (variance * 200));

    const recommendations: string[] = [];
    if (overallQuality < 70) recommendations.push('Improve preference extraction methods');
    if (reliabilityScore < 50) recommendations.push('Diversify preference collection sources');
    if (consistencyScore < 60) recommendations.push('Focus on consistent confidence scoring');

    return {
      overallQuality,
      qualityByCategory,
      reliabilityScore: Math.round(reliabilityScore),
      consistencyScore: Math.round(consistencyScore),
      recommendations
    };
  }

  private generateMockPreferencesFromAnalytics(analytics: PreferenceAnalyticsResult): UserPreference[] {
    // Generate mock preferences based on analytics for system-wide analysis
    const preferences: UserPreference[] = [];
    let id = 1;

    Object.entries(analytics.results.byCategory).forEach(([category, count]) => {
      for (let i = 0; i < Math.min(count, 5); i++) {
        preferences.push({
          id: `mock-${id++}`,
          userId: 'system-analysis',
          category,
          type: i % 2 === 0 ? 'explicit' : 'implicit',
          value: `${category}-preference-${i}`,
          confidence: 0.5 + (Math.random() * 0.5),
          source: 'conversation',
          extractedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          lastUpdated: new Date()
        });
      }
    });

    return preferences;
  }

  private analyzeBehaviorChanges(allPreferences: UserPreference[], recentPreferences: UserPreference[]): Array<{
    type: string;
    change: 'increased' | 'decreased' | 'new';
    significance: number;
  }> {
    const changes: Array<{
      type: string;
      change: 'increased' | 'decreased' | 'new';
      significance: number;
    }> = [];

    const recentCategories = new Set(recentPreferences.map(p => p.category));
    const allCategories = new Set(allPreferences.map(p => p.category));

    // New categories
    recentCategories.forEach(category => {
      if (!allCategories.has(category)) {
        changes.push({
          type: category,
          change: 'new',
          significance: 0.8
        });
      }
    });

    return changes;
  }

  private generateRealTimeAlerts(
    activity: any, 
    changes: Array<{ type: string; change: string; significance: number }>
  ): Array<{
    type: 'trend_change' | 'new_interest' | 'behavior_shift';
    message: string;
    priority: 'low' | 'medium' | 'high';
  }> {
    const alerts: Array<{
      type: 'trend_change' | 'new_interest' | 'behavior_shift';
      message: string;
      priority: 'low' | 'medium' | 'high';
    }> = [];

    if (activity.newPreferences > 5) {
      alerts.push({
        type: 'behavior_shift',
        message: `High preference activity: ${activity.newPreferences} new preferences`,
        priority: 'high'
      });
    }

    changes.forEach(change => {
      if (change.change === 'new' && change.significance > 0.7) {
        alerts.push({
          type: 'new_interest',
          message: `New interest detected in ${change.type}`,
          priority: 'medium'
        });
      }
    });

    return alerts;
  }

  private describeBehaviorPattern(pattern: BehaviorPattern): string {
    switch (pattern.type) {
      case 'high_frequency_user':
        return 'User shows high engagement with frequent interactions';
      case 'morning_user':
        return 'User is most active in the morning hours';
      case 'evening_user':
        return 'User prefers evening interactions';
      default:
        return `User shows ${pattern.type} behavior pattern`;
    }
  }
}
