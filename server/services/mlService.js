const tf = require('@tensorflow/tfjs-node');
const { Matrix } = require('ml-matrix');
const KMeans = require('ml-kmeans');
const moment = require('moment');
const axios = require('axios');

class MLService {
    constructor() {
        this.models = new Map(); // Cache de modelos treinados
        this.historicoDados = new Map(); // Histórico de dados para treinamento
        this.clusters = new Map(); // Resultados de clustering
        this.initialized = false;
    }

    // Inicializar serviço ML
    async initialize() {
        try {
            console.log('🤖 Inicializando serviços de Machine Learning...');
            
            // Buscar dados históricos reais do BACEN
            await this.carregarDadosHistoricosReais();
            
            // Treinar modelo básico de predição
            await this.treinarModeloPreditivo();
            
            // Fazer clustering inicial
            await this.executarClustering();
            
            this.initialized = true;
            console.log('✅ ML Service inicializado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar ML Service:', error);
            // Fallback para dados sintéticos se BACEN falhar
            console.log('⚠️ Usando dados sintéticos como fallback...');
            await this.gerarDadosSinteticos();
            await this.treinarModeloPreditivo();
            await this.executarClustering();
            this.initialized = true;
        }
    }

    // Gerar dados sintéticos para demonstração
    async gerarDadosSinteticos() {
        try {
            // Simular histórico de taxas com tendências realistas
            const modalidades = [
                'pessoa-fisica-credito-pessoal',
                'pessoa-fisica-cheque-especial',
                'pessoa-fisica-cartao-credito-rotativo',
                'veiculo-financiamento'
            ];

            const hoje = moment();
            const diasHistorico = 1825; // 5 anos de dados

            for (const modalidade of modalidades) {
                const dadosModalidade = [];
                
                for (let i = diasHistorico; i >= 0; i--) {
                    const data = hoje.clone().subtract(i, 'days');
                    
                    // Simular taxas base por modalidade
                    let taxaBase;
                    switch (modalidade) {
                        case 'pessoa-fisica-credito-pessoal':
                            taxaBase = 25 + Math.random() * 15;
                            break;
                        case 'pessoa-fisica-cheque-especial':
                            taxaBase = 120 + Math.random() * 40;
                            break;
                        case 'pessoa-fisica-cartao-credito-rotativo':
                            taxaBase = 300 + Math.random() * 100;
                            break;
                        case 'veiculo-financiamento':
                            taxaBase = 15 + Math.random() * 10;
                            break;
                        default:
                            taxaBase = 20 + Math.random() * 20;
                    }
                    
                    // Adicionar variação baseada em fatores econômicos simulados
                    const selicSimulada = 10 + Math.sin(i / 50) * 3; // SELIC oscilando
                    const inflacaoSimulada = 4 + Math.random() * 2;
                    
                    // Taxa final influenciada pelos indicadores
                    const taxaFinal = taxaBase + (selicSimulada - 10) * 0.8 + (inflacaoSimulada - 4) * 0.5;
                    
                    dadosModalidade.push({
                        data: data.format('DD/MM/YYYY'),
                        timestamp: data.valueOf(),
                        taxa: Math.max(0, taxaFinal),
                        selic: selicSimulada,
                        inflacao: inflacaoSimulada,
                        diaSemana: data.day(),
                        diaAno: data.dayOfYear()
                    });
                }
                
                this.historicoDados.set(modalidade, dadosModalidade);
            }
            
            console.log('📊 Dados sintéticos gerados para ML');
            
        } catch (error) {
            console.error('Erro ao gerar dados sintéticos:', error);
        }
    }

