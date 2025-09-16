const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// Importar serviços de IA e ML
const aiService = require('./services/aiService');
const mlService = require('./services/mlService');
const riskService = require('./services/riskService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar serviços ML ao startar
(async () => {
    console.log('🚀 Inicializando CREDITECH com IA/ML...');
    await mlService.initialize();
    console.log('✅ Todos os serviços inicializados');
})();

// Base URL da API do Banco Central do Brasil
const BACEN_API_BASE = 'https://api.bcb.gov.br';

// Função para buscar taxas de juros por modalidade
async function getTaxasPorModalidade(modalidade, dataInicio, dataFim) {
    try {
        // IDs das modalidades no BACEN (alguns exemplos principais)
        const modalidadeIds = {
            'pessoa-fisica-credito-pessoal': 25497,
            'pessoa-fisica-cheque-especial': 25498,
            'pessoa-fisica-cartao-credito-rotativo': 25499,
            'pessoa-juridica-capital-giro': 25500,
            'habitacional-sistema-financeiro-habitacao': 25501,
            'rural-custeio': 25502,
            'veiculo-financiamento': 25503
        };
        
        const serieId = modalidadeIds[modalidade] || modalidadeIds['pessoa-fisica-credito-pessoal'];
        
        const response = await axios.get(
            `${BACEN_API_BASE}/dados/serie/bcdata.sgs.${serieId}/dados?formato=json&dataInicio=${dataInicio}&dataFim=${dataFim}`
        );
        
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar dados do BACEN:', error.message);
        throw new Error('Erro ao acessar dados do Banco Central');
    }
}

// Função para buscar taxa SELIC atual
async function getTaxaSelic() {
    try {
        const response = await axios.get(
            `${BACEN_API_BASE}/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicio=01/01/2024&dataFim=31/12/2024`
        );
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar SELIC:', error.message);
        throw new Error('Erro ao buscar taxa SELIC');
    }
}

// Função para buscar inflação (IPCA)
async function getInflacao() {
    try {
        const response = await axios.get(
            `${BACEN_API_BASE}/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicio=01/01/2024&dataFim=31/12/2024`
        );
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar IPCA:', error.message);
        throw new Error('Erro ao buscar inflação');
    }
}

// Rota para buscar todas as taxas de crédito
app.get('/api/taxas-credito', async (req, res) => {
    try {
        const { modalidade, dataInicio = '01/01/2024', dataFim = '31/12/2024' } = req.query;
        
        const taxas = await getTaxasPorModalidade(modalidade, dataInicio, dataFim);
        
        res.json({
            success: true,
            data: taxas,
            fonte: 'Banco Central do Brasil - API Oficial',
            modalidade: modalidade || 'pessoa-fisica-credito-pessoal'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para comparar múltiplas modalidades
app.get('/api/comparar-taxas', async (req, res) => {
    try {
        const modalidades = [
            'pessoa-fisica-credito-pessoal',
            'pessoa-fisica-cheque-especial',
            'pessoa-fisica-cartao-credito-rotativo',
            'veiculo-financiamento'
        ];
        
        const comparacao = await Promise.all(
            modalidades.map(async (modalidade) => {
                try {
                    const taxas = await getTaxasPorModalidade(modalidade, '01/12/2024', '31/12/2024');
                    const ultimaTaxa = taxas[taxas.length - 1];
                    
                    return {
                        modalidade,
                        taxaAtual: ultimaTaxa?.valor || 'N/A',
                        data: ultimaTaxa?.data || 'N/A',
                        descricao: getDescricaoModalidade(modalidade)
                    };
                } catch (error) {
                    return {
                        modalidade,
                        taxaAtual: 'Erro ao carregar',
                        data: 'N/A',
                        descricao: getDescricaoModalidade(modalidade),
                        erro: error.message
                    };
                }
            })
        );
        
        res.json({
            success: true,
            data: comparacao,
            fonte: 'Banco Central do Brasil - API Oficial',
            atualizadoEm: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para indicadores econômicos
app.get('/api/indicadores', async (req, res) => {
    try {
        const [selic, ipca] = await Promise.all([
            getTaxaSelic(),
            getInflacao()
        ]);
        
        const ultimaSelic = selic[selic.length - 1];
        const ultimoIpca = ipca[ipca.length - 1];
        
        res.json({
            success: true,
            data: {
                selic: {
                    valor: ultimaSelic?.valor || 'N/A',
                    data: ultimaSelic?.data || 'N/A'
                },
                ipca: {
                    valor: ultimoIpca?.valor || 'N/A',
                    data: ultimoIpca?.data || 'N/A'
                }
            },
            fonte: 'Banco Central do Brasil - API Oficial'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Função auxiliar para descrição das modalidades
function getDescricaoModalidade(modalidade) {
    const descricoes = {
        'pessoa-fisica-credito-pessoal': 'Crédito Pessoal - Pessoa Física',
        'pessoa-fisica-cheque-especial': 'Cheque Especial - Pessoa Física',
        'pessoa-fisica-cartao-credito-rotativo': 'Cartão de Crédito Rotativo - Pessoa Física',
        'pessoa-juridica-capital-giro': 'Capital de Giro - Pessoa Jurídica',
        'habitacional-sistema-financeiro-habitacao': 'Financiamento Habitacional',
        'rural-custeio': 'Crédito Rural - Custeio',
        'veiculo-financiamento': 'Financiamento de Veículos'
    };
    return descricoes[modalidade] || modalidade;
}

// ========== ROTAS DE IA E MACHINE LEARNING ==========

// Chat inteligente com assistente financeiro
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Mensagem é obrigatória'
            });
        }
        
        const response = await aiService.chatFinanceiro(message, sessionId);
        
        res.json({
            success: true,
            data: response,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro no chat inteligente',
            details: error.message
        });
    }
});

// Análise de perfil do usuário
app.post('/api/analisar-perfil', async (req, res) => {
    try {
        const dadosUsuario = req.body;
        
        const analiseIA = await aiService.analisarPerfil(dadosUsuario);
        const analiseRisco = await riskService.analisarRisco(dadosUsuario);
        const classificacaoCluster = await mlService.classificarUsuario(dadosUsuario);
        
        res.json({
            success: true,
            data: {
                analiseIA,
                analiseRisco,
                cluster: classificacaoCluster,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro na análise de perfil',
            details: error.message
        });
    }
});

// Predição de taxas futuras
app.get('/api/prever-taxas/:modalidade', async (req, res) => {
    try {
        const { modalidade } = req.params;
        const { dias = 7 } = req.query;
        
        const predicoes = await mlService.preverTaxas(modalidade, parseInt(dias));
        
        res.json({
            success: true,
            data: {
                modalidade,
                predicoes,
                diasFuturos: parseInt(dias),
                geradoEm: new Date().toISOString()
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro na predição de taxas',
            details: error.message
        });
    }
});

// Análise de risco detalhada
app.post('/api/analise-risco', async (req, res) => {
    try {
        const dadosUsuario = req.body;
        
        const analise = await riskService.analisarRisco(dadosUsuario);
        const comparacaoHistorica = await riskService.compararHistorico(dadosUsuario);
        
        res.json({
            success: true,
            data: {
                analiseCompleta: analise,
                historicoSimilares: comparacaoHistorica,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro na análise de risco',
            details: error.message
        });
    }
});

// Explicar modalidades de crédito
app.post('/api/explicar-modalidades', async (req, res) => {
    try {
        const { modalidades } = req.body;
        
        if (!modalidades || !Array.isArray(modalidades)) {
            return res.status(400).json({
                success: false,
                error: 'Lista de modalidades é obrigatória'
            });
        }
        
        const explicacao = await aiService.explicarModalidades(modalidades);
        
        res.json({
            success: true,
            data: {
                modalidades,
                explicacao,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao explicar modalidades',
            details: error.message
        });
    }
});

// Insights inteligentes baseados em dados atuais
app.get('/api/insights-ia', async (req, res) => {
    try {
        // Buscar dados atuais
        const [taxasResponse, indicadoresResponse] = await Promise.all([
            axios.get(`${req.protocol}://${req.get('host')}/api/comparar-taxas`).catch(() => ({ data: { data: [] } })),
            axios.get(`${req.protocol}://${req.get('host')}/api/indicadores`).catch(() => ({ data: { data: {} } }))
        ]);
        
        const insights = await aiService.gerarInsights(
            taxasResponse.data.data,
            indicadoresResponse.data.data
        );
        
        res.json({
            success: true,
            data: {
                insights,
                baseadoEm: {
                    taxas: taxasResponse.data.data?.length || 0,
                    indicadores: Object.keys(indicadoresResponse.data.data || {}).length
                },
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao gerar insights',
            details: error.message
        });
    }
});

// Obter informações sobre clusters de usuários
app.get('/api/clusters', async (req, res) => {
    try {
        const clusters = mlService.clusters.get('perfis_usuarios') || [];
        
        res.json({
            success: true,
            data: {
                clusters,
                totalClusters: clusters.length,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao obter clusters',
            details: error.message
        });
    }
});

// Limpar histórico de chat
app.delete('/api/chat/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const resultado = aiService.limparHistorico(sessionId);
        
        res.json({
            success: true,
            data: resultado
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao limpar histórico'
        });
    }
});

// Estatísticas dos serviços de IA/ML
app.get('/api/stats-ml', (req, res) => {
    try {
        const stats = {
            aiService: aiService.getEstatisticas(),
            mlService: mlService.getEstatisticas(),
            timestamp: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao obter estatísticas'
        });
    }
});

// ========== ROTAS ORIGINAIS ==========

// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'CREDITECH API funcionando com IA/ML',
        services: {
            bacen: 'Conectado',
            ai: 'Ativo',
            ml: mlService.initialized ? 'Inicializado' : 'Carregando'
        },
        timestamp: new Date().toISOString(),
        fonte: 'Banco Central do Brasil - Dados Oficiais'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 CREDITECH API rodando na porta ${PORT}`);
    console.log(`📊 Conectado ao Banco Central do Brasil - Dados Oficiais`);
    console.log(`🤖 Serviços de IA e Machine Learning ativos`);
    console.log(`🔗 http://localhost:${PORT}/api/health`);
});
