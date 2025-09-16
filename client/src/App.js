import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ChatIA from './components/ChatIA';
import './App.css';

const App = () => {
  const [taxasData, setTaxasData] = useState([]);
  const [indicadores, setIndicadores] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showChat, setShowChat] = useState(false);

  // Carregar dados do BACEN ao inicializar
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Carregar dados paralelos da API
      const [taxasResponse, indicadoresResponse] = await Promise.all([
        axios.get('/api/comparar-taxas'),
        axios.get('/api/indicadores')
      ]);

      if (taxasResponse.data.success) {
        setTaxasData(taxasResponse.data.data);
        setLastUpdated(taxasResponse.data.atualizadoEm);
      }

      if (indicadoresResponse.data.success) {
        setIndicadores(indicadoresResponse.data.data);
      }

    } catch (err) {
      setError('Erro ao carregar dados do Banco Central. Tente novamente.');
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTaxaCategory = (taxa) => {
    const valor = parseFloat(taxa);
    if (valor > 15) return 'high';
    if (valor > 8) return 'medium';
    return 'low';
  };

  const formatTaxa = (taxa) => {
    if (taxa === 'N/A' || taxa === 'Erro ao carregar') return taxa;
    return `${parseFloat(taxa).toFixed(2)}% a.m.`;
  };

  const getAIInsights = () => {
    if (taxasData.length === 0) return null;

    const validTaxas = taxasData.filter(item => 
      item.taxaAtual !== 'N/A' && item.taxaAtual !== 'Erro ao carregar'
    );

    if (validTaxas.length === 0) return null;

    const menorTaxa = validTaxas.reduce((min, current) => 
      parseFloat(current.taxaAtual) < parseFloat(min.taxaAtual) ? current : min
    );

    const maiorTaxa = validTaxas.reduce((max, current) => 
      parseFloat(current.taxaAtual) > parseFloat(max.taxaAtual) ? current : max
    );

    return {
      menorTaxa,
      maiorTaxa,
      economia: (parseFloat(maiorTaxa.taxaAtual) - parseFloat(menorTaxa.taxaAtual)).toFixed(2)
    };
  };

  const insights = getAIInsights();

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>Carregando dados do Banco Central...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="header-text">
              <h1>
                <span className="logo-icon">💳</span>
                CREDITECH
              </h1>
              <p>
                Comparação inteligente de taxas de crédito com dados oficiais do Banco Central
              </p>
            </div>
            <button 
              className="chat-ai-trigger"
              onClick={() => setShowChat(true)}
              title="Falar com Assistente IA"
            >
              <span className="chat-icon">🤖</span>
              <span className="chat-text">Assistente IA</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        {error && (
          <div className="error">
            <strong>⚠️ {error}</strong>
            <button className="btn btn-secondary" onClick={loadAllData} style={{marginLeft: '1rem'}}>
              🔄 Tentar Novamente
            </button>
          </div>
        )}

        {/* Indicadores Econômicos */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-value selic-rate">
              {indicadores.selic?.valor ? `${parseFloat(indicadores.selic.valor).toFixed(2)}%` : 'Carregando...'}
            </div>
            <div className="stat-label">Taxa SELIC</div>
            <div className="stat-subtitle">
              {indicadores.selic?.data || 'Atualizando...'}
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value inflation-rate">
              {indicadores.ipca?.valor ? `${parseFloat(indicadores.ipca.valor).toFixed(2)}%` : 'Carregando...'}
            </div>
            <div className="stat-label">Inflação (IPCA)</div>
            <div className="stat-subtitle">
              {indicadores.ipca?.data || 'Atualizando...'}
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value total-comparisons">
              {taxasData.length}
            </div>
            <div className="stat-label">Modalidades</div>
            <div className="stat-subtitle">
              Comparadas
            </div>
          </div>
        </section>

        {/* Insights da IA */}
        {insights && (
          <section className="ai-insights">
            <h3>
              🤖 Insights da IA
            </h3>
            <div className="insights-grid">
              <div className="insight-card best-option">
                <h4>🎯 Melhor Opção</h4>
                <p><strong>{insights.menorTaxa.descricao}</strong></p>
                <p>Taxa: <span className="rate-low">{formatTaxa(insights.menorTaxa.taxaAtual)}</span></p>
              </div>
              
              <div className="insight-card avoid-option">
                <h4>⚠️ Evitar</h4>
                <p><strong>{insights.maiorTaxa.descricao}</strong></p>
                <p>Taxa: <span className="rate-high">{formatTaxa(insights.maiorTaxa.taxaAtual)}</span></p>
              </div>
              
              <div className="insight-card savings">
                <h4>💰 Economia Potencial</h4>
                <p>Escolhendo a melhor opção, você pode economizar até</p>
                <p><strong className="rate-savings">{insights.economia}% a.m.</strong></p>
              </div>
            </div>
          </section>
        )}

        {/* Tabela de Comparação */}
        <section className="card">
          <h2>
            📊 Comparação de Taxas de Crédito
            <button className="refresh-btn" onClick={loadAllData} title="Atualizar dados">
              🔄
            </button>
          </h2>
          
          {lastUpdated && (
            <p className="last-updated">
              Última atualização: {new Date(lastUpdated).toLocaleString('pt-BR')}
            </p>
          )}
          
          <div className="table-container">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Modalidade de Crédito</th>
                  <th>Taxa Atual (%)</th>
                  <th>Classificação</th>
                  <th>Data da Taxa</th>
                </tr>
              </thead>
              <tbody>
                {taxasData.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <div className="modalidade-info">
                        <strong>{item.descricao}</strong>
                        {item.erro && (
                          <div className="error-indicator">
                            ⚠️ {item.erro}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`rate-value rate-${getTaxaCategory(item.taxaAtual)}`}>
                        {formatTaxa(item.taxaAtual)}
                      </span>
                    </td>
                    <td>
                      {item.taxaAtual !== 'N/A' && item.taxaAtual !== 'Erro ao carregar' ? (
                        <span className={`badge badge-${getTaxaCategory(item.taxaAtual) === 'high' ? 'danger' : getTaxaCategory(item.taxaAtual) === 'medium' ? 'warning' : 'success'}`}>
                          {getTaxaCategory(item.taxaAtual) === 'high' ? 'Alta' : getTaxaCategory(item.taxaAtual) === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                      ) : (
                        <span className="badge badge-secondary">N/A</span>
                      )}
                    </td>
                    <td>{item.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Informações Adicionais */}
        <section className="info-cards">
          <div className="card">
            <h3>ℹ️ Como Usar</h3>
            <ul>
              <li>Compare as taxas em tempo real do Banco Central</li>
              <li>Escolha a modalidade com menor taxa para sua necessidade</li>
              <li>Use os insights da IA para tomar melhores decisões</li>
              <li>Monitore os indicadores econômicos (SELIC e IPCA)</li>
            </ul>
          </div>
          
          <div className="card">
            <h3>📈 Sobre os Dados</h3>
            <ul>
              <li>Dados oficiais do Banco Central do Brasil</li>
              <li>Atualização automática via API oficial</li>
              <li>Taxas médias praticadas pelas instituições</li>
              <li>Informações dos últimos 5 dias úteis</li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p><strong>CREDITECH</strong> - Plataforma de Comparação Inteligente de Crédito</p>
          <p>Dados oficiais fornecidos pelo Banco Central do Brasil</p>
          <p>Desenvolvido com ❤️ e IA para ajudar consumidores a fazer melhores escolhas financeiras</p>
        </div>
      </footer>

      {/* Chat IA Modal */}
      {showChat && (
        <ChatIA onClose={() => setShowChat(false)} />
      )}
    </div>
  );
};

export default App;
