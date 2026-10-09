/*
 * Caixa Fácil — camada de dados e regras de negócio.
 *
 * Tudo é salvo no próprio navegador (localStorage), sem servidor e sem
 * cadastro em nuvem. Valores em dinheiro são guardados em centavos
 * (números inteiros) para evitar erros de arredondamento.
 */
const Dados = (() => {
  'use strict';

  const CHAVE = 'caixafacil:v1';
  const CHAVE_ACESSOS = 'caixafacil:acessos';
  const LIMITE_ACESSOS = 500;

  const PAGAMENTOS = ['dinheiro', 'pix', 'cartao', 'fiado'];

  // ---------------------------------------------------------------------
  // Armazenamento (com reserva em memória quando o navegador bloqueia)
  // ---------------------------------------------------------------------
  const memoria = {};
  const armazenamento = {
    ler(chave) {
      try { return localStorage.getItem(chave); } catch { return memoria[chave] ?? null; }
    },
    gravar(chave, valor) {
      try { localStorage.setItem(chave, valor); } catch { memoria[chave] = valor; }
    },
    remover(chave) {
      try { localStorage.removeItem(chave); } catch { delete memoria[chave]; }
    }
  };

  function estadoVazio() {
    return { produtos: [], clientes: [], vendas: [] };
  }

  function lerJSON(chave, padrao) {
    try {
      const bruto = armazenamento.ler(chave);
      return bruto ? JSON.parse(bruto) : padrao;
    } catch {
      return padrao;
    }
  }

  let estado = { ...estadoVazio(), ...lerJSON(CHAVE, {}) };

  function salvar() {
    armazenamento.gravar(CHAVE, JSON.stringify(estado));
  }

  function novoId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // ---------------------------------------------------------------------
  // Utilitários de validação e formatação
  // ---------------------------------------------------------------------
  function texto(valor, rotulo, { max = 80, obrigatorio = true } = {}) {
    const t = String(valor ?? '').trim().replace(/\s+/g, ' ');
    if (!t && obrigatorio) throw new Error(`Preencha o campo "${rotulo}".`);
    if (t.length > max) throw new Error(`O campo "${rotulo}" aceita no máximo ${max} caracteres.`);
    return t;
  }

  function inteiro(valor, rotulo, min = 0) {
    const n = Number(String(valor ?? '').trim());
    if (String(valor ?? '').trim() === '' || !Number.isInteger(n) || n < min) {
      throw new Error(`O campo "${rotulo}" deve ser um número inteiro igual ou maior que ${min}.`);
    }
    return n;
  }

  /** Converte "12,50", "1.234,56", "12.5" ou "R$ 7" em centavos. Retorna NaN se inválido. */
  function paraCentavos(valor) {
    if (typeof valor === 'number') return Number.isFinite(valor) ? Math.round(valor * 100) : NaN;
    let t = String(valor ?? '').replace(/R\$|\s/g, '');
    if (!t) return NaN;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
    return Math.round(parseFloat(t) * 100);
  }

  function preco(valor, rotulo) {
    const c = paraCentavos(valor);
    if (!Number.isFinite(c) || c <= 0) {
      throw new Error(`O campo "${rotulo}" deve ser um valor maior que zero, por exemplo 12,50.`);
    }
    if (c > 100000000) throw new Error(`O campo "${rotulo}" está alto demais.`);
    return c;
  }

  const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function moeda(centavos) {
    return formatadorMoeda.format((centavos || 0) / 100);
  }

  /** Data no formato AAAA-MM-DD considerando o fuso do aparelho. */
  function diaLocal(data) {
    const d = data instanceof Date ? data : new Date(data);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function somenteDigitos(t) {
    return String(t ?? '').replace(/\D/g, '');
  }

  /** Minúsculas e sem acentos, para buscas ("unicornio" encontra "Unicórnio"). */
  function normalizar(t) {
    return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  const mesmoTexto = (a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }) === 0;

  const ordenarPorNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');

  // ---------------------------------------------------------------------
  // Produtos
  // ---------------------------------------------------------------------
  function listarProdutos() {
    return [...estado.produtos].sort(ordenarPorNome);
  }

  function obterProduto(id) {
    return estado.produtos.find((p) => p.id === id) || null;
  }

  function salvarProduto(dados) {
    const nome = texto(dados.nome, 'Nome do produto', { max: 60 });
    const produto = {
      nome,
      preco: preco(dados.preco, 'Preço de venda'),
      estoque: inteiro(dados.estoque, 'Quantidade em estoque', 0),
      // Vazio = não avisar (útil para peças únicas, como em bazares).
      minimo: String(dados.minimo ?? '').trim() === ''
        ? null
        : inteiro(dados.minimo, 'Avisar quando o estoque chegar a', 0)
    };

    const duplicado = estado.produtos.find((p) => p.id !== dados.id && mesmoTexto(p.nome, nome));
    if (duplicado) throw new Error(`Já existe um produto chamado "${duplicado.nome}".`);

    if (dados.id) {
      const atual = obterProduto(dados.id);
      if (!atual) throw new Error('Produto não encontrado.');
      Object.assign(atual, produto);
      salvar();
      return atual;
    }

    const novo = { id: novoId(), ...produto, criadoEm: new Date().toISOString() };
    estado.produtos.push(novo);
    salvar();
    return novo;
  }

  function excluirProduto(id) {
    const antes = estado.produtos.length;
    estado.produtos = estado.produtos.filter((p) => p.id !== id);
    if (estado.produtos.length === antes) throw new Error('Produto não encontrado.');
    salvar();
  }

  // ---------------------------------------------------------------------
  // Clientes
  // ---------------------------------------------------------------------
  function listarClientes() {
    return [...estado.clientes].sort(ordenarPorNome);
  }

  function obterCliente(id) {
    return estado.clientes.find((c) => c.id === id) || null;
  }

  function salvarCliente(dados) {
    const nome = texto(dados.nome, 'Nome do cliente', { max: 60 });
    const telefone = somenteDigitos(dados.telefone);
    if (telefone && (telefone.length < 10 || telefone.length > 11)) {
      throw new Error('Informe o telefone com DDD, por exemplo (11) 98765-4321.');
    }

    const duplicado = estado.clientes.find((c) => c.id !== dados.id && mesmoTexto(c.nome, nome));
    if (duplicado) throw new Error(`Já existe um cliente chamado "${duplicado.nome}".`);

    if (dados.id) {
      const atual = obterCliente(dados.id);
      if (!atual) throw new Error('Cliente não encontrado.');
      Object.assign(atual, { nome, telefone });
      salvar();
      return atual;
    }

    const novo = { id: novoId(), nome, telefone, criadoEm: new Date().toISOString() };
    estado.clientes.push(novo);
    salvar();
    return novo;
  }

  function excluirCliente(id) {
    if (fiadoEmAberto(id) > 0) {
      throw new Error('Este cliente tem fiado em aberto. Receba o valor antes de excluir.');
    }
    const antes = estado.clientes.length;
    estado.clientes = estado.clientes.filter((c) => c.id !== id);
    if (estado.clientes.length === antes) throw new Error('Cliente não encontrado.');
    salvar();
  }

  const saldoVenda = (v) => v.total - (v.pago || 0);

  function fiadoEmAberto(clienteId) {
    return estado.vendas
      .filter((v) => v.status === 'fiado' && v.clienteId === clienteId)
      .reduce((soma, v) => soma + saldoVenda(v), 0);
  }

  /**
   * Registra um pagamento de fiado. Sem valor, quita tudo; com valor, abate
   * das vendas mais antigas primeiro (pagamento parcial).
   */
  function receberFiado(clienteId, valor) {
    const aberto = fiadoEmAberto(clienteId);
    if (aberto === 0) throw new Error('Este cliente não tem fiado em aberto.');
    let restante = aberto;
    if (valor !== undefined && String(valor).trim() !== '') {
      restante = paraCentavos(valor);
      if (!Number.isFinite(restante) || restante <= 0) {
        throw new Error('Informe o valor recebido, por exemplo 10,00.');
      }
      if (restante > aberto) {
        throw new Error(`O valor é maior que o fiado em aberto (${moeda(aberto)}).`);
      }
    }
    const agora = new Date().toISOString();
    const recebido = restante;
    const fiados = estado.vendas
      .filter((v) => v.status === 'fiado' && v.clienteId === clienteId)
      .sort((a, b) => a.data.localeCompare(b.data));
    for (const v of fiados) {
      if (restante === 0) break;
      const abate = Math.min(restante, saldoVenda(v));
      v.pago = (v.pago || 0) + abate;
      restante -= abate;
      if (saldoVenda(v) === 0) {
        v.status = 'paga';
        v.pagoEm = agora;
      }
    }
    salvar();
    return { recebido, emAberto: aberto - recebido };
  }

  // ---------------------------------------------------------------------
  // Vendas
  // ---------------------------------------------------------------------
  /**
   * Registra uma venda e baixa o estoque.
   * @param {{itens: {produtoId: string, qtd: number}[], clienteId?: string, pagamento: string,
   *          desconto?: string, recebido?: string}} dados
   */
  function registrarVenda(dados) {
    const itensInformados = Array.isArray(dados.itens) ? dados.itens : [];
    if (itensInformados.length === 0) throw new Error('Adicione pelo menos um produto à venda.');

    const pagamento = dados.pagamento;
    if (!PAGAMENTOS.includes(pagamento)) throw new Error('Escolha a forma de pagamento.');

    const cliente = dados.clienteId ? obterCliente(dados.clienteId) : null;
    if (dados.clienteId && !cliente) throw new Error('Cliente não encontrado.');
    if (pagamento === 'fiado' && !cliente) {
      throw new Error('Para vender fiado, escolha o cliente que vai pagar depois.');
    }

    // Junta itens repetidos do mesmo produto e confere o estoque antes de alterar qualquer coisa.
    const quantidades = new Map();
    for (const item of itensInformados) {
      const qtd = inteiro(item.qtd, 'Quantidade', 1);
      quantidades.set(item.produtoId, (quantidades.get(item.produtoId) || 0) + qtd);
    }

    const itens = [];
    for (const [produtoId, qtd] of quantidades) {
      const produto = obterProduto(produtoId);
      if (!produto) throw new Error('Um dos produtos da venda não existe mais.');
      if (qtd > produto.estoque) {
        throw new Error(`Estoque insuficiente de "${produto.nome}": há ${produto.estoque} disponível(is).`);
      }
      itens.push({ produtoId, nome: produto.nome, preco: produto.preco, qtd });
    }

    const subtotal = itens.reduce((soma, i) => soma + i.preco * i.qtd, 0);
    let desconto = 0;
    if (String(dados.desconto ?? '').trim() !== '') {
      desconto = paraCentavos(dados.desconto);
      if (!Number.isFinite(desconto) || desconto < 0) {
        throw new Error('Desconto inválido. Use um valor como 5,00.');
      }
      if (desconto >= subtotal) throw new Error('O desconto precisa ser menor que o valor da venda.');
    }
    const total = subtotal - desconto;

    let recebido = null;
    if (pagamento === 'dinheiro' && String(dados.recebido ?? '').trim() !== '') {
      recebido = paraCentavos(dados.recebido);
      if (!Number.isFinite(recebido)) throw new Error('Valor recebido inválido. Use um valor como 50,00.');
      if (recebido < total) {
        throw new Error(`O valor recebido é menor que o total da venda. Faltam ${moeda(total - recebido)}.`);
      }
    }

    for (const item of itens) obterProduto(item.produtoId).estoque -= item.qtd;

    const venda = {
      id: novoId(),
      data: new Date().toISOString(),
      clienteId: cliente ? cliente.id : null,
      clienteNome: cliente ? cliente.nome : '',
      itens,
      pagamento,
      subtotal,
      desconto,
      total,
      recebido,
      status: pagamento === 'fiado' ? 'fiado' : 'paga'
    };
    estado.vendas.push(venda);
    salvar();
    return venda;
  }

  function cancelarVenda(id) {
    const venda = estado.vendas.find((v) => v.id === id);
    if (!venda) throw new Error('Venda não encontrada.');
    if (venda.status === 'cancelada') throw new Error('Esta venda já foi cancelada.');

    for (const item of venda.itens) {
      const produto = obterProduto(item.produtoId);
      if (produto) produto.estoque += item.qtd;
    }
    venda.status = 'cancelada';
    venda.canceladaEm = new Date().toISOString();
    salvar();
    return venda;
  }

  /** Lista vendas (mais recentes primeiro), opcionalmente entre duas datas AAAA-MM-DD. */
  function listarVendas({ de, ate } = {}) {
    return estado.vendas
      .filter((v) => {
        const dia = diaLocal(v.data);
        return (!de || dia >= de) && (!ate || dia <= ate);
      })
      .reverse() // empate de horário: a registrada por último vem primeiro
      .sort((a, b) => b.data.localeCompare(a.data));
  }

  // ---------------------------------------------------------------------
  // Painel (indicadores)
  // ---------------------------------------------------------------------
  function resumo(agora = new Date()) {
    const hoje = diaLocal(agora);
    const mes = hoje.slice(0, 7);
    const validas = estado.vendas.filter((v) => v.status !== 'cancelada');
    const doDia = validas.filter((v) => diaLocal(v.data) === hoje);
    const doMes = validas.filter((v) => diaLocal(v.data).slice(0, 7) === mes);
    const soma = (lista) => lista.reduce((s, v) => s + v.total, 0);

    const porProduto = new Map();
    for (const v of doMes) {
      for (const i of v.itens) {
        const atual = porProduto.get(i.produtoId) || { nome: i.nome, qtd: 0, total: 0 };
        atual.qtd += i.qtd;
        atual.total += i.preco * i.qtd;
        porProduto.set(i.produtoId, atual);
      }
    }

    const mesTotal = soma(doMes);
    return {
      hojeTotal: soma(doDia),
      hojeQtd: doDia.length,
      mesTotal,
      mesQtd: doMes.length,
      ticketMedio: doMes.length ? Math.round(mesTotal / doMes.length) : 0,
      aReceber: validas.filter((v) => v.status === 'fiado').reduce((s, v) => s + saldoVenda(v), 0),
      estoqueBaixo: estado.produtos
        .filter((p) => p.minimo != null && p.estoque <= p.minimo)
        .sort((a, b) => a.estoque - b.estoque),
      maisVendidos: [...porProduto.values()].sort((a, b) => b.qtd - a.qtd).slice(0, 5),
      totalProdutos: estado.produtos.length,
      totalClientes: estado.clientes.length
    };
  }

  // ---------------------------------------------------------------------
  // Registro de acessos (fluxo de dados exigido como evidência)
  // ---------------------------------------------------------------------
  function descreverDispositivo(ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '')) {
    const tipo = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'Celular/Tablet' : 'Computador';
    const navegador =
      /Edg\//.test(ua) ? 'Edge' :
      /OPR\//.test(ua) ? 'Opera' :
      /SamsungBrowser/.test(ua) ? 'Samsung Internet' :
      /Chrome\//.test(ua) ? 'Chrome' :
      /Firefox\//.test(ua) ? 'Firefox' :
      /Safari\//.test(ua) ? 'Safari' : 'Outro';
    return `${tipo} · ${navegador}`;
  }

  function registrarAcesso({ nome, negocio, evento }) {
    const registro = {
      id: novoId(),
      nome: texto(nome, 'Seu nome', { max: 60 }),
      negocio: texto(negocio, 'Tipo de negócio', { max: 60, obrigatorio: false }),
      evento: evento || 'acesso',
      data: new Date().toISOString(),
      dispositivo: descreverDispositivo()
    };
    const lista = lerJSON(CHAVE_ACESSOS, []);
    lista.push(registro);
    armazenamento.gravar(CHAVE_ACESSOS, JSON.stringify(lista.slice(-LIMITE_ACESSOS)));
    return registro;
  }

  function listarAcessos() {
    return lerJSON(CHAVE_ACESSOS, []).reverse().sort((a, b) => b.data.localeCompare(a.data));
  }

  // ---------------------------------------------------------------------
  // Exportação (CSV para Excel/Planilhas e cópia de segurança em JSON)
  // ---------------------------------------------------------------------
  function csv(linhas) {
    const celula = (v) => {
      const t = String(v ?? '');
      return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    // BOM no início para o Excel reconhecer os acentos.
    return '﻿' + linhas.map((l) => l.map(celula).join(';')).join('\r\n');
  }

  const decimal = (centavos) => (centavos / 100).toFixed(2).replace('.', ',');
  const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR');
  const data = (iso) => new Date(iso).toLocaleDateString('pt-BR');

  function vendasCSV(vendas) {
    const nomesPagamento = { dinheiro: 'Dinheiro', pix: 'Pix', cartao: 'Cartão', fiado: 'Fiado' };
    return csv([
      ['Data', 'Hora', 'Cliente', 'Itens', 'Pagamento', 'Situação', 'Desconto (R$)', 'Total (R$)'],
      ...vendas.map((v) => [
        data(v.data),
        hora(v.data),
        v.clienteNome || 'Cliente avulso',
        v.itens.map((i) => `${i.qtd}x ${i.nome}`).join(', '),
        nomesPagamento[v.pagamento],
        { paga: 'Paga', fiado: 'Fiado em aberto', cancelada: 'Cancelada' }[v.status],
        decimal(v.desconto || 0),
        decimal(v.total)
      ])
    ]);
  }

  function acessosCSV(acessos) {
    return csv([
      ['Data', 'Hora', 'Nome', 'Tipo de negócio', 'Evento', 'Dispositivo'],
      ...acessos.map((a) => [data(a.data), hora(a.data), a.nome, a.negocio, a.evento, a.dispositivo])
    ]);
  }

  function exportarBackup() {
    return JSON.stringify(
      { app: 'caixa-facil', versao: 1, exportadoEm: new Date().toISOString(), dados: estado },
      null,
      2
    );
  }

  function importarBackup(conteudo) {
    let obj;
    try {
      obj = JSON.parse(conteudo);
    } catch {
      throw new Error('Arquivo inválido: não é uma cópia de segurança do Caixa Fácil.');
    }
    const d = obj && obj.app === 'caixa-facil' ? obj.dados : null;
    if (!d || !['produtos', 'clientes', 'vendas'].every((k) => Array.isArray(d[k]))) {
      throw new Error('Arquivo inválido: não é uma cópia de segurança do Caixa Fácil.');
    }
    estado = { produtos: d.produtos, clientes: d.clientes, vendas: d.vendas };
    salvar();
  }

  function apagarTudo() {
    estado = estadoVazio();
    salvar();
  }

  /** Cadastra produtos e clientes de exemplo para quem quer só experimentar. */
  function carregarExemplo() {
    const produtos = [
      ['Bolo de pote', '8,00', 12, 3],
      ['Brigadeiro (unidade)', '2,50', 40, 10],
      ['Coxinha', '6,00', 20, 5],
      ['Refrigerante lata', '5,00', 2, 4],
      ['Suco natural 300 ml', '7,00', 8, 3]
    ];
    const clientes = [
      ['Maria (vizinha do 12)', '11987654321'],
      ['João da oficina', '']
    ];
    let criados = 0;
    for (const [nome, valor, estoque, minimo] of produtos) {
      if (!estado.produtos.some((p) => mesmoTexto(p.nome, nome))) {
        salvarProduto({ nome, preco: valor, estoque, minimo });
        criados++;
      }
    }
    for (const [nome, telefone] of clientes) {
      if (!estado.clientes.some((c) => mesmoTexto(c.nome, nome))) {
        salvarCliente({ nome, telefone });
        criados++;
      }
    }
    return criados;
  }

  return {
    PAGAMENTOS,
    moeda,
    normalizar,
    paraCentavos,
    diaLocal,
    somenteDigitos,
    listarProdutos,
    obterProduto,
    salvarProduto,
    excluirProduto,
    listarClientes,
    obterCliente,
    salvarCliente,
    excluirCliente,
    fiadoEmAberto,
    receberFiado,
    registrarVenda,
    cancelarVenda,
    listarVendas,
    resumo,
    registrarAcesso,
    listarAcessos,
    descreverDispositivo,
    vendasCSV,
    acessosCSV,
    exportarBackup,
    importarBackup,
    apagarTudo,
    carregarExemplo
  };
})();

if (typeof module !== 'undefined') module.exports = Dados;
