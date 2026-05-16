# Gerador de Etiquedas e de Autorização de Retirada de Encomenda por Terceiros para os Correios

Aplicação web para geração de etiquetas postais dos Correios e documentos de autorização de retirada, com prévia na tela, impressão direta pelo navegador e exportação em PDF.

---

## Funcionalidades

### Etiqueta Postal (`/`)

- Formulário com preenchimento automático de endereço via **CEP** (integração com ViaCEP)
- Campos para **Destinatário** e **Remetente** com todos os dados de endereço
- Opção de adicionar o **Selo de Registro Módico**
- Prévia ao vivo no formulário
- Página de impressão no padrão dos Correios:
  - Seção "USO EXCLUSIVO DOS CORREIOS" com marcas de corte
  - Cabeçalho **DESTINATÁRIO** com código de barras e QR Code
  - Dados do remetente com CEP, cidade e estado
- **Imprimir** via diálogo do navegador (layout A4 paisagem)
- **Baixar PDF** — gera arquivo A4 paisagem com o label posicionado na metade direita da folha
- Dados persistidos em **localStorage** (sobrevivem ao recarregamento da página)
- Botão **Limpar** que apaga o formulário e o localStorage

### Autorização de Retirada de Encomenda por Terceiros (`/autorizacao`)

- Formulário com os dados da pessoa autorizada, objeto, remetente e destinatário
- Formatação automática de CPF e RG
- Data formatada em português brasileiro (ex.: _29 de Outubro de 2025_)
- Prévia ao vivo do documento
- **Imprimir** via diálogo do navegador
- **Baixar PDF** — mesmo posicionamento do PDF da etiqueta (A4 paisagem, conteúdo à direita)
- Dados persistidos em **localStorage**
- Botão **Limpar**

---

## Tecnologias

| Pacote                                                       | Uso                                     |
| ------------------------------------------------------------ | --------------------------------------- |
| [Next.js 15](https://nextjs.org/)                            | Framework React com App Router          |
| [React 19](https://react.dev/)                               | Interface                               |
| [TypeScript 5](https://www.typescriptlang.org/)              | Tipagem estática                        |
| [react-barcode](https://www.npmjs.com/package/react-barcode) | Geração de código de barras (CODE128)   |
| [qrcode.react](https://www.npmjs.com/package/qrcode.react)   | Geração de QR Code                      |
| [html2canvas](https://html2canvas.hertzen.com/)              | Captura do HTML renderizado para imagem |
| [jsPDF](https://www.npmjs.com/package/jspdf)                 | Geração do arquivo PDF                  |
| [lucide-react](https://lucide.dev/)                          | Ícones                                  |

---

## Estrutura do Projeto

```
gerador-etiquetas/
├── app/
│   ├── layout.tsx           # Layout raiz (metadados, fonte global)
│   ├── page.tsx             # Página de etiqueta postal
│   ├── globals.css          # Estilos globais e @media print
│   └── autorizacao/
│       └── page.tsx         # Página de autorização de retirada
├── package.json
└── tsconfig.json
```

---

## Como Executar

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

```bash
git clone <url-do-repositorio>
cd gerador-etiquetas
npm install
```

### Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Build de Produção

```bash
npm run build
npm run start
```

---

## Como Usar

### Etiqueta Postal

1. Acesse a página inicial (`/`)
2. Preencha o **CEP** do destinatário — os campos de endereço são preenchidos automaticamente
3. Preencha o endereço do **Remetente** da mesma forma
4. Marque **Registro Módico** se necessário
5. Clique em **Ver impressão**
6. Na tela de impressão, escolha:
   - **Imprimir** — abre o diálogo de impressão do navegador (A4 paisagem)
   - **Baixar PDF** — salva o arquivo `etiqueta.pdf`
   - **Editar dados** — volta ao formulário com os dados preservados

### Autorização de Retirada

1. Acesse `/autorizacao` pelo menu superior
2. Preencha os dados da pessoa autorizada (nome, RG, CPF)
3. Informe o número do objeto, o remetente, cidade e data
4. Preencha os dados de quem autoriza (destinatário)
5. Clique em **Ver impressão**
6. Escolha **Imprimir** ou **Baixar PDF** (`autorizacao.pdf`)

### Persistência de Dados

Os dados de ambos os formulários são salvos automaticamente no `localStorage` do navegador. Ao recarregar a página, os campos são restaurados. Use o botão **Limpar** para apagar tudo e recomeçar.

---

## Comportamento de Impressão

O CSS define `@page { size: A4 landscape; margin: 0; }` para a etiqueta postal. O conteúdo imprimível ocupa a metade direita da folha A4 paisagem, deixando a metade esquerda em branco — padrão adotado pelos Correios para inclusão de informações de roteamento.

O PDF gerado replica exatamente esse layout via captura do HTML com `html2canvas` e inserção na posição equivalente em um documento `jsPDF`.
