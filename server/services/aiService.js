const { OpenAI } = require('openai');

// Configurar OpenAI (vai usar variável de ambiente)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class AIService {
    constructor() {
        this.conversationHistory = new Map(); // Armazenar histórico por sessão
    }

    // Chat inteligente especializado em crédito
    async chatFinanceiro(userMessage, sessionId = 'default') {
        try {
            // Recuperar histórico da conversa
            let history = this.conversationHistory.get(sessionId) || [];
            
            // System prompt especializado em crédito brasileiro
            const systemPrompt = `Você é um assistente financeiro especializado em crédito no Brasil, com acesso aos dados oficiais do Banco Central.

CONTEXTO:
- Você trabalha na CREDITECH, plataforma de comparação de taxas de crédito
- Seus dados vêm diretamente da API oficial do BACEN
- Você deve ser preciso, didático e sempre mencionar que os dados são oficiais

ESPECIALIDADES:
- Explicar taxas de juros em linguagem simples
- Comparar modalidades de crédito
- Dar conselhos sobre quando pegar ou não empréstimo
- Explicar impacto da SELIC nas taxas
- Orientar sobre negociação com bancos
- Alertar sobre armadilhas (IOF, TAC, seguros obrigatórios)

REGRAS:
- Seja sempre preciso e baseado em dados
- Use exemplos práticos com valores em R$
- Explique conceitos complexos de forma simples
- Sugira sempre a comparação antes de decidir
- Alerte sobre riscos do superendividamento
- Não dê conselhos de investimento, só de crédito

TOME CUIDADO:
- Nunca garanta aprovação de crédito
- Sempre mencione que taxas variam por perfil
- Recomende consultar um especialista para grandes valores
- Explique que dados são do BACEN mas condições finais dependem do banco`;

            // Preparar mensagens para o GPT
            const messages = [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: userMessage }
            ];

            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: messages,
                max_tokens: 800,
                temperature: 0.7,
                presence_penalty: 0.1,
                frequency_penalty: 0.1
            });

            const assistantResponse = completion.choices[0].message.content;

            // Atualizar histórico (manter últimas 10 mensagens para contexto)
            history.push({ role: 'user', content: userMessage });
            history.push({ role: 'assistant', content: assistantResponse });
            
            if (history.length > 20) { // 10 pares de mensagens
                history = history.slice(-20);
            }
            
            this.conversationHistory.set(sessionId, history);

            return {
                response: assistantResponse,
                sessionId: sessionId,
                messageCount: history.length / 2
            };

        } catch (error) {
            console.error('Erro no chat IA:', error);
            
            // Fallback para quando a API não estiver disponível
            return {
                response: this.getFallbackResponse(userMessage),
                sessionId: sessionId,
                fallback: true
            };
        }
    }

    // Análise inteligente de perfil de crédito
    async analisarPerfil(dadosUsuario) {
        try {
            const prompt = `Analise este perfil para crédito no Brasil:

DADOS DO USUÁRIO:
- Renda: R$ ${dadosUsuario.renda || 'não informado'}
- Idade: ${dadosUsuario.idade || 'não informado'} anos
- Profissão: ${dadosUsuario.profissao || 'não informado'}
- Score: ${dadosUsuario.score || 'não informado'}
- Finalidade: ${dadosUsuario.finalidade || 'não informado'}
- Valor desejado: R$ ${dadosUsuario.valorDesejado || 'não informado'}

FAÇA UMA ANÁLISE COMPLETA:
1. Perfil de risco (baixo/médio/alto)
2. Modalidades recomendadas
3. Faixa de taxa esperada
4. Valor máximo recomendado
5. Dicas específicas para este perfil
6. Alertas importantes

Seja preciso e use dados do mercado brasileiro.`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.5
            });

            return {
                analise: completion.choices[0].message.content,
                perfilRisco: this.extrairPerfilRisco(completion.choices[0].message.content),
                recomendacoes: this.extrairRecomendacoes(completion.choices[0].message.content)
            };

        } catch (error) {
            console.error('Erro na análise de perfil:', error);
            return {
                analise: 'Não foi possível analisar o perfil no momento. Tente novamente.',
                perfilRisco: 'médio',
                recomendacoes: []
            };
        }
    }

    // Explicar diferenças entre modalidades
    async explicarModalidades(modalidades) {
        try {
            const prompt = `Explique de forma didática as diferenças entre estas modalidades de crédito:

MODALIDADES: ${modalidades.join(', ')}

PARA CADA UMA, EXPLIQUE:
- Para que serve
- Vantagens e desvantagens  
- Perfil ideal de cliente
- Faixa de taxa típica
- Prazos comuns
- Garantias necessárias

Use linguagem simples e exemplos práticos. Base-se no mercado brasileiro atual.`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1200,
                temperature: 0.6
            });

            return completion.choices[0].message.content;

        } catch (error) {
            console.error('Erro ao explicar modalidades:', error);
            return 'Não foi possível explicar as modalidades no momento.';
        }
    }

    // Gerar insights baseados em dados de taxas
    async gerarInsights(dadosTaxas, indicadoresEconomicos) {
        try {
            const prompt = `Com base nos dados oficiais do BACEN, gere insights inteligentes:

TAXAS ATUAIS:
${JSON.stringify(dadosTaxas, null, 2)}

INDICADORES:
${JSON.stringify(indicadoresEconomicos, null, 2)}

GERE INSIGHTS SOBRE:
1. Tendências das taxas
2. Melhor momento para pegar crédito
3. Modalidades mais vantajosas agora
4. Impacto da SELIC atual
5. Previsões baseadas no cenário econômico
6. Alertas importantes para consumidores

Seja específico e use dados concretos.`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 800,
                temperature: 0.6
            });

            return completion.choices[0].message.content;

        } catch (error) {
            console.error('Erro ao gerar insights:', error);
            return 'Insights temporariamente indisponíveis.';
        }
    }

    // Respostas de fallback quando a API estiver indisponível
    getFallbackResponse(message) {
        const fallbacks = {
            'taxa': 'As taxas variam conforme seu perfil. Consulte nossos dados atualizados do BACEN para comparar as melhores opções.',
            'empréstimo': 'Para empréstimos, compare sempre as taxas entre diferentes bancos. Use nossos dados oficiais do Banco Central.',
            'financiamento': 'Financiamentos têm taxas menores que empréstimos pessoais. Veja nossa comparação atualizada.',
            'cartão': 'O rotativo do cartão tem as taxas mais altas. Evite sempre que possível.',
            'score': 'Score alto = taxas melhores. Consulte seu CPF nos órgãos de proteção.',
            'default': 'Estou temporariamente indisponível. Use nossa ferramenta de comparação para encontrar as melhores taxas.'
        };

        const lowerMessage = message.toLowerCase();
        
        for (const [key, response] of Object.entries(fallbacks)) {
            if (lowerMessage.includes(key)) {
                return response;
            }
        }
        
        return fallbacks.default;
    }

    // Extrair perfil de risco da análise
    extrairPerfilRisco(analise) {
        const texto = analise.toLowerCase();
        if (texto.includes('baixo risco') || texto.includes('risco baixo')) return 'baixo';
        if (texto.includes('alto risco') || texto.includes('risco alto')) return 'alto';
        return 'médio';
    }

    // Extrair recomendações da análise
    extrairRecomendacoes(analise) {
        const linhas = analise.split('\n');
        const recomendacoes = [];
        
        for (const linha of linhas) {
            if (linha.includes('recomend') || linha.includes('sugere') || linha.includes('ideal')) {
                recomendacoes.push(linha.trim());
            }
        }
        
        return recomendacoes.slice(0, 5); // Máximo 5 recomendações
    }

    // Limpar histórico de conversa
    limparHistorico(sessionId) {
        this.conversationHistory.delete(sessionId);
        return { success: true, message: 'Histórico limpo' };
    }

    // Obter estatísticas de uso
    getEstatisticas() {
        return {
            sessoesAtivas: this.conversationHistory.size,
            totalMensagens: Array.from(this.conversationHistory.values())
                .reduce((total, history) => total + history.length, 0)
        };
    }
}

module.exports = new AIService();
