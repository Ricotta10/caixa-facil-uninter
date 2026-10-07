/*
 * Caixa Fácil — interface (telas, formulários e navegação).
 * Depende de js/config.js (CONFIG) e js/dados.js (Dados).
 */
(() => {
  'use strict';

  const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
  const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const { moeda } = Dados;

  const NOMES_PAGAMENTO = { dinheiro: 'Dinheiro', pix: 'Pix', cartao: 'Cartão', fiado: 'Fiado' };
  const SESSAO = 'caixafacil:sessao';
  const PREFERENCIAS = 'caixafacil:preferencias';

  const local = {
    ler(chave) {
      try { return JSON.parse(localStorage.getItem(chave)); } catch { return null; }
    },
    gravar(chave, valor) {
      try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* modo privado */ }
    },
    remover(chave) {
      try { localStorage.removeItem(chave); } catch { /* modo privado */ }
    }
  };

  const dataHora = (iso) =>
    new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  // ---------------------------------------------------------------------
  // Avisos e tratamento de erros
  // ---------------------------------------------------------------------
  let temporizadorAviso;
  function avisar(mensagem, tipo = 'ok') {
    const caixa = $('#aviso');
    caixa.textContent = mensagem;
    caixa.className = `aviso${tipo === 'erro' ? ' erro' : ''}`;
    caixa.hidden = false;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { caixa.hidden = true; }, tipo === 'erro' ? 6000 : 3500);
  }

  /** Executa uma ação; se der erro de validação, mostra a mensagem ao usuário. */
  function tentar(acao) {
    try {
      return { ok: true, valor: acao() };
    } catch (erro) {
      avisar(erro.message, 'erro');
      return { ok: false };
    }
  }

  function baixar(nomeArquivo, conteudo, tipo) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const link = Object.assign(document.createElement('a'), { href: url, download: nomeArquivo });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------------------------------------------------------------------
  // Preferências de acessibilidade
  // ---------------------------------------------------------------------
  const preferencias = { fonte: 1, contraste: false, ...local.ler(PREFERENCIAS) };

  function aplicarPreferencias() {
    const raiz = document.documentElement;
    raiz.dataset.fonte = String(preferencias.fonte);
    if (preferencias.contraste) raiz.dataset.contraste = 'alto';
    else delete raiz.dataset.contraste;
    $('#contraste').setAttribute('aria-pressed', String(preferencias.contraste));
    $('#fonte-menor').disabled = preferencias.fonte <= 1;
    $('#fonte-maior').disabled = preferencias.fonte >= 4;
    local.gravar(PREFERENCIAS, preferencias);
  }

  $('#fonte-menor').addEventListener('click', () => {
    preferencias.fonte = Math.max(1, preferencias.fonte - 1);
    aplicarPreferencias();
  });
  $('#fonte-maior').addEventListener('click', () => {
    preferencias.fonte = Math.min(4, preferencias.fonte + 1);
    aplicarPreferencias();
  });
  $('#contraste').addEventListener('click', () => {
    preferencias.contraste = !preferencias.contraste;
    aplicarPreferencias();
    avisar(preferencias.contraste ? 'Alto contraste ligado.' : 'Alto contraste desligado.');
  });

  // ---------------------------------------------------------------------
  // Entrada, sessão e registro de acessos
  // ---------------------------------------------------------------------
  function enviarRegistroCentral(registro) {
    if (!CONFIG.LOG_ENDPOINT) return;
    // "no-cors" + text/plain: o Google Apps Script recebe sem exigir pré-verificação (CORS).
    fetch(CONFIG.LOG_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        nome: registro.nome,
        negocio: registro.negocio,
        evento: registro.evento,
        dispositivo: registro.dispositivo,
        dataAparelho: registro.data
      })
    }).catch(() => { /* sem internet: o registro local continua valendo */ });
  }

  function registrarAcesso(sessao, evento) {
    const r = tentar(() => Dados.registrarAcesso({ ...sessao, evento }));
    if (r.ok) enviarRegistroCentral(r.valor);
  }

  $('#form-entrada').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nome = form.nome.value.trim().replace(/\s+/g, ' ');
    form.nome.setAttribute('aria-invalid', String(nome.length < 2));
    if (nome.length < 2) {
      avisar('Digite seu nome para entrar.', 'erro');
      form.nome.focus();
      return;
    }
    if (!form.aceite.checked) {
      avisar('Para entrar, marque que você concorda com o registro de acesso.', 'erro');
      form.aceite.focus();
      return;
    }
    const sessao = { nome, negocio: form.negocio.value };
    local.gravar(SESSAO, sessao);
    registrarAcesso(sessao, 'primeiro acesso');
    iniciarApp(sessao);
  });

  $('#sair').addEventListener('click', () => {
    local.remover(SESSAO);
    $('#app').hidden = true;
    $('#tela-entrada').hidden = false;
    $('#form-entrada').reset();
    $('#entrada-nome').focus();
  });

  function iniciarApp(sessao) {
    $('#tela-entrada').hidden = true;
    $('#app').hidden = false;
    const primeiroNome = sessao.nome.split(' ')[0];
    $('#saudacao').textContent = `Olá, ${primeiroNome}!`;
    const inicial = location.hash.slice(1);
    mostrarAba(SECOES.includes(inicial) ? inicial : 'painel', { focar: false });
  }

  // ---------------------------------------------------------------------
  // Navegação entre seções
  // ---------------------------------------------------------------------
  const SECOES = ['painel', 'vender', 'produtos', 'clientes', 'historico', 'acessos', 'ajuda'];
  const RENDERIZAR = {
    painel: renderPainel,
    vender: renderVender,
    produtos: renderProdutos,
    clientes: renderClientes,
    historico: renderHistorico,
    acessos: renderAcessos,
    ajuda: () => {}
  };

  function mostrarAba(nome, { focar = true } = {}) {
    $('#aviso').hidden = true;
    for (const secao of $$('[data-secao]')) secao.hidden = secao.dataset.secao !== nome;
    for (const botao of $$('[data-aba]')) {
      if (botao.dataset.aba === nome) botao.setAttribute('aria-current', 'page');
      else botao.removeAttribute('aria-current');
    }
    if (location.hash !== `#${nome}`) history.replaceState(null, '', `#${nome}`);
    RENDERIZAR[nome]();
    $(`[data-aba="${nome}"]`).scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (focar) $(`[data-secao="${nome}"] h2`).focus();
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', (e) => {
    const alvo = e.target.closest('[data-aba], [data-ir]');
    if (!alvo) return;
    e.preventDefault();
    mostrarAba(alvo.dataset.aba || alvo.dataset.ir);
  });

  // ---------------------------------------------------------------------
  // Painel
  // ---------------------------------------------------------------------
  function cartao(rotulo, valor, detalhe = '', alerta = false) {
    return `<div class="cartao${alerta ? ' cartao-alerta' : ''}">
      <p class="cartao-rotulo">${esc(rotulo)}</p>
      <p class="cartao-valor">${esc(valor)}</p>
      ${detalhe ? `<p class="cartao-detalhe">${esc(detalhe)}</p>` : ''}
    </div>`;
  }

  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  function renderPainel() {
    const r = Dados.resumo();
    $('#painel-inicio').hidden = r.totalProdutos > 0;
    $('#painel-cartoes').innerHTML = [
      cartao('Vendido hoje', moeda(r.hojeTotal), plural(r.hojeQtd, 'venda', 'vendas')),
      cartao('Vendido no mês', moeda(r.mesTotal), plural(r.mesQtd, 'venda', 'vendas')),
      cartao('Ticket médio do mês', moeda(r.ticketMedio), 'valor médio por venda'),
      cartao('Fiado a receber', moeda(r.aReceber), 'veja em Clientes', r.aReceber > 0)
    ].join('');

    $('#painel-estoque').innerHTML = r.estoqueBaixo.length
      ? `<ul>${r.estoqueBaixo
          .map((p) => `<li><strong>${esc(p.nome)}</strong>: ${p.estoque === 0
            ? '<span class="selo selo-perigo">esgotado</span>'
            : `restam ${p.estoque} <span class="selo selo-alerta">repor</span>`}</li>`)
          .join('')}</ul>`
      : '<p class="vazio">Nenhum produto com estoque baixo.</p>';

    $('#painel-mais-vendidos').innerHTML = r.maisVendidos.length
      ? `<ol>${r.maisVendidos
          .map((p) => `<li><strong>${esc(p.nome)}</strong>: ${p.qtd} un. (${moeda(p.total)})</li>`)
          .join('')}</ol>`
      : '<p class="vazio">Nenhuma venda registrada neste mês.</p>';
  }

  $('#painel-exemplo').addEventListener('click', carregarExemplos);
  $('#ajuda-exemplo').addEventListener('click', carregarExemplos);

  function carregarExemplos() {
    const r = tentar(() => Dados.carregarExemplo());
    if (!r.ok) return;
    mostrarAba('painel');
    avisar(r.valor ? 'Exemplos carregados. Experimente fazer uma venda!' : 'Os exemplos já estavam cadastrados.');
  }

  // ---------------------------------------------------------------------
  // Vender (carrinho)
  // ---------------------------------------------------------------------
  let carrinho = []; // [{ produtoId, qtd }]

  function totalCarrinho() {
    return carrinho.reduce((soma, item) => {
      const p = Dados.obterProduto(item.produtoId);
      return soma + (p ? p.preco * item.qtd : 0);
    }, 0);
  }

  function renderVender() {
    // Remove do carrinho produtos que foram excluídos nesse meio-tempo.
    carrinho = carrinho.filter((i) => Dados.obterProduto(i.produtoId));

    const produtos = Dados.listarProdutos();
    const seletor = $('#venda-produto');
    const anterior = seletor.value;
    seletor.innerHTML = produtos.length
      ? '<option value="">Escolha um produto…</option>' +
        produtos
          .map((p) => {
            const noCarrinho = carrinho.find((i) => i.produtoId === p.id)?.qtd || 0;
            const disponivel = p.estoque - noCarrinho;
            return `<option value="${esc(p.id)}"${disponivel <= 0 ? ' disabled' : ''}>${esc(p.nome)} — ${moeda(p.preco)} (${disponivel > 0 ? `${disponivel} em estoque` : 'esgotado'})</option>`;
          })
          .join('')
      : '<option value="">Cadastre produtos primeiro</option>';
    if ([...seletor.options].some((o) => o.value === anterior && !o.disabled)) seletor.value = anterior;

    const clientes = Dados.listarClientes();
    const seletorCliente = $('#venda-cliente');
    const clienteAnterior = seletorCliente.value;
    seletorCliente.innerHTML =
      '<option value="">Cliente avulso (sem cadastro)</option>' +
      clientes.map((c) => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join('');
    if (clientes.some((c) => c.id === clienteAnterior)) seletorCliente.value = clienteAnterior;

    renderCarrinho();
    atualizarPagamento();
  }

  function renderCarrinho() {
    const area = $('#carrinho');
    if (carrinho.length === 0) {
      area.innerHTML = '<p class="vazio">Nenhum item adicionado ainda.</p>';
      $('#finalizar-venda').disabled = true;
      atualizarTroco();
      return;
    }
    const linhas = carrinho
      .map((item, indice) => {
        const p = Dados.obterProduto(item.produtoId);
        return `<tr>
          <td>${esc(p.nome)}</td>
          <td class="numero">${item.qtd}</td>
          <td class="numero coluna-opcional">${moeda(p.preco)}</td>
          <td class="numero">${moeda(p.preco * item.qtd)}</td>
          <td class="acoes"><button type="button" class="botao botao-pequeno botao-perigo" data-remover-item="${indice}" aria-label="Remover ${esc(p.nome)} da venda" title="Remover">✕</button></td>
        </tr>`;
      })
      .join('');
    area.innerHTML = `<div class="tabela-rolagem"><table>
      <thead><tr><th scope="col">Produto</th><th scope="col" class="numero">Qtd.</th><th scope="col" class="numero coluna-opcional">Preço</th><th scope="col" class="numero">Subtotal</th><th scope="col"><span class="visualmente-oculto">Ações</span></th></tr></thead>
      <tbody>${linhas}</tbody>
      <tfoot><tr><td colspan="2">Total da venda</td><td class="coluna-opcional"></td><td class="numero">${moeda(totalCarrinho())}</td><td></td></tr></tfoot>
    </table></div>`;
    $('#finalizar-venda').disabled = false;
    atualizarTroco();
  }

  $('#form-item').addEventListener('submit', (e) => {
    e.preventDefault();
    const produtoId = $('#venda-produto').value;
    const qtd = Number($('#venda-qtd').value);
    const produto = Dados.obterProduto(produtoId);
    if (!produto) {
      avisar('Escolha um produto.', 'erro');
      $('#venda-produto').focus();
      return;
    }
    if (!Number.isInteger(qtd) || qtd < 1) {
      avisar('A quantidade deve ser um número inteiro maior que zero.', 'erro');
      $('#venda-qtd').focus();
      return;
    }
    const existente = carrinho.find((i) => i.produtoId === produtoId);
    const total = (existente?.qtd || 0) + qtd;
    if (total > produto.estoque) {
      avisar(`Estoque insuficiente: há ${produto.estoque} unidade(s) de "${produto.nome}".`, 'erro');
      return;
    }
    if (existente) existente.qtd = total;
    else carrinho.push({ produtoId, qtd });
    avisar(`${qtd}x ${produto.nome} adicionado.`);
    $('#venda-qtd').value = 1;
    renderVender();
    $('#venda-produto').value = '';
    $('#venda-produto').focus();
  });

  $('#carrinho').addEventListener('click', (e) => {
    const botao = e.target.closest('[data-remover-item]');
    if (!botao) return;
    carrinho.splice(Number(botao.dataset.removerItem), 1);
    renderVender();
    avisar('Item removido.');
  });

  const pagamentoEscolhido = () => $('input[name="pagamento"]:checked').value;

  function atualizarPagamento() {
    const fiado = pagamentoEscolhido() === 'fiado';
    $('#cliente-opcional').textContent = fiado ? '(obrigatório no fiado)' : '(opcional)';
    $('#campo-recebido').hidden = pagamentoEscolhido() !== 'dinheiro';
    atualizarTroco();
  }

  function atualizarTroco() {
    const saida = $('#venda-troco');
    const recebido = Dados.paraCentavos($('#venda-recebido').value);
    const total = totalCarrinho();
    if (!$('#venda-recebido').value.trim() || total === 0) saida.textContent = '';
    else if (!Number.isFinite(recebido)) saida.textContent = 'Digite um valor válido, por exemplo 50,00.';
    else if (recebido < total) saida.textContent = `Faltam ${moeda(total - recebido)}.`;
    else saida.textContent = `Troco: ${moeda(recebido - total)}`;
  }

  $$('input[name="pagamento"]').forEach((r) => r.addEventListener('change', atualizarPagamento));
  $('#venda-recebido').addEventListener('input', atualizarTroco);

  $('#form-venda').addEventListener('submit', (e) => {
    e.preventDefault();
    const pagamento = pagamentoEscolhido();
    const r = tentar(() =>
      Dados.registrarVenda({ itens: carrinho, clienteId: $('#venda-cliente').value, pagamento })
    );
    if (!r.ok) {
      if (pagamento === 'fiado' && !$('#venda-cliente').value) $('#venda-cliente').focus();
      return;
    }
    carrinho = [];
    $('#venda-recebido').value = '';
    $('#venda-cliente').value = '';
    $('input[name="pagamento"][value="dinheiro"]').checked = true;
    renderVender();
    avisar(`Venda de ${moeda(r.valor.total)} registrada (${NOMES_PAGAMENTO[r.valor.pagamento]}).`);
    $('#venda-produto').focus();
  });

  // ---------------------------------------------------------------------
  // Produtos
  // ---------------------------------------------------------------------
  function renderProdutos() {
    const busca = $('#produto-busca').value.trim().toLocaleLowerCase('pt-BR');
    const produtos = Dados.listarProdutos().filter((p) =>
      p.nome.toLocaleLowerCase('pt-BR').includes(busca)
    );
    const area = $('#lista-produtos');
    if (produtos.length === 0) {
      area.innerHTML = `<p class="vazio">${busca ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado ainda.'}</p>`;
      return;
    }
    area.innerHTML = `<div class="tabela-rolagem"><table>
      <caption>${plural(produtos.length, 'produto', 'produtos')}</caption>
      <thead><tr><th scope="col">Produto</th><th scope="col" class="numero">Preço</th><th scope="col" class="numero">Estoque</th><th scope="col"><span class="visualmente-oculto">Ações</span></th></tr></thead>
      <tbody>${produtos
        .map((p) => {
          const selo = p.estoque === 0
            ? ' <span class="selo selo-perigo">esgotado</span>'
            : p.estoque <= p.minimo ? ' <span class="selo selo-alerta">repor</span>' : '';
          return `<tr>
            <td>${esc(p.nome)}</td>
            <td class="numero">${moeda(p.preco)}</td>
            <td class="numero">${p.estoque}${selo}</td>
            <td class="acoes">
              <button type="button" class="botao botao-pequeno" data-editar-produto="${esc(p.id)}" aria-label="Editar ${esc(p.nome)}">Editar</button>
              <button type="button" class="botao botao-pequeno botao-perigo" data-excluir-produto="${esc(p.id)}" aria-label="Excluir ${esc(p.nome)}">Excluir</button>
            </td>
          </tr>`;
        })
        .join('')}</tbody>
    </table></div>`;
  }

  function limparFormProduto() {
    const form = $('#form-produto');
    form.reset();
    form.id.value = '';
    $('#produto-titulo-form').textContent = 'Novo produto';
    $('#produto-salvar').textContent = 'Cadastrar produto';
    $('#produto-cancelar').hidden = true;
  }

  $('#form-produto').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const editando = Boolean(form.id.value);
    const r = tentar(() =>
      Dados.salvarProduto({
        id: form.id.value || undefined,
        nome: form.nome.value,
        preco: form.preco.value,
        estoque: form.estoque.value,
        minimo: form.minimo.value
      })
    );
    if (!r.ok) return;
    avisar(editando ? `"${r.valor.nome}" atualizado.` : `"${r.valor.nome}" cadastrado.`);
    limparFormProduto();
    renderProdutos();
    form.nome.focus();
  });

  $('#produto-cancelar').addEventListener('click', () => {
    limparFormProduto();
    $('#produto-nome').focus();
  });
  $('#produto-busca').addEventListener('input', renderProdutos);

  $('#lista-produtos').addEventListener('click', (e) => {
    const editar = e.target.closest('[data-editar-produto]');
    const excluir = e.target.closest('[data-excluir-produto]');
    if (editar) {
      const p = Dados.obterProduto(editar.dataset.editarProduto);
      if (!p) return;
      const form = $('#form-produto');
      form.id.value = p.id;
      form.nome.value = p.nome;
      form.preco.value = (p.preco / 100).toFixed(2).replace('.', ',');
      form.estoque.value = p.estoque;
      form.minimo.value = p.minimo;
      $('#produto-titulo-form').textContent = `Editando: ${p.nome}`;
      $('#produto-salvar').textContent = 'Salvar alterações';
      $('#produto-cancelar').hidden = false;
      form.scrollIntoView({ block: 'start' });
      form.nome.focus();
    }
    if (excluir) {
      const p = Dados.obterProduto(excluir.dataset.excluirProduto);
      if (!p || !confirm(`Excluir o produto "${p.nome}"? As vendas antigas continuam no histórico.`)) return;
      if (tentar(() => Dados.excluirProduto(p.id)).ok) {
        if ($('#form-produto').id.value === p.id) limparFormProduto();
        avisar(`"${p.nome}" excluído.`);
        renderProdutos();
      }
    }
  });

  // ---------------------------------------------------------------------
  // Clientes
  // ---------------------------------------------------------------------
  function formatarTelefone(digitos) {
    if (digitos.length === 11) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
    if (digitos.length === 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
    return digitos;
  }

  function renderClientes() {
    const clientes = Dados.listarClientes();
    const area = $('#lista-clientes');
    if (clientes.length === 0) {
      area.innerHTML = '<p class="vazio">Nenhum cliente cadastrado ainda.</p>';
      return;
    }
    area.innerHTML = `<div class="tabela-rolagem"><table>
      <caption>${plural(clientes.length, 'cliente', 'clientes')}</caption>
      <thead><tr><th scope="col">Cliente</th><th scope="col">Telefone</th><th scope="col" class="numero">Fiado em aberto</th><th scope="col"><span class="visualmente-oculto">Ações</span></th></tr></thead>
      <tbody>${clientes
        .map((c) => {
          const fiado = Dados.fiadoEmAberto(c.id);
          const zap = c.telefone
            ? `<a href="https://wa.me/55${esc(c.telefone)}" target="_blank" rel="noopener" aria-label="Abrir WhatsApp de ${esc(c.nome)}">${esc(formatarTelefone(c.telefone))}</a>`
            : '—';
          return `<tr>
            <td>${esc(c.nome)}</td>
            <td>${zap}</td>
            <td class="numero">${fiado ? `<span class="selo selo-alerta">${moeda(fiado)}</span>` : moeda(0)}</td>
            <td class="acoes">
              ${fiado ? `<button type="button" class="botao botao-pequeno botao-primario" data-receber="${esc(c.id)}" aria-label="Receber fiado de ${esc(c.nome)}">Receber</button>` : ''}
              <button type="button" class="botao botao-pequeno" data-editar-cliente="${esc(c.id)}" aria-label="Editar ${esc(c.nome)}">Editar</button>
              <button type="button" class="botao botao-pequeno botao-perigo" data-excluir-cliente="${esc(c.id)}" aria-label="Excluir ${esc(c.nome)}">Excluir</button>
            </td>
          </tr>`;
        })
        .join('')}</tbody>
    </table></div>`;
  }

  function limparFormCliente() {
    const form = $('#form-cliente');
    form.reset();
    form.id.value = '';
    $('#cliente-titulo-form').textContent = 'Novo cliente';
    $('#cliente-salvar').textContent = 'Cadastrar cliente';
    $('#cliente-cancelar').hidden = true;
  }

  $('#form-cliente').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const editando = Boolean(form.id.value);
    const r = tentar(() =>
      Dados.salvarCliente({
        id: form.id.value || undefined,
        nome: form.nome.value,
        telefone: form.telefone.value
      })
    );
    if (!r.ok) return;
    avisar(editando ? `"${r.valor.nome}" atualizado.` : `"${r.valor.nome}" cadastrado.`);
    limparFormCliente();
    renderClientes();
    form.nome.focus();
  });

  $('#cliente-cancelar').addEventListener('click', () => {
    limparFormCliente();
    $('#cliente-nome').focus();
  });

  $('#lista-clientes').addEventListener('click', (e) => {
    const editar = e.target.closest('[data-editar-cliente]');
    const excluir = e.target.closest('[data-excluir-cliente]');
    const receber = e.target.closest('[data-receber]');
    if (editar) {
      const c = Dados.obterCliente(editar.dataset.editarCliente);
      if (!c) return;
      const form = $('#form-cliente');
      form.id.value = c.id;
      form.nome.value = c.nome;
      form.telefone.value = formatarTelefone(c.telefone);
      $('#cliente-titulo-form').textContent = `Editando: ${c.nome}`;
      $('#cliente-salvar').textContent = 'Salvar alterações';
      $('#cliente-cancelar').hidden = false;
      form.scrollIntoView({ block: 'start' });
      form.nome.focus();
    }
    if (excluir) {
      const c = Dados.obterCliente(excluir.dataset.excluirCliente);
      if (!c || !confirm(`Excluir o cliente "${c.nome}"?`)) return;
      if (tentar(() => Dados.excluirCliente(c.id)).ok) {
        if ($('#form-cliente').id.value === c.id) limparFormCliente();
        avisar(`"${c.nome}" excluído.`);
        renderClientes();
      }
    }
    if (receber) {
      const c = Dados.obterCliente(receber.dataset.receber);
      const valor = c ? Dados.fiadoEmAberto(c.id) : 0;
      if (!c || !confirm(`Confirmar que ${c.nome} pagou ${moeda(valor)} de fiado?`)) return;
      const r = tentar(() => Dados.receberFiado(c.id));
      if (r.ok) {
        avisar(`Recebido ${moeda(r.valor)} de ${c.nome}.`);
        renderClientes();
      }
    }
  });

  // ---------------------------------------------------------------------
  // Histórico
  // ---------------------------------------------------------------------
  function periodoPadrao() {
    const hoje = Dados.diaLocal(new Date());
    if (!$('#filtro-de').value) $('#filtro-de').value = `${hoje.slice(0, 7)}-01`;
    if (!$('#filtro-ate').value) $('#filtro-ate').value = hoje;
  }

  function vendasFiltradas() {
    return Dados.listarVendas({ de: $('#filtro-de').value, ate: $('#filtro-ate').value });
  }

  function renderHistorico() {
    periodoPadrao();
    const vendas = vendasFiltradas();
    const validas = vendas.filter((v) => v.status !== 'cancelada');
    $('#historico-total').textContent =
      `${plural(validas.length, 'venda', 'vendas')} no período: ${moeda(validas.reduce((s, v) => s + v.total, 0))}`;

    const area = $('#lista-vendas');
    if (vendas.length === 0) {
      area.innerHTML = '<p class="vazio">Nenhuma venda neste período.</p>';
      return;
    }
    const selos = {
      paga: '<span class="selo selo-ok">Paga</span>',
      fiado: '<span class="selo selo-alerta">Fiado</span>',
      cancelada: '<span class="selo selo-perigo">Cancelada</span>'
    };
    area.innerHTML = `<div class="tabela-rolagem"><table>
      <thead><tr><th scope="col">Data</th><th scope="col">Itens</th><th scope="col">Cliente</th><th scope="col">Pagamento</th><th scope="col" class="numero">Total</th><th scope="col"><span class="visualmente-oculto">Ações</span></th></tr></thead>
      <tbody>${vendas
        .map((v) => `<tr${v.status === 'cancelada' ? ' class="cancelada"' : ''}>
          <td>${esc(dataHora(v.data))}</td>
          <td>${v.itens.map((i) => `${i.qtd}x ${esc(i.nome)}`).join('<br>')}</td>
          <td>${esc(v.clienteNome || 'Avulso')}</td>
          <td>${NOMES_PAGAMENTO[v.pagamento]} ${selos[v.status]}</td>
          <td class="numero">${moeda(v.total)}</td>
          <td class="acoes">${v.status !== 'cancelada'
            ? `<button type="button" class="botao botao-pequeno botao-perigo" data-cancelar="${esc(v.id)}" aria-label="Cancelar venda de ${esc(dataHora(v.data))}">Cancelar</button>`
            : ''}</td>
        </tr>`)
        .join('')}</tbody>
    </table></div>`;
  }

  $('#form-filtro').addEventListener('submit', (e) => {
    e.preventDefault();
    const de = $('#filtro-de').value;
    const ate = $('#filtro-ate').value;
    if (de && ate && de > ate) {
      avisar('A data "De" precisa ser anterior à data "Até".', 'erro');
      return;
    }
    renderHistorico();
  });

  $('#lista-vendas').addEventListener('click', (e) => {
    const botao = e.target.closest('[data-cancelar]');
    if (!botao || !confirm('Cancelar esta venda? Os produtos voltam para o estoque.')) return;
    if (tentar(() => Dados.cancelarVenda(botao.dataset.cancelar)).ok) {
      avisar('Venda cancelada e estoque devolvido.');
      renderHistorico();
    }
  });

  $('#exportar-vendas').addEventListener('click', () => {
    const vendas = vendasFiltradas();
    if (vendas.length === 0) {
      avisar('Não há vendas no período para baixar.', 'erro');
      return;
    }
    baixar(`caixa-facil-vendas-${Dados.diaLocal(new Date())}.csv`, Dados.vendasCSV(vendas), 'text/csv;charset=utf-8');
  });

  // ---------------------------------------------------------------------
  // Acessos
  // ---------------------------------------------------------------------
  function renderAcessos() {
    $('#acessos-central').textContent = CONFIG.LOG_ENDPOINT
      ? 'Os acessos de todos os aparelhos também são enviados para a planilha central do projeto.'
      : 'Registro central desativado: os acessos ficam apenas neste aparelho.';

    const acessos = Dados.listarAcessos();
    const area = $('#lista-acessos');
    if (acessos.length === 0) {
      area.innerHTML = '<p class="vazio">Nenhum acesso registrado.</p>';
      return;
    }
    area.innerHTML = `<div class="tabela-rolagem"><table>
      <caption>${plural(acessos.length, 'acesso', 'acessos')} neste aparelho</caption>
      <thead><tr><th scope="col">Data</th><th scope="col">Horário</th><th scope="col">Nome</th><th scope="col">Negócio</th><th scope="col">Evento</th><th scope="col">Aparelho</th></tr></thead>
      <tbody>${acessos
        .map((a) => {
          const d = new Date(a.data);
          return `<tr>
            <td>${d.toLocaleDateString('pt-BR')}</td>
            <td>${d.toLocaleTimeString('pt-BR')}</td>
            <td>${esc(a.nome)}</td>
            <td>${esc(a.negocio || '—')}</td>
            <td>${esc(a.evento)}</td>
            <td>${esc(a.dispositivo)}</td>
          </tr>`;
        })
        .join('')}</tbody>
    </table></div>`;
  }

  $('#exportar-acessos').addEventListener('click', () => {
    const acessos = Dados.listarAcessos();
    if (acessos.length === 0) {
      avisar('Não há acessos para baixar.', 'erro');
      return;
    }
    baixar(`caixa-facil-acessos-${Dados.diaLocal(new Date())}.csv`, Dados.acessosCSV(acessos), 'text/csv;charset=utf-8');
  });

  // ---------------------------------------------------------------------
  // Ajuda: cópia de segurança e limpeza
  // ---------------------------------------------------------------------
  $('#backup-exportar').addEventListener('click', () => {
    baixar(`caixa-facil-backup-${Dados.diaLocal(new Date())}.json`, Dados.exportarBackup(), 'application/json');
    avisar('Cópia de segurança baixada.');
  });

  $('#backup-importar').addEventListener('change', async (e) => {
    const arquivo = e.target.files[0];
    e.target.value = '';
    if (!arquivo) return;
    if (!confirm('Restaurar esta cópia? Os dados atuais deste aparelho serão substituídos.')) return;
    const conteudo = await arquivo.text();
    if (tentar(() => Dados.importarBackup(conteudo)).ok) {
      carrinho = [];
      mostrarAba('painel');
      avisar('Cópia de segurança restaurada.');
    }
  });

  $('#apagar-tudo').addEventListener('click', () => {
    if (!confirm('Apagar TODOS os produtos, clientes e vendas deste aparelho? Isso não pode ser desfeito.')) return;
    Dados.apagarTudo();
    carrinho = [];
    mostrarAba('painel');
    avisar('Todos os dados foram apagados.');
  });

  // ---------------------------------------------------------------------
  // Início
  // ---------------------------------------------------------------------
  if (CONFIG.FEEDBACK_URL) {
    $$('.link-feedback').forEach((a) => { a.href = CONFIG.FEEDBACK_URL; });
    $('#painel-feedback').hidden = false;
    $('#ajuda-feedback').hidden = false;
  }

  aplicarPreferencias();

  const sessao = local.ler(SESSAO);
  if (sessao && sessao.nome) {
    registrarAcesso(sessao, 'acesso');
    iniciarApp(sessao);
  } else {
    $('#tela-entrada').hidden = false;
  }
})();
