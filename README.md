# NOVA AI STUDIO

Plataforma web e desktop para criação multimédia assistida por IA e desenvolvimento por prompts.

## O que já existe nesta fundação
- Interface React/TypeScript em português.
- NOVA Build Studio inspirado no fluxo de construção por prompt: explorador visual, chat multimodelo e painel de preview/código.
- NOVA Photo Lab com edição de imagem no browser e exportação PNG/JPEG.
- Importação local de vídeo, áudio e imagem, com pré-visualização.
- Biblioteca de media e timeline inicial com pistas de vídeo e áudio.
- Ajustes básicos por clip: ponto de entrada/saída, velocidade, volume e filtros visuais.
- Operações iniciais de edição inspiradas em fluxos de editores como CapCut: dividir vídeo/áudio no cursor de reprodução, duplicar clips e reordenar clips dentro da respetiva pista.
- Primeiro pipeline de renderização MP4 com FFmpeg no servidor local: exporta o vídeo selecionado com corte, velocidade, volume, filtros básicos, resolução 720p/1080p e 24/30/60 FPS.
- O instalador Windows inclui o binário FFmpeg como recurso da aplicação.
- Camada de título/legenda com texto, cor e tamanho configuráveis.
- NOVA Build Studio com estrutura visual de projecto, painel de conversa multimodelo e áreas de pré-visualização/código em preparação.
- NOVA Photo Lab com importação local, luminosidade, contraste, saturação, desfoque, rotação, espelhamento, cortes predefinidos e exportação PNG/JPEG.
- Shell Electron e configuração NSIS para instalador Windows.
- GitHub Actions para compilar o instalador em Windows quando há alterações na branch main ou tags v*.

## Ainda em desenvolvimento
Esta versão ainda não é uma plataforma equivalente ao Google AI Studio nem um editor profissional completo. O Build Studio tem a estrutura de interface, mas o agente ainda não cria/edita ficheiros automaticamente, não executa comandos e não mantém um preview vivo. O Photo Lab já aplica ajustes locais e exporta PNG/JPEG, mas ainda não tem camadas, máscaras, seleções avançadas, texto, retoque, RAW ou edição não destrutiva. O editor de vídeo já permite dividir clips de vídeo/áudio no cursor de reprodução, duplicar e reordenar clips por pista, além dos ajustes básicos. A renderização inicial exporta apenas o clip de vídeo selecionado; ainda não compõe automaticamente todos os clips da timeline num único filme. Continuam por implementar transições reais, keyframes, legendas automáticas, chroma key, mistura multipista e composição avançada. Geração de vídeo/imagem, avatares, lip-sync, voz, música e colaboração precisam de integrações e testes reais.

## Requisitos
- Node.js 20+
- npm 10+
- Windows 10/11 para empacotar o instalador

## Desenvolvimento
```bash
npm install
npm run dev
```

A aplicação web abre em http://localhost:5173. A API local usa http://127.0.0.1:8787. O motor FFmpeg processa os vídeos localmente, sem os enviar para um fornecedor externo. A renderização inicial tem limite de 2 GB por ficheiro e 15 minutos por tarefa.

## Desktop
```bash
npm run desktop
npm run dist:win
```

O instalador Windows é produzido pelo Electron Builder em `release/`.

## Integrações de IA
A API tem adaptadores iniciais de chat para OpenAI, Google Gemini e Anthropic. O utilizador fornece o ID do modelo ativo na sua conta e a respetiva chave. As chamadas usam os endpoints oficiais dos fornecedores. As chaves são enviadas no corpo do pedido ao serviço local e encaminhadas no servidor; não são gravadas em ficheiros, localStorage ou logs. A chave Gemini é enviada num cabeçalho HTTP, não no URL.

Para produção, colocar o gateway atrás de autenticação e HTTPS, implementar gestão segura de credenciais, limites de utilização, auditoria e proteção contra abuso. Nunca colocar chaves de API em código-fonte ou no repositório.

## Compilação automática
O workflow `.github/workflows/windows-installer.yml` executa verificação TypeScript, build e empacotamento NSIS em runner Windows. O instalador só estará disponível como artefacto depois de uma execução concluída com sucesso.

## Separação de projetos
Este repositório é exclusivo do NOVA AI STUDIO. Não contém credenciais nem integrações do NOVA Táxi, NOVA KZ ou KONECTA.