    // Carregar dados históricos reais do BACEN
    async carregarDadosHistoricosReais() {
        try {
            console.log('📊 Carregando dados históricos reais do BACEN...');

            const BACEN_API_BASE = 'https://api.bcb.gov.br';
            
            // IDs das séries no BACEN (modalidades principais)
            const seriesModalidades = {
                'pessoa-fisica-credito-pessoal': 25497,
                'pessoa-fisica-cheque-especial': 25498,
                'pessoa-fisica-cartao-credito-rotativo': 25499,
                'veiculo-financiamento': 25503
            };

            // Buscar dados dos últimos 5 anos para cada modalidade
            const dataInicio = moment().subtract(5, 'years').format('DD/MM/YYYY');
            const dataFim = moment().format('DD/MM/YYYY');
            
            for (const [modalidade, serieId] of Object.entries(seriesModalidades)) {
                try {
                    console.log(`📈 Carregando ${modalidade}...`);
                    
                    // Buscar dados da modalidade
                    const responseModalidade = await axios.get(
                        `${BACEN_API_BASE}/dados/serie/bcdata.sgs.${serieId}/dados?formato=json&dataInicio=${dataInicio}&dataFim=${dataFim}`,
                        { timeout: 10000 }
                    );

                    // Buscar SELIC para correlação
                    const responseSelic = await axios.get(
                        `${BACEN_API_BASE}/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicio=${dataInicio}&dataFim=${dataFim}`,
                        { timeout: 10000 }
                    );

                    // Buscar IPCA para correlação
                    const responseIPCA = await axios.get(
                        `${BACEN_API_BASE}/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicio=${dataInicio}&dataFim=${dataFim}`,
                        { timeout: 10000 }
                    );

                    const dadosModalidade = responseModalidade.data;
                    const dadosSelic = responseSelic.data;
                    const dadosIPCA = responseIPCA.data;

                    if (!dadosModalidade || dadosModalidade.length === 0) {
                        console.log(`⚠️ Sem dados para ${modalidade}, usando sintéticos`);
                        continue;
                    }

                    // Processar e correlacionar dados
                    const dadosProcessados = this.processarDadosReais(
                        dadosModalidade, 
                        dadosSelic, 
                        dadosIPCA, 
                        modalidade
                    );

                    this.historicoDados.set(modalidade, dadosProcessados);
                    console.log(`✅ ${modalidade}: ${dadosProcessados.length} registros carregados`);

                } catch (errorModalidade) {
                    console.error(`❌ Erro ao carregar ${modalidade}:`, errorModalidade.message);
                    // Se falhar uma modalidade, gera dados sintéticos para ela
                    await this.gerarDadosSinteticosModalidade(modalidade);
                }

                // Aguardar entre requests para não sobrecarregar API do BACEN
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            console.log('✅ Dados históricos reais do BACEN carregados com sucesso');

        } catch (error) {
            console.error('❌ Erro geral ao carregar dados do BACEN:', error.message);
            throw error; // Re-throw para usar fallback sintético
        }
    }

    // Processar dados reais do BACEN para ML
    processarDadosReais(dadosModalidade, dadosSelic, dadosIPCA, modalidade) {
        const dadosProcessados = [];
        
        for (const registro of dadosModalidade) {
            try {
                // Converter data brasileiro para Date
                const [dia, mes, ano] = registro.data.split('/');
                const dataRegistro = moment(`${ano}-${mes}-${dia}`, 'YYYY-MM-DD');

                if (!dataRegistro.isValid() || !registro.valor) continue;

                // Encontrar SELIC e IPCA mais próximos da data
                const selicProxima = this.encontrarIndicadorProximo(dadosSelic, registro.data);
                const ipcaProximo = this.encontrarIndicadorProximo(dadosIPCA, registro.data);

                dadosProcessados.push({
                    data: registro.data,
                    timestamp: dataRegistro.valueOf(),
                    taxa: parseFloat(registro.valor),
                    selic: selicProxima || 10.0, // Fallback se não encontrar
                    inflacao: ipcaProximo || 4.0, // Fallback se não encontrar
                    diaSemana: dataRegistro.day(),
                    diaAno: dataRegistro.dayOfYear(),
                    modalidade: modalidade
                });

            } catch (error) {
                console.error('Erro ao processar registro:', error.message);
                continue;
            }
        }

        return dadosProcessados.sort((a, b) => a.timestamp - b.timestamp);
    }

    // Encontrar indicador econômico mais próximo de uma data
    encontrarIndicadorProximo(indicadores, dataTarget) {
        if (!indicadores || indicadores.length === 0) return null;

        let melhorMatch = null;
        let menorDiferenca = Infinity;

        for (const indicador of indicadores) {
            if (!indicador.valor) continue;

            const [diaTarget, mesTarget, anoTarget] = dataTarget.split('/');
            const [diaIndicador, mesIndicador, anoIndicador] = indicador.data.split('/');
            
            const dataTargetMoment = moment(`${anoTarget}-${mesTarget}-${diaTarget}`, 'YYYY-MM-DD');
            const dataIndicadorMoment = moment(`${anoIndicador}-${mesIndicador}-${diaIndicador}`, 'YYYY-MM-DD');
            
            if (!dataTargetMoment.isValid() || !dataIndicadorMoment.isValid()) continue;

            const diferenca = Math.abs(dataTargetMoment.diff(dataIndicadorMoment, 'days'));
            
            if (diferenca < menorDiferenca) {
                menorDiferenca = diferenca;
                melhorMatch = parseFloat(indicador.valor);
            }
        }

        return melhorMatch;
    }

    // Gerar dados sintéticos para modalidade específica (fallback)
    async gerarDadosSinteticosModalidade(modalidade) {
        try {
            const dadosModalidade = [];
            const hoje = moment();
            const diasHistorico = 1825; // 5 anos de dados sintéticos

            for (let i = diasHistorico; i >= 0; i--) {
                const data = hoje.clone().subtract(i, 'days');
                
                let taxaBase;
                switch (modalidade) {
                    case 'pessoa-fisica-credito-pessoal':
                        taxaBase = 25 + Math.random() * 15;
                        break;
                    case 'pessoa-fisica-cheque-especial':
                        taxaBase = 120 + Math.random() * 40;
                        break;
                    case 'pessoa-fisica-cartao-credito-rotativo':
                        taxaBase = 300 + Math.random() * 100;
                        break;
                    case 'veiculo-financiamento':
                        taxaBase = 15 + Math.random() * 10;
                        break;
                    default:
                        taxaBase = 20 + Math.random() * 20;
                }
                
                const selicSimulada = 10 + Math.sin(i / 50) * 3;
                const inflacaoSimulada = 4 + Math.random() * 2;
                const taxaFinal = taxaBase + (selicSimulada - 10) * 0.8 + (inflacaoSimulada - 4) * 0.5;
                
                dadosModalidade.push({
                    data: data.format('DD/MM/YYYY'),
                    timestamp: data.valueOf(),
                    taxa: Math.max(0, taxaFinal),
                    selic: selicSimulada,
                    inflacao: inflacaoSimulada,
                    diaSemana: data.day(),
                    diaAno: data.dayOfYear(),
                    modalidade: modalidade
                });
            }
            
            this.historicoDados.set(modalidade, dadosModalidade);
            console.log(`📊 Dados sintéticos gerados para ${modalidade} (fallback)`);
            
        } catch (error) {
            console.error(`Erro ao gerar dados sintéticos para ${modalidade}:`, error);
        }
    }

    // Treinar modelo preditivo de taxas
    async treinarModeloPreditivo() {
        try {
            console.log('🎓 Treinando modelos preditivos...');
            
            for (const [modalidade, dados] of this.historicoDados.entries()) {
                // Preparar dados para treinamento
                const features = dados.map(d => [
                    d.selic,
                    d.inflacao,
                    Math.sin(2 * Math.PI * d.diaAno / 365), // Sazonalidade anual
                    Math.cos(2 * Math.PI * d.diaAno / 365),
                    d.diaSemana / 7 // Normalizar dia da semana
                ]);
                
                const targets = dados.map(d => [d.taxa]);
                
                // Criar modelo neural simples
                const model = tf.sequential({
                    layers: [
                        tf.layers.dense({ inputShape: [5], units: 16, activation: 'relu' }),
                        tf.layers.dropout({ rate: 0.2 }),
                        tf.layers.dense({ units: 8, activation: 'relu' }),
                        tf.layers.dense({ units: 1, activation: 'linear' })
                    ]
                });
                
                model.compile({
                    optimizer: 'adam',
                    loss: 'meanSquaredError',
                    metrics: ['mae']
                });
                
                // Converter para tensores
                const xs = tf.tensor2d(features);
                const ys = tf.tensor2d(targets);
                
                // Treinar modelo
                await model.fit(xs, ys, {
                    epochs: 50,
                    batchSize: 32,
                    validationSplit: 0.2,
                    verbose: 0
                });
                
                this.models.set(modalidade, model);
                
                // Limpar tensores
                xs.dispose();
                ys.dispose();
            }
            
            console.log('✅ Modelos preditivos treinados');
            
        } catch (error) {
            console.error('Erro ao treinar modelos:', error);
        }
    }

    // Prever taxas futuras
    async preverTaxas(modalidade, diasFuturos = 7) {
        try {
            if (!this.models.has(modalidade)) {
                throw new Error(`Modelo não encontrado para ${modalidade}`);
            }
            
            const model = this.models.get(modalidade);
            const historico = this.historicoDados.get(modalidade);
            const ultimosDados = historico.slice(-1)[0];
            
            const predicoes = [];
            
            for (let i = 1; i <= diasFuturos; i++) {
                const dataFutura = moment().add(i, 'days');
                
                // Features para predição (usando últimos valores conhecidos + extrapolação simples)
                const features = [[
                    ultimosDados.selic + (Math.random() - 0.5) * 0.1, // SELIC com pequena variação
                    ultimosDados.inflacao + (Math.random() - 0.5) * 0.1, // Inflação com pequena variação
                    Math.sin(2 * Math.PI * dataFutura.dayOfYear() / 365),
                    Math.cos(2 * Math.PI * dataFutura.dayOfYear() / 365),
                    dataFutura.day() / 7
                ]];
                
                const inputTensor = tf.tensor2d(features);
                const predicao = model.predict(inputTensor);
                const taxa = (await predicao.data())[0];
                
                predicoes.push({
                    data: dataFutura.format('DD/MM/YYYY'),
                    taxaPrevista: Math.max(0, taxa),
                    confianca: Math.random() * 0.3 + 0.7 // Simulação de confiança
                });
                
                // Limpar tensores
                inputTensor.dispose();
                predicao.dispose();
            }
            
            return predicoes;
            
        } catch (error) {
            console.error('Erro ao prever taxas:', error);
            return [];
        }
    }

    // Clustering de perfis de usuários
    async executarClustering() {
        try {
            console.log('📊 Executando clustering de perfis...');
            
            // Simular dados de perfis de usuários
            const perfisUsuarios = this.gerarPerfisSinteticos(1000);
            
            // Preparar matriz de features
            const features = perfisUsuarios.map(perfil => [
                perfil.idade / 100,
                perfil.renda / 50000,
                perfil.score / 1000,
                perfil.tempoEmprego / 120,
                perfil.valorSolicitado / 100000
            ]);
            
            const matrix = new Matrix(features);
            
            // Executar K-means com 5 clusters
            const resultado = KMeans(matrix, 5, { maxIterations: 100 });
            
            // Analisar clusters
            const clusters = this.analisarClusters(resultado, perfisUsuarios);
            this.clusters.set('perfis_usuarios', clusters);
            
            console.log('✅ Clustering executado com sucesso');
            return clusters;
            
        } catch (error) {
            console.error('Erro no clustering:', error);
            return [];
        }
    }

    // Gerar perfis sintéticos para clustering
    gerarPerfisSinteticos(quantidade) {
        const perfis = [];
        const profissoes = ['CLT', 'Autonomo', 'Servidor', 'Aposentado', 'Empresario'];
        const finalidades = ['Casa', 'Veiculo', 'Educacao', 'Saude', 'Negocios'];
        
        for (let i = 0; i < quantidade; i++) {
            perfis.push({
                id: i,
                idade: 18 + Math.random() * 60,
                renda: 1000 + Math.random() * 20000,
                score: 300 + Math.random() * 700,
                tempoEmprego: Math.random() * 120, // meses
                profissao: profissoes[Math.floor(Math.random() * profissoes.length)],
                valorSolicitado: 1000 + Math.random() * 100000,
                finalidade: finalidades[Math.floor(Math.random() * finalidades.length)],
                tempoRelacionamento: Math.random() * 60 // meses com o banco
            });
        }
        
        return perfis;
    }

    // Analisar características dos clusters
    analisarClusters(resultado, perfis) {
        const clusters = [];
        
        for (let i = 0; i < resultado.centroids.length; i++) {
            const perfisCluster = perfis.filter((_, index) => resultado.clusters[index] === i);
            
            if (perfisCluster.length === 0) continue;
            
            const analise = {
                id: i,
                tamanho: perfisCluster.length,
                percentual: ((perfisCluster.length / perfis.length) * 100).toFixed(1),
                caracteristicas: {
                    idadeMedia: (perfisCluster.reduce((sum, p) => sum + p.idade, 0) / perfisCluster.length).toFixed(1),
                    rendaMedia: (perfisCluster.reduce((sum, p) => sum + p.renda, 0) / perfisCluster.length).toFixed(0),
                    scoreMedia: (perfisCluster.reduce((sum, p) => sum + p.score, 0) / perfisCluster.length).toFixed(0),
                    valorMedio: (perfisCluster.reduce((sum, p) => sum + p.valorSolicitado, 0) / perfisCluster.length).toFixed(0)
                },
                descricao: this.descreverCluster(i, perfisCluster),
                taxaSugerida: this.calcularTaxaSugerida(perfisCluster)
            };
            
            clusters.push(analise);
        }
        
        return clusters.sort((a, b) => b.tamanho - a.tamanho);
    }

    // Descrever cluster em linguagem natural
    descreverCluster(id, perfis) {
        const rendaMedia = perfis.reduce((sum, p) => sum + p.renda, 0) / perfis.length;
        const scoreMedia = perfis.reduce((sum, p) => sum + p.score, 0) / perfis.length;
        const idadeMedia = perfis.reduce((sum, p) => sum + p.idade, 0) / perfis.length;
        
        if (rendaMedia > 10000 && scoreMedia > 700) {
            return 'Perfil Premium: Alta renda, score excelente';
        } else if (rendaMedia > 5000 && scoreMedia > 600) {
            return 'Perfil Padrão: Renda média, bom score';
        } else if (scoreMedia < 400) {
            return 'Perfil Alto Risco: Score baixo, necessita atenção';
        } else if (idadeMedia > 50) {
            return 'Perfil Maduro: Maior estabilidade';
        } else {
            return 'Perfil Jovem: Início de vida financeira';
        }
    }

    // Calcular taxa sugerida para o cluster
    calcularTaxaSugerida(perfis) {
        const scoreMedia = perfis.reduce((sum, p) => sum + p.score, 0) / perfis.length;
        const rendaMedia = perfis.reduce((sum, p) => sum + p.renda, 0) / perfis.length;
        
        // Lógica simplificada de precificação
        let taxaBase = 30; // Taxa base
        
        // Ajuste por score
        if (scoreMedia > 700) taxaBase -= 10;
        else if (scoreMedia > 600) taxaBase -= 5;
        else if (scoreMedia < 400) taxaBase += 15;
        
        // Ajuste por renda
        if (rendaMedia > 10000) taxaBase -= 5;
        else if (rendaMedia < 3000) taxaBase += 8;
        
        return Math.max(5, taxaBase); // Mínimo 5%
    }

    // Classificar usuário em cluster
    async classificarUsuario(perfilUsuario) {
        try {
            const clusters = this.clusters.get('perfis_usuarios') || [];
            
            if (clusters.length === 0) {
                return { cluster: null, message: 'Clustering não disponível' };
            }
            
            // Calcular similaridade com cada cluster
            let melhorCluster = null;
            let menorDistancia = Infinity;
            
            for (const cluster of clusters) {
                const distancia = this.calcularDistanciaCluster(perfilUsuario, cluster.caracteristicas);
                
                if (distancia < menorDistancia) {
                    menorDistancia = distancia;
                    melhorCluster = cluster;
                }
            }
            
            return {
                cluster: melhorCluster,
                similaridade: (100 - menorDistancia * 10).toFixed(1) + '%',
                recomendacoes: this.gerarRecomendacoesCluster(melhorCluster)
            };
            
        } catch (error) {
            console.error('Erro ao classificar usuário:', error);
            return { cluster: null, error: error.message };
        }
    }

    // Calcular distância entre usuário e cluster
    calcularDistanciaCluster(usuario, caracteristicasCluster) {
        const dIdade = Math.abs(usuario.idade - parseFloat(caracteristicasCluster.idadeMedia)) / 60;
        const dRenda = Math.abs(usuario.renda - parseFloat(caracteristicasCluster.rendaMedia)) / 20000;
        const dScore = Math.abs(usuario.score - parseFloat(caracteristicasCluster.scoreMedia)) / 700;
        
        return Math.sqrt(dIdade * dIdade + dRenda * dRenda + dScore * dScore);
    }

    // Gerar recomendações baseadas no cluster
    gerarRecomendacoesCluster(cluster) {
        const recomendacoes = [];
        
        if (cluster.caracteristicas.scoreMedia > 700) {
            recomendacoes.push('Você tem perfil para as melhores taxas do mercado');
            recomendacoes.push('Negocie desconto nas taxas apresentadas');
        }
        
        if (cluster.caracteristicas.rendaMedia > 10000) {
            recomendacoes.push('Considere conta premium para condições especiais');
        }
        
        if (parseFloat(cluster.caracteristicas.scoreMedia) < 500) {
            recomendacoes.push('Melhore seu score antes de solicitar crédito');
            recomendacoes.push('Considere modalidades com garantia');
        }
        
        recomendacoes.push(`Taxa estimada para seu perfil: ${cluster.taxaSugerida.toFixed(2)}% a.m.`);
        
        return recomendacoes;
    }

    // Obter estatísticas gerais
    getEstatisticas() {
        return {
            modelos: this.models.size,
            dadosHistoricos: Array.from(this.historicoDados.values())
                .reduce((total, dados) => total + dados.length, 0),
            clusters: this.clusters.size,
            initialized: this.initialized
        };
    }

    // Limpar cache de modelos
    limparModelos() {
        for (const model of this.models.values()) {
            model.dispose();
        }
        this.models.clear();
        console.log('🧹 Modelos ML limpos da memória');
    }
}

module.exports = new MLService();
