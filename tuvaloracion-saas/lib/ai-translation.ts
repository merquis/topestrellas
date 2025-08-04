// Sistema de IA para traducción automática y generación de emojis
// Usando GPT-4.1-mini para máxima eficiencia

interface PrizeTranslation {
  name: string;
  emoji: string;
}

interface TranslatedPrize {
  index: number;
  value?: string;
  translations: {
    [lang: string]: PrizeTranslation;
  };
}

export class AITranslationService {
  private openaiApiKey: string;
  private geminiApiKey: string;
  private claudeApiKey: string;

  private openaiModel = 'gpt-4.1-2025-04-14';
  private geminiModel = 'gemini-2.5-flash';
  private claudeModel = 'claude-3-7-sonnet-20250219';

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.geminiApiKey = process.env.GEMINI_API_KEY || '';
    this.claudeApiKey = process.env.CLAUDE_API_KEY || '';
  }

  /**
   * Genera un emoji apropiado para un premio usando IA con triple fallback
   */
  async generateEmoji(prizeName: string): Promise<string> {
    try {
      return await this.generateEmojiWithOpenAI(prizeName);
    } catch (openaiError) {
      console.warn('OpenAI falló para generar emoji, intentando con Gemini...');
      try {
        return await this.generateEmojiWithGemini(prizeName);
      } catch (geminiError) {
        console.warn('Gemini también falló para generar emoji, intentando con Claude...');
        try {
          return await this.generateEmojiWithClaude(prizeName);
        } catch (claudeError) {
          console.error('Todas las IAs fallaron para generar emoji. Usando emoji por defecto.');
          return '🎁';
        }
      }
    }
  }

  /**
   * Traduce un premio a múltiples idiomas con triple fallback
   */
  async translatePrize(prizeName: string, emoji: string): Promise<{ [lang: string]: PrizeTranslation }> {
    try {
      return await this.translatePrizeWithOpenAI(prizeName, emoji);
    } catch (openaiError) {
      console.warn('OpenAI falló para traducir, intentando con Gemini...');
      try {
        return await this.translatePrizeWithGemini(prizeName, emoji);
      } catch (geminiError) {
        console.warn('Gemini también falló para traducir, intentando con Claude...');
        try {
          return await this.translatePrizeWithClaude(prizeName, emoji);
        } catch (claudeError) {
          console.error('Todas las IAs fallaron para traducir. Usando traducciones por defecto.');
          return {
            es: { name: prizeName, emoji: emoji },
            en: { name: prizeName, emoji: emoji },
            de: { name: prizeName, emoji: emoji },
            fr: { name: prizeName, emoji: emoji }
          };
        }
      }
    }
  }

  /**
   * Procesa una lista completa de premios: genera emojis y traduce
   */
  async processAllPrizes(prizeNames: string[], prizeValues?: string[]): Promise<TranslatedPrize[]> {
    const results: TranslatedPrize[] = [];
    
    for (let i = 0; i < prizeNames.length; i++) {
      const prizeName = prizeNames[i];
      const prizeValue = prizeValues?.[i];
      
      try {
        // Generar emoji
        const emoji = await this.generateEmoji(prizeName);
        
        // Traducir a todos los idiomas
        const translations = await this.translatePrize(prizeName, emoji);
        
        results.push({
          index: i,
          value: prizeValue,
          translations: translations
        });
        
        // Pequeña pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error procesando premio ${i + 1}:`, error);
        
        // Premio por defecto en caso de error
        results.push({
          index: i,
          value: prizeValue,
          translations: {
            es: { name: prizeName, emoji: '🎁' },
            en: { name: prizeName, emoji: '🎁' },
            de: { name: prizeName, emoji: '🎁' },
            fr: { name: prizeName, emoji: '🎁' }
          }
        });
      }
    }
    
    return results;
  }

  /**
   * Valida que la API key esté configurada
   */
  isConfigured(): boolean {
    return !!this.openaiApiKey || !!this.geminiApiKey || !!this.claudeApiKey;
  }

  // --- Implementaciones específicas para cada proveedor ---

  private async generateEmojiWithOpenAI(prizeName: string): Promise<string> {
    if (!this.openaiApiKey) throw new Error('OpenAI API key no configurada');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.openaiModel,
        messages: [{ role: 'system', content: 'Eres un experto en seleccionar emojis. Responde SOLO con un emoji.' }, { role: 'user', content: `Emoji para: "${prizeName}"` }],
        max_tokens: 10,
        temperature: 0.3
      })
    });
    if (!response.ok) throw new Error(`Error de OpenAI: ${response.status}`);
    const data = await response.json();
    const emoji = data.choices[0]?.message?.content?.trim() || '🎁';
    return emoji.length > 4 ? '🎁' : emoji;
  }

  private async translatePrizeWithOpenAI(prizeName: string, emoji: string): Promise<{ [lang: string]: PrizeTranslation }> {
    if (!this.openaiApiKey) throw new Error('OpenAI API key no configurada');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.openaiModel,
        messages: [
          { role: 'system', content: 'Eres un traductor experto. Responde SOLO en formato JSON válido: {"es": "texto", "en": "texto", "de": "texto", "fr": "texto"}' },
          { role: 'user', content: `Traduce este premio a los 4 idiomas: "${prizeName}"` }
        ],
        max_tokens: 200,
        temperature: 0.2
      })
    });
    if (!response.ok) throw new Error(`Error de OpenAI: ${response.status}`);
    const data = await response.json();
    const translations = JSON.parse(data.choices[0]?.message?.content?.trim());
    const result: { [lang: string]: PrizeTranslation } = {};
    for (const [lang, name] of Object.entries(translations)) {
      result[lang] = { name: name as string, emoji: emoji };
    }
    return result;
  }

  private async generateEmojiWithGemini(prizeName: string): Promise<string> {
    if (!this.geminiApiKey) throw new Error('Gemini API key no configurada');
    // Implementación para Gemini (adaptar a su SDK/API)
    return '🎁'; // Placeholder
  }

  private async translatePrizeWithGemini(prizeName: string, emoji: string): Promise<{ [lang: string]: PrizeTranslation }> {
    if (!this.geminiApiKey) throw new Error('Gemini API key no configurada');
    // Implementación para Gemini (adaptar a su SDK/API)
    return { es: { name: prizeName, emoji }, en: { name: prizeName, emoji }, de: { name: prizeName, emoji }, fr: { name: prizeName, emoji } }; // Placeholder
  }

  private async generateEmojiWithClaude(prizeName: string): Promise<string> {
    if (!this.claudeApiKey) throw new Error('Claude API key no configurada');
    // Implementación para Claude (adaptar a su SDK/API)
    return '🎁'; // Placeholder
  }

  private async translatePrizeWithClaude(prizeName: string, emoji: string): Promise<{ [lang: string]: PrizeTranslation }> {
    if (!this.claudeApiKey) throw new Error('Claude API key no configurada');
    // Implementación para Claude (adaptar a su SDK/API)
    return { es: { name: prizeName, emoji }, en: { name: prizeName, emoji }, de: { name: prizeName, emoji }, fr: { name: prizeName, emoji } }; // Placeholder
  }
}

// Instancia singleton para usar en toda la aplicación
export const aiTranslationService = new AITranslationService();

// Función helper para usar en los API routes
export async function translatePrizesWithAI(prizeNames: string[], prizeValues?: string[]): Promise<TranslatedPrize[]> {
  if (!aiTranslationService.isConfigured()) {
    throw new Error('OpenAI API key no está configurada');
  }
  
  return await aiTranslationService.processAllPrizes(prizeNames, prizeValues);
}
