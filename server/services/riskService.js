class RiskService {
    constructor() {
        this.pesos = {
            score: 0.35,
            renda: 0.25,
            idade: 0.15,
            tempoEmprego: 0.15,
            relacionamentoBanco: 0.10
        };
        
        // Tabela de scores de risco por profissão
        this.scoresProfissao = {
            'servidor': 1.2,
            'clt': 1.0,
            'aposentado': 0.9,
            'empresario': 0.7,
            'autonomo': 0.6,
            'desempregado': 0.3
        };
        
        // Multiplicadores por finalidade do crédito
        this.multiplicadoresFinalidade = {
            'casa': 0.8,        // Financiamento imobiliário é mais seguro
            'veiculo': 0.9,     // Tem garantia
            'educacao': 1.0,    // Investimento
            'saude': 1.1,       // Urgência
            'consolidacao': 1.2, // Já endividado
            'consumo': 1.3,     // Maior risco
            'negocios': 1.1     // Variável
        };
    }

    // Análise completa de risco
    async analisarRisco(dadosUsuario) {
        try {
            const analise = {
                usuario: dadosUsuario,
                scoreRisco: this.calcularScoreRisco(dadosUsuario),
                classificacao: '',
                probabilidadeAprovacao: 0,
                taxaSugerida: 0,
                limiteSugerido: 0,
                fatoresPositivos: [],
                fatoresNegativos: [],
                recomendacoes: [],
                alertas: []
            };

            // Calcular classificação baseada no score
            analise.classificacao = this.obterClassificacaoRisco(analise.scoreRisco);
            
            // Probabilidade de aprovação
            analise.probabilidadeAprovacao = this.calcularProbabilidadeAprovacao(analise.scoreRisco, dadosUsuario);
            
            // Taxa sugerida baseada no risco
            analise.taxaSugerida = this.calcularTaxaSugerida(analise.scoreRisco, dadosUsuario);
            
            // Limite sugerido
            analise.limiteSugerido = this.calcularLimiteSugerido(dadosUsuario, analise.scoreRisco);
            
            // Análise de fatores
            this.analisarFatores(dadosUsuario, analise);
            
            // Gerar recomendações
            this.gerarRecomendacoes(analise);
            
            // Alertas de risco
            this.gerarAlertas(dadosUsuario, analise);
            
            return analise;
            
        } catch (error) {
            console.error('Erro na análise de risco:', error);
            return this.getAnaliseDefault(dadosUsuario);
        }
    }

    // Calcular score de risco personalizado (0-1000)
    calcularScoreRisco(dados) {
        let score = 0;
        
        // Score de crédito (35% do peso)
        if (dados.score) {
            score += this.normalizarScore(dados.score) * this.pesos.score;
        }
        
        // Renda (25% do peso)
        if (dados.renda) {
            score += this.normalizarRenda(dados.renda) * this.pesos.renda;
        }
        
        // Idade (15% do peso)
        if (dados.idade) {
            score += this.normalizarIdade(dados.idade) * this.pesos.idade;
        }
        
        // Tempo de emprego (15% do peso)
        if (dados.tempoEmprego) {
            score += this.normalizarTempoEmprego(dados.tempoEmprego) * this.pesos.tempoEmprego;
        }
        
        // Relacionamento com banco (10% do peso)
        if (dados.tempoRelacionamento) {
            score += this.normalizarRelacionamento(dados.tempoRelacionamento) * this.pesos.relacionamentoBanco;
        }
        
        // Ajuste por profissão
        const scoreProfissao = this.scoresProfissao[dados.profissao?.toLowerCase()] || 1.0;
        score *= scoreProfissao;
        
        // Ajuste por finalidade
        const multFinalidade = this.multiplicadoresFinalidade[dados.finalidade?.toLowerCase()] || 1.0;
        score *= multFinalidade;
        
        return Math.min(1000, Math.max(0, Math.round(score * 1000)));
    }

    // Normalizar score de crédito (0-1)
    normalizarScore(score) {
        if (score >= 800) return 1.0;
        if (score >= 700) return 0.9;
        if (score >= 600) return 0.7;
        if (score >= 500) return 0.5;
        if (score >= 400) return 0.3;
        return 0.1;
    }

    // Normalizar renda (0-1)
    normalizarRenda(renda) {
        if (renda >= 20000) return 1.0;
        if (renda >= 10000) return 0.8;
        if (renda >= 5000) return 0.6;
        if (renda >= 3000) return 0.4;
        if (renda >= 1500) return 0.2;
        return 0.1;
    }

    // Normalizar idade (0-1)
    normalizarIdade(idade) {
        if (idade >= 25 && idade <= 55) return 1.0;
        if (idade >= 18 && idade < 25) return 0.7;
        if (idade > 55 && idade <= 65) return 0.8;
        if (idade > 65) return 0.6;
        return 0.3;
    }

    // Normalizar tempo de emprego em meses (0-1)
    normalizarTempoEmprego(meses) {
        if (meses >= 60) return 1.0;     // 5+ anos
        if (meses >= 36) return 0.8;     // 3-5 anos
        if (meses >= 24) return 0.6;     // 2-3 anos
        if (meses >= 12) return 0.4;     // 1-2 anos
        if (meses >= 6) return 0.2;      // 6-12 meses
        return 0.1;                       // < 6 meses
    }

    // Normalizar tempo de relacionamento bancário (0-1)
    normalizarRelacionamento(meses) {
        if (meses >= 24) return 1.0;     // 2+ anos
        if (meses >= 12) return 0.7;     // 1-2 anos
        if (meses >= 6) return 0.5;      // 6-12 meses
        return 0.3;                       // < 6 meses
    }

    // Obter classificação textual do risco
    obterClassificacaoRisco(score) {
        if (score >= 800) return 'Excelente';
        if (score >= 700) return 'Muito Bom';
        if (score >= 600) return 'Bom';
        if (score >= 500) return 'Regular';
        if (score >= 400) return 'Ruim';
        return 'Muito Ruim';
    }

    // Calcular probabilidade de aprovação (0-100%)
    calcularProbabilidadeAprovacao(scoreRisco, dados) {
        let probabilidade = scoreRisco / 10; // Base: score/10
        
        // Ajustes específicos
        if (dados.score && dados.score < 400) probabilidade *= 0.5;
        if (dados.renda && dados.renda < 2000) probabilidade *= 0.7;
        if (dados.idade && dados.idade < 21) probabilidade *= 0.8;
        if (dados.tempoEmprego && dados.tempoEmprego < 6) probabilidade *= 0.6;
        
        // Valor solicitado vs renda
        if (dados.valorSolicitado && dados.renda) {
            const comprometimento = (dados.valorSolicitado * 0.05) / dados.renda; // Assumindo 5% a.m.
            if (comprometimento > 0.3) probabilidade *= 0.5; // Comprometimento > 30%
        }
        
        return Math.min(95, Math.max(5, Math.round(probabilidade)));
    }

    // Calcular taxa sugerida baseada no risco
    calcularTaxaSugerida(scoreRisco, dados) {
        // Taxa base de mercado
        let taxa = 25.0;
        
        // Ajuste principal por score de risco
        if (scoreRisco >= 800) taxa = 15.0;
        else if (scoreRisco >= 700) taxa = 18.0;
        else if (scoreRisco >= 600) taxa = 22.0;
        else if (scoreRisco >= 500) taxa = 28.0;
        else if (scoreRisco >= 400) taxa = 35.0;
        else taxa = 45.0;
        
        // Ajustes por modalidade específica
        if (dados.finalidade) {
            switch (dados.finalidade.toLowerCase()) {
                case 'casa':
                    taxa *= 0.6;  // Financiamento imobiliário
                    break;
                case 'veiculo':
                    taxa *= 0.7;  // Financiamento de veículo
                    break;
                case 'consolidacao':
                    taxa *= 1.2;  // Maior risco
                    break;
            }
        }
        
        // Ajuste por valor solicitado (valores maiores = taxa menor)
        if (dados.valorSolicitado) {
            if (dados.valorSolicitado > 100000) taxa *= 0.9;
            else if (dados.valorSolicitado > 50000) taxa *= 0.95;
        }
        
        return Math.round(taxa * 100) / 100; // 2 decimais
    }

    // Calcular limite sugerido
    calcularLimiteSugerido(dados, scoreRisco) {
        if (!dados.renda) return 0;
        
        // Base: 10x a renda mensal
        let limite = dados.renda * 10;
        
        // Ajuste por score de risco
        const fatorRisco = scoreRisco / 1000;
        limite *= fatorRisco;
        
        // Ajuste por comprometimento máximo (30% da renda)
        const comprometimentoMaximo = dados.renda * 0.30;
        const limiteComprometimento = comprometimentoMaximo / 0.05; // Assumindo 5% a.m.
        
        // Menor entre os dois critérios
        limite = Math.min(limite, limiteComprometimento);
        
        // Limites mínimos e máximos
        limite = Math.min(500000, Math.max(1000, limite));
        
        return Math.round(limite);
    }

    // Analisar fatores positivos e negativos
    analisarFatores(dados, analise) {
        // Fatores positivos
        if (dados.score >= 700) {
            analise.fatoresPositivos.push('Score de crédito excelente');
        }
        if (dados.renda >= 10000) {
            analise.fatoresPositivos.push('Renda alta');
        }
        if (dados.idade >= 25 && dados.idade <= 55) {
            analise.fatoresPositivos.push('Faixa etária ideal');
        }
        if (dados.tempoEmprego >= 36) {
            analise.fatoresPositivos.push('Estabilidade no emprego');
        }
        if (dados.tempoRelacionamento >= 24) {
            analise.fatoresPositivos.push('Relacionamento longo com o banco');
        }
        if (dados.profissao?.toLowerCase() === 'servidor') {
            analise.fatoresPositivos.push('Profissão de baixo risco');
        }

        // Fatores negativos
        if (dados.score < 500) {
            analise.fatoresNegativos.push('Score de crédito baixo');
        }
        if (dados.renda < 3000) {
            analise.fatoresNegativos.push('Renda limitada');
        }
        if (dados.idade < 21) {
            analise.fatoresNegativos.push('Pouca experiência de crédito');
        }
        if (dados.tempoEmprego < 12) {
            analise.fatoresNegativos.push('Pouco tempo no emprego atual');
        }
        if (dados.profissao?.toLowerCase() === 'desempregado') {
            analise.fatoresNegativos.push('Sem comprovação de renda');
        }
        
        // Análise de comprometimento
        if (dados.valorSolicitado && dados.renda) {
            const comprometimento = (dados.valorSolicitado * analise.taxaSugerida / 100) / dados.renda;
            if (comprometimento > 0.3) {
                analise.fatoresNegativos.push('Alto comprometimento de renda');
            }
        }
    }

    // Gerar recomendações personalizadas
    gerarRecomendacoes(analise) {
        const { scoreRisco, classificacao, dados } = analise;
        
        if (scoreRisco >= 700) {
            analise.recomendacoes.push('Você tem perfil para as melhores condições do mercado');
            analise.recomendacoes.push('Negocie desconto nas taxas oferecidas');
            analise.recomendacoes.push('Considere aumentar o valor se necessário');
        } else if (scoreRisco >= 500) {
            analise.recomendacoes.push('Perfil adequado para crédito, mas compare opções');
            analise.recomendacoes.push('Considere oferecer garantias para melhores taxas');
            analise.recomendacoes.push('Evite comprometer mais de 30% da renda');
        } else {
            analise.recomendacoes.push('Trabalhe na melhoria do seu score antes de solicitar');
            analise.recomendacoes.push('Considere modalidades com garantia (veículo, imóvel)');
            analise.recomendacoes.push('Comece com valores menores');
        }
        
        // Recomendações específicas por problema
        if (analise.fatoresNegativos.includes('Score de crédito baixo')) {
            analise.recomendacoes.push('Quite pendências e negocie dívidas em atraso');
            analise.recomendacoes.push('Mantenha dados atualizados nos órgãos de proteção');
        }
        
        if (analise.fatoresNegativos.includes('Renda limitada')) {
            analise.recomendacoes.push('Comprove renda extra se possuir');
            analise.recomendacoes.push('Considere ter um avalista');
        }
    }

    // Gerar alertas importantes
    gerarAlertas(dados, analise) {
        // Alerta de superendividamento
        if (dados.valorSolicitado && dados.renda) {
            const comprometimento = (dados.valorSolicitado * analise.taxaSugerida / 100) / dados.renda;
            if (comprometimento > 0.5) {
                analise.alertas.push('⚠️ RISCO ALTO: Comprometimento acima de 50% da renda');
            } else if (comprometimento > 0.3) {
                analise.alertas.push('⚠️ ATENÇÃO: Comprometimento acima de 30% da renda');
            }
        }
        
        // Alerta de score baixo
        if (dados.score < 400) {
            analise.alertas.push('⚠️ Score muito baixo - risco de não aprovação');
        }
        
        // Alerta de idade
        if (dados.idade < 21) {
            analise.alertas.push('⚠️ Menor de 21 anos - documentação adicional necessária');
        }
        
        // Alerta de emprego
        if (dados.tempoEmprego < 6) {
            analise.alertas.push('⚠️ Pouco tempo de emprego - pode afetar aprovação');
        }
        
        // Alerta de valor muito alto
        if (dados.valorSolicitado > 100000) {
            analise.alertas.push('⚠️ Valor alto - análise mais rigorosa será necessária');
        }
    }

    // Análise padrão quando há erro
    getAnaliseDefault(dados) {
        return {
            usuario: dados,
            scoreRisco: 500,
            classificacao: 'Regular',
            probabilidadeAprovacao: 50,
            taxaSugerida: 25.0,
            limiteSugerido: (dados.renda || 3000) * 5,
            fatoresPositivos: ['Análise básica realizada'],
            fatoresNegativos: ['Dados incompletos para análise detalhada'],
            recomendacoes: ['Forneça mais informações para análise precisa'],
            alertas: ['⚠️ Análise limitada - dados incompletos']
        };
    }

    // Comparar perfil com histórico de aprovações
    async compararHistorico(perfilUsuario) {
        try {
            // Simular base de dados histórica
            const historicoAprovacoes = this.gerarHistoricoSintetico();
            
            const similares = historicoAprovacoes.filter(hist => 
                Math.abs(hist.score - perfilUsuario.score) <= 50 &&
                Math.abs(hist.renda - perfilUsuario.renda) <= 2000 &&
                hist.profissao === perfilUsuario.profissao
            );
            
            if (similares.length === 0) {
                return { message: 'Nenhum perfil similar encontrado no histórico' };
            }
            
            const taxaMedia = similares.reduce((sum, s) => sum + s.taxaAprovada, 0) / similares.length;
            const aprovacoes = similares.filter(s => s.aprovado).length;
            const percentualAprovacao = (aprovacoes / similares.length) * 100;
            
            return {
                perfisSimilares: similares.length,
                taxaMediaAprovada: taxaMedia.toFixed(2),
                percentualAprovacao: percentualAprovacao.toFixed(1),
                insights: this.gerarInsightsHistorico(similares, perfilUsuario)
            };
            
        } catch (error) {
            console.error('Erro ao comparar histórico:', error);
            return { error: 'Comparação histórica indisponível' };
        }
    }

    // Gerar histórico sintético para demonstração
    gerarHistoricoSintetico() {
        const historico = [];
        const profissoes = ['clt', 'servidor', 'autonomo', 'empresario'];
        
        for (let i = 0; i < 10000; i++) {
            const score = 300 + Math.random() * 700;
            const renda = 1000 + Math.random() * 20000;
            const profissao = profissoes[Math.floor(Math.random() * profissoes.length)];
            
            // Lógica de aprovação baseada em score e renda
            const aprovado = score > 400 && renda > 2000 && Math.random() > 0.2;
            const taxaAprovada = aprovado ? 15 + (1000 - score) * 0.02 + Math.random() * 10 : 0;
            
            historico.push({
                score: Math.round(score),
                renda: Math.round(renda),
                profissao,
                aprovado,
                taxaAprovada: Math.round(taxaAprovada * 100) / 100
            });
        }
        
        return historico;
    }

    // Gerar insights baseados no histórico
    gerarInsightsHistorico(similares, perfil) {
        const insights = [];
        
        const aprovados = similares.filter(s => s.aprovado);
        const reprovados = similares.filter(s => !s.aprovado);
        
        if (aprovados.length > reprovados.length) {
            insights.push('✅ Perfis similares têm alta taxa de aprovação');
        } else {
            insights.push('⚠️ Perfis similares têm baixa taxa de aprovação');
        }
        
        const taxaMinima = Math.min(...aprovados.map(a => a.taxaAprovada));
        const taxaMaxima = Math.max(...aprovados.map(a => a.taxaAprovada));
        
        insights.push(`💰 Faixa de taxa para seu perfil: ${taxaMinima.toFixed(2)}% - ${taxaMaxima.toFixed(2)}%`);
        
        return insights;
    }
}

module.exports = new RiskService();
