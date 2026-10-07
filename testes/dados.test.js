// Testes das regras de negócio do Caixa Fácil. Executar com: node testes/dados.test.js
const assert = require('assert');
const D = require('../js/dados.js');
const erro = (fn, re) => assert.throws(fn, re);

// dinheiro
assert.strictEqual(D.paraCentavos('12,50'), 1250);
assert.strictEqual(D.paraCentavos('1.234,56'), 123456);
assert.strictEqual(D.paraCentavos('7'), 700);
assert.strictEqual(D.paraCentavos('0.1'), 10);
assert.ok(Number.isNaN(D.paraCentavos('abc')));
assert.ok(Number.isNaN(D.paraCentavos('1,234')));

// produtos
const bolo = D.salvarProduto({ nome: 'Bolo', preco: '8,00', estoque: '5', minimo: '' });
assert.strictEqual(bolo.minimo, 0);
erro(() => D.salvarProduto({ nome: 'bolo', preco: '1', estoque: 1 }), /Já existe/);
erro(() => D.salvarProduto({ nome: 'X', preco: '0', estoque: 1 }), /maior que zero/);
erro(() => D.salvarProduto({ nome: 'X', preco: '1', estoque: '1.5' }), /inteiro/);
erro(() => D.salvarProduto({ nome: '  ', preco: '1', estoque: 1 }), /Preencha/);
const coxinha = D.salvarProduto({ nome: 'Coxinha', preco: '6', estoque: 3, minimo: 2 });

// clientes
const maria = D.salvarCliente({ nome: 'Maria', telefone: '(11) 98765-4321' });
assert.strictEqual(maria.telefone, '11987654321');
erro(() => D.salvarCliente({ nome: 'Ana', telefone: '123' }), /DDD/);

// vendas
erro(() => D.registrarVenda({ itens: [], pagamento: 'pix' }), /pelo menos um/);
erro(() => D.registrarVenda({ itens: [{ produtoId: bolo.id, qtd: 1 }], pagamento: 'fiado' }), /fiado/);
erro(() => D.registrarVenda({ itens: [{ produtoId: bolo.id, qtd: 4 }, { produtoId: bolo.id, qtd: 2 }], pagamento: 'pix' }), /insuficiente/);
assert.strictEqual(D.obterProduto(bolo.id).estoque, 5, 'estoque intacto após erro');

const v1 = D.registrarVenda({ itens: [{ produtoId: bolo.id, qtd: 2 }, { produtoId: coxinha.id, qtd: 1 }], pagamento: 'pix' });
assert.strictEqual(v1.total, 2200);
assert.strictEqual(D.obterProduto(bolo.id).estoque, 3);
const v2 = D.registrarVenda({ itens: [{ produtoId: coxinha.id, qtd: 2 }], clienteId: maria.id, pagamento: 'fiado' });
assert.strictEqual(v2.status, 'fiado');
assert.strictEqual(D.fiadoEmAberto(maria.id), 1200);
erro(() => D.excluirCliente(maria.id), /fiado em aberto/);

let r = D.resumo();
assert.strictEqual(r.hojeTotal, 3400);
assert.strictEqual(r.hojeQtd, 2);
assert.strictEqual(r.aReceber, 1200);
assert.strictEqual(r.ticketMedio, 1700);
assert.deepStrictEqual(r.estoqueBaixo.map(p => p.nome), ['Coxinha']);
assert.strictEqual(r.maisVendidos[0].nome, 'Coxinha');

assert.strictEqual(D.receberFiado(maria.id), 1200);
assert.strictEqual(D.fiadoEmAberto(maria.id), 0);

D.cancelarVenda(v1.id);
assert.strictEqual(D.obterProduto(bolo.id).estoque, 5);
erro(() => D.cancelarVenda(v1.id), /já foi cancelada/);
assert.strictEqual(D.resumo().hojeTotal, 1200);

// produto excluído: venda antiga mantém o nome e cancelar não quebra
D.excluirProduto(coxinha.id);
assert.strictEqual(D.listarVendas()[0].itens[0].nome, 'Coxinha');
D.cancelarVenda(v2.id);

// filtros de data
const hoje = D.diaLocal(new Date());
assert.strictEqual(D.listarVendas({ de: hoje, ate: hoje }).length, 2);
assert.strictEqual(D.listarVendas({ de: '2000-01-01', ate: '2000-01-02' }).length, 0);

// CSV com ; e aspas
D.salvarProduto({ nome: 'Pão "caseiro"; grande', preco: '3', estoque: 5 });
const csv = D.vendasCSV(D.listarVendas());
assert.ok(csv.startsWith('\uFEFFData;Hora;'));

// acessos
const a = D.registrarAcesso({ nome: 'Teste', negocio: '', evento: 'primeiro acesso' });
assert.ok(a.dispositivo.includes('Computador'));
assert.strictEqual(D.listarAcessos().length, 1);
assert.ok(D.acessosCSV(D.listarAcessos()).includes('Teste'));

// backup
const b = D.exportarBackup();
D.apagarTudo();
assert.strictEqual(D.listarProdutos().length, 0);
D.importarBackup(b);
assert.strictEqual(D.listarProdutos().length, 2);
erro(() => D.importarBackup('{"x":1}'), /inválido/);
erro(() => D.importarBackup('lixo'), /inválido/);

// exemplos idempotentes
D.apagarTudo();
assert.strictEqual(D.carregarExemplo(), 7);
assert.strictEqual(D.carregarExemplo(), 0);
console.log('OK: todas as regras de negócio passaram');
