/**
 * Caixa Fácil — registro central de acessos (Google Apps Script).
 *
 * Recebe os acessos enviados pelo app e grava uma linha por acesso na
 * aba "Acessos" da planilha. A data e o horário usados são os do servidor
 * do Google (no fuso da planilha), não os do aparelho do usuário.
 *
 * Instalação: veja docs/registro-de-acessos.md.
 */

const NOME_ABA = 'Acessos';
const CABECALHO = ['Data', 'Horário', 'Nome', 'Tipo de negócio', 'Evento', 'Aparelho'];

function doPost(e) {
  const trava = LockService.getScriptLock();
  trava.waitLock(10000);
  try {
    const dados = JSON.parse(e.postData.contents);
    const planilha = SpreadsheetApp.getActiveSpreadsheet();
    const fuso = planilha.getSpreadsheetTimeZone();
    const agora = new Date();

    let aba = planilha.getSheetByName(NOME_ABA);
    if (!aba) {
      aba = planilha.insertSheet(NOME_ABA);
      aba.appendRow(CABECALHO);
      aba.getRange(1, 1, 1, CABECALHO.length).setFontWeight('bold');
      aba.setFrozenRows(1);
    }

    aba.appendRow([
      Utilities.formatDate(agora, fuso, 'dd/MM/yyyy'),
      Utilities.formatDate(agora, fuso, 'HH:mm:ss'),
      limpar(dados.nome),
      limpar(dados.negocio),
      limpar(dados.evento),
      limpar(dados.dispositivo)
    ]);
    return ContentService.createTextOutput('ok');
  } catch (erro) {
    return ContentService.createTextOutput('erro');
  } finally {
    trava.releaseLock();
  }
}

/** Permite testar o endereço no navegador. */
function doGet() {
  return ContentService.createTextOutput('Caixa Fácil: registro de acessos ativo.');
}

/** Limita o tamanho e impede que um texto seja interpretado como fórmula. */
function limpar(valor) {
  const texto = String(valor || '').slice(0, 80);
  return /^[=+\-@]/.test(texto) ? "'" + texto : texto;
}
