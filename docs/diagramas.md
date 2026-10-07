# Diagramas do Caixa Fácil

Os diagramas abaixo são escritos em [Mermaid](https://mermaid.js.org/), que o GitHub desenha automaticamente.

## 1. Diagrama de casos de uso (UML)

```mermaid
flowchart LR
    E(["👤 Empreendedor(a)"])
    G[("Planilha de acessos<br/>Google Apps Script")]

    subgraph S["Sistema Caixa Fácil"]
        UC1(["Entrar no sistema"])
        UC2(["Registrar acesso"])
        UC3(["Manter produtos"])
        UC4(["Manter clientes"])
        UC5(["Registrar venda"])
        UC6(["Calcular troco"])
        UC7(["Receber fiado"])
        UC8(["Cancelar venda"])
        UC9(["Consultar painel"])
        UC10(["Consultar histórico e exportar CSV"])
        UC11(["Consultar acessos"])
        UC12(["Fazer / restaurar backup"])
        UC13(["Avaliar o app"])
    end

    E --- UC1 & UC3 & UC4 & UC5 & UC7 & UC8 & UC9 & UC10 & UC11 & UC12 & UC13
    UC1 -.->|"«include»"| UC2
    UC6 -.->|"«extend»"| UC5
    UC2 --- G
```

## 2. Diagrama de classes (UML)

```mermaid
classDiagram
    direction LR
    class Produto {
        +String id
        +String nome
        +int preco
        +int estoque
        +int minimo
        +String criadoEm
    }
    class Cliente {
        +String id
        +String nome
        +String telefone
        +String criadoEm
        +fiadoEmAberto() int
    }
    class Venda {
        +String id
        +String data
        +String pagamento
        +String status
        +int total
        +String clienteNome
        +cancelar()
    }
    class ItemVenda {
        +String produtoId
        +String nome
        +int preco
        +int qtd
    }
    class Acesso {
        +String id
        +String nome
        +String negocio
        +String evento
        +String data
        +String dispositivo
    }

    Venda "1" *-- "1..*" ItemVenda : contém
    ItemVenda "*" --> "1" Produto : refere-se a
    Venda "*" --> "0..1" Cliente : comprada por
    note for Produto "Valores em centavos (inteiros)"
    note for Venda "pagamento: dinheiro, pix, cartao ou fiado<br/>status: paga, fiado ou cancelada"
```

## 3. Diagrama de sequência: registrar uma venda (UML)

```mermaid
sequenceDiagram
    actor U as Empreendedor(a)
    participant I as Interface (app.js)
    participant D as Regras de negócio (dados.js)
    participant L as localStorage

    U->>I: Escolhe produto e quantidade
    I->>D: obterProduto(id)
    D-->>I: produto (preço, estoque)
    I-->>U: Item adicionado ao carrinho
    U->>I: Escolhe pagamento e clica "Finalizar venda"
    I->>D: registrarVenda(itens, cliente, pagamento)
    alt fiado sem cliente ou estoque insuficiente
        D-->>I: erro de validação
        I-->>U: Mensagem explicando o problema
    else dados válidos
        D->>D: baixa o estoque e calcula o total
        D->>L: salvar()
        D-->>I: venda registrada
        I-->>U: "Venda de R$ X registrada"
    end
```

## 4. Processo da atividade extensionista (BPMN simplificado)

```mermaid
flowchart LR
    A((Início)) --> B[Identificar o problema<br/>dos pequenos empreendedores]
    B --> C[Levantar requisitos<br/>e escolher ODS 8 e 10]
    C --> D[Desenvolver o Caixa Fácil<br/>HTML, CSS e JavaScript]
    D --> E[Testar e publicar<br/>no GitHub Pages]
    E --> F[Apresentar o app<br/>às pessoas da comunidade]
    F --> G[Pessoas usam o app<br/>no próprio celular]
    G --> H{Avaliaram<br/>no formulário?}
    H -- Não --> I[Reforçar o convite<br/>e tirar dúvidas]
    I --> G
    H -- Sim --> J[Reunir feedbacks e<br/>registros de acesso]
    J --> K[Ajustar o app<br/>com base no retorno]
    K --> L[Relatório final]
    L --> M((Fim))
```
