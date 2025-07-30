import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface AIAnalysisRequest {
  sourceCode: string;
  analysisType: 'refactor' | 'optimize' | 'security' | 'patterns';
  context?: string;
  preferences?: {
    facetSize?: 'small' | 'medium' | 'large';
    optimization?: 'gas' | 'readability' | 'security';
    patterns?: string[];
  };
}

export interface AIAnalysisResponse {
  suggestions: string[];
  reasoning: string;
  code?: string;
  confidence: number;
  warnings?: string[];
}

export class AIService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;

  constructor() {
    // Initialize AI clients if API keys are provided
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    if (!this.openai && !this.anthropic) {
      console.warn('⚠️  No AI API keys configured. AI features will be limited.');
    }
  }

  /**
   * Analyze contract and provide AI-powered suggestions
   */
  async analyzeContract(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      if (this.openai) {
        return await this.analyzeWithOpenAI(request);
      } else if (this.anthropic) {
        return await this.analyzeWithAnthropic(request);
      } else {
        return this.getFallbackAnalysis(request);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      return this.getFallbackAnalysis(request);
    }
  }

  /**
   * OpenAI-powered analysis
   */
  private async analyzeWithOpenAI(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const systemPrompt = this.getSystemPrompt(request.analysisType);
    const userPrompt = this.getUserPrompt(request);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content || '';
    return this.parseAIResponse(content);
  }

  /**
   * Anthropic Claude-powered analysis
   */
  private async analyzeWithAnthropic(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const systemPrompt = this.getSystemPrompt(request.analysisType);
    const userPrompt = this.getUserPrompt(request);

    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return this.parseAIResponse(content);
  }

  /**
   * Get system prompt based on analysis type
   */
  private getSystemPrompt(analysisType: string): string {
    const basePrompt = `You are an expert Solidity developer specializing in smart contract modularization and the PayRox Go Beyond framework. Your expertise includes:

- Smart contract refactoring and optimization
- PayRox Go Beyond manifest-based modular routing
- CREATE2 deterministic deployment patterns
- Gas optimization techniques
- Security best practices
- Diamond pattern alternatives

Always provide:
1. Clear, actionable suggestions
2. Detailed reasoning for recommendations
3. Security and gas optimization considerations
4. PayRox Go Beyond specific insights

Response format (JSON):
{
  "suggestions": ["suggestion1", "suggestion2"],
  "reasoning": "detailed explanation",
  "code": "optional code snippet",
  "confidence": 0.85,
  "warnings": ["optional warnings"]
}`;

    switch (analysisType) {
      case 'refactor':
        return basePrompt + `

Focus on breaking down monolithic contracts into modular facets optimized for PayRox Go Beyond deployment.`;

      case 'optimize':
        return basePrompt + `

Focus on gas optimization, storage layout efficiency, and performance improvements.`;

      case 'security':
        return basePrompt + `

Focus on security vulnerabilities, access control, and attack vector analysis.`;

      case 'patterns':
        return basePrompt + `

Focus on identifying design patterns and architectural improvements.`;

      default:
        return basePrompt;
    }
  }

  /**
   * Build user prompt from request
   */
  private getUserPrompt(request: AIAnalysisRequest): string {
    let prompt = `Please analyze this Solidity contract for ${request.analysisType}:\n\n\`\`\`solidity\n${request.sourceCode}\n\`\`\``;

    if (request.context) {
      prompt += `\n\nContext: ${request.context}`;
    }

    if (request.preferences) {
      prompt += `\n\nPreferences:`;
      if (request.preferences.facetSize) {
        prompt += `\n- Facet size preference: ${request.preferences.facetSize}`;
      }
      if (request.preferences.optimization) {
        prompt += `\n- Optimization priority: ${request.preferences.optimization}`;
      }
      if (request.preferences.patterns) {
        prompt += `\n- Preferred patterns: ${request.preferences.patterns.join(', ')}`;
      }
    }

    return prompt;
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(content: string): AIAnalysisResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          suggestions: parsed.suggestions || [],
          reasoning: parsed.reasoning || '',
          code: parsed.code,
          confidence: parsed.confidence || 0.5,
          warnings: parsed.warnings || []
        };
      }
    } catch {
      console.warn('Failed to parse AI response as JSON, using fallback parsing');
    }

    // Fallback parsing for non-JSON responses
    const lines = content.split('\n');
    const suggestions: string[] = [];
    let reasoning = '';
    
    for (const line of lines) {
      if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
        suggestions.push(line.trim().substring(1).trim());
      } else if (line.trim()) {
        reasoning += line + ' ';
      }
    }

    return {
      suggestions: suggestions.length > 0 ? suggestions : ['Contract analysis completed'],
      reasoning: reasoning.trim() || 'AI analysis provided general recommendations',
      confidence: 0.6
    };
  }

  /**
   * Fallback analysis when AI services are unavailable
   */
  private getFallbackAnalysis(request: AIAnalysisRequest): AIAnalysisResponse {
    const suggestions: string[] = [];
    let reasoning = '';

    switch (request.analysisType) {
      case 'refactor':
        suggestions.push(
          'Consider breaking large functions into smaller, focused functions',
          'Separate state-changing operations from view functions',
          'Group related functions into logical facets',
          'Use events for important state changes'
        );
        reasoning = 'Basic refactoring patterns applied. Consider implementing PayRox Go Beyond modular architecture for better scalability.';
        break;

      case 'optimize':
        suggestions.push(
          'Use packed structs to save storage slots',
          'Cache array lengths in loops',
          'Use calldata instead of memory for external function parameters',
          'Consider using custom errors instead of revert strings'
        );
        reasoning = 'Standard gas optimization techniques identified. Review storage layout and function visibility for additional savings.';
        break;

      case 'security':
        suggestions.push(
          'Implement proper access controls',
          'Add reentrancy guards to state-changing functions',
          'Validate all external inputs',
          'Use the checks-effects-interactions pattern'
        );
        reasoning = 'Standard security practices recommended. Conduct thorough testing and consider professional audit.';
        break;

      default:
        suggestions.push(
          'Follow Solidity best practices',
          'Implement comprehensive testing',
          'Add detailed documentation',
          'Consider upgradeability patterns'
        );
        reasoning = 'General development recommendations provided.';
    }

    return {
      suggestions,
      reasoning,
      confidence: 0.4,
      warnings: ['AI services unavailable - using fallback analysis']
    };
  }

  /**
   * Check if AI services are available
   */
  isAIAvailable(): boolean {
    return Boolean(this.openai || this.anthropic);
  }

  /**
   * Get available AI providers
   */
  getAvailableProviders(): string[] {
    const providers: string[] = [];
    if (this.openai) {
      providers.push('OpenAI');
    }
    if (this.anthropic) {
      providers.push('Anthropic');
    }
    return providers;
  }
}
