import { useEffect, useMemo, useRef, useState } from "react";
import { Aperture, AudioLines, Bot, Code2, Download, Film, FolderOpen, ImagePlus, Layers3, Mic2, MonitorPlay, Plus, Scissors, Settings2, Sparkles, Upload, WandSparkles, RotateCcw, RotateCw, FlipHorizontal, SlidersHorizontal, Eye, Files, TerminalSquare, MessageSquare, Image as ImageIcon } from "lucide-react";

type Clip = { id: string; name: string; url: string; kind: string; duration: number; trimStart: number; trimEnd: number; volume: number; speed: number; effect: string };
type Provider = "openai" | "google" | "anthropic";

const modules = [
  { id: "developer", label: "NOVA Build Studio", icon: Code2 },
  { id: "editor", label: "Editor de vídeo", icon: Film },
  { id: "photo-editor", label: "Editor de fotografias", icon: ImageIcon },
  { id: "image", label: "Geração de imagem IA", icon: ImagePlus },
  { id: "video", label: "Vídeo IA", icon: WandSparkles },
  { id: "voice", label: "Estúdio de voz", icon: Mic2 },
  { id: "assets", label: "Biblioteca", icon: FolderOpen }
];

export default function App() {
  const [active, setActive] = useState("developer");
  const [clips, setClips] = useState<Clip[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Pronto para criar");
  const [duration, setDuration] = useState(0);
  const [titleText, setTitleText] = useState("");
  const [titleColor, setTitleColor] = useState("#ffffff");
  const [titleSize, setTitleSize] = useState(34);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const selectedClip = useMemo(() => clips.find(c => c.id === selected), [clips, selected]);

  function importFiles(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files).map(file => {
      const url = URL.createObjectURL(file);
      return { id: crypto.randomUUID(), name: file.name, url, kind: file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image", duration: 12, trimStart: 0, trimEnd: 12, volume: 1, speed: 1, effect: "none" };
    });
    setClips(old => [...old, ...added]);
    if (added[0]) setSelected(added[0].id);
    setStatus(added.length + " ficheiro(s) importado(s)");
  }

  function patchClip(id: string, patch: Partial<Clip>) { setClips(old => old.map(c => c.id === id ? { ...c, ...patch } : c)); }

  async function askAI() {
    if (!apiKey.trim() || !prompt.trim()) { setStatus("Introduz a chave e o pedido."); return; }
    setBusy(true); setAnswer(""); setStatus("A contactar " + provider + "…");
    try {
      const apiBase = window.location.protocol === "file:" ? "http://127.0.0.1:8787" : "";
      const response = await fetch(apiBase + "/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, model: model.trim() || undefined, prompt })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha no fornecedor");
      setAnswer(data.text || "O fornecedor não devolveu texto.");
      setStatus("Resposta recebida");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erro ao contactar IA");
    } finally { setBusy(false); setApiKey(""); }
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Aperture size={22}/></div><div><strong>NOVA <span>AI</span> STUDIO</strong><small>CREATE WITHOUT LIMITS</small></div></div>
      <div className="project-name"><span className="live-dot"/> Projeto sem título <span className="saved">● Local</span></div>
      <div className="top-actions"><button className="ghost"><Settings2 size={16}/> Definições</button><button className="primary" onClick={() => setStatus("Exportação de vídeo será ativada numa etapa seguinte.")}>Exportar projeto</button></div>
    </header>
    <div className="workspace">
      <aside className="sidebar">
        <div className="side-label">WORKSPACE</div>
        {modules.map(m => <button key={m.id} className={"nav-item " + (active === m.id ? "active" : "")} onClick={() => setActive(m.id)}><m.icon size={18}/>{m.label}</button>)}
        <div className="side-bottom"><div className="side-label">NOVA AI</div><div className="plan-card"><Sparkles size={17}/><b>Studio multimodelo</b><p>Liga os teus fornecedores oficiais de IA.</p><button onClick={() => setActive("settings")}>Configurar IA</button></div><div className="version">NOVA AI STUDIO · Preview 0.1</div></div>
      </aside>
      <main className="main">
        {active === "editor" && <section className="editor-view">
          <div className="section-heading"><div><span className="eyebrow">POST-PRODUÇÃO</span><h1>Editor de vídeo</h1><p>Organiza os teus conteúdos numa linha temporal multipista.</p></div><button className="outline" onClick={() => fileRef.current?.click()}><Upload size={16}/> Importar media</button><input ref={fileRef} type="file" accept="video/*,audio/*,image/*" multiple hidden onChange={e => importFiles(e.target.files)}/></div>
          <div className="editor-grid">
            <div className="preview-panel">
              <div className="panel-top"><span><MonitorPlay size={15}/> PRÉ-VISUALIZAÇÃO</span><span>16:9 · 1080p</span></div>
              <div className="preview-stage">
                <div className="preview-canvas">
                  {selectedClip?.kind === "video" ? <video ref={videoRef} src={selectedClip.url} controls onLoadedMetadata={e => { const d = e.currentTarget.duration; setDuration(d); patchClip(selectedClip.id, { duration: d, trimEnd: d }); e.currentTarget.currentTime = selectedClip.trimStart; e.currentTarget.playbackRate = selectedClip.speed; e.currentTarget.volume = selectedClip.volume; }} onTimeUpdate={e => { if (e.currentTarget.currentTime >= selectedClip.trimEnd) { e.currentTarget.pause(); e.currentTarget.currentTime = selectedClip.trimStart; } }} style={{ filter: effectFilter(selectedClip.effect), objectFit: "contain" }} /> : selectedClip?.kind === "image" ? <img src={selectedClip.url} alt={selectedClip.name} style={{ filter: effectFilter(selectedClip.effect) }}/> : selectedClip?.kind === "audio" ? <div className="audio-preview"><AudioLines size={42}/><b>{selectedClip.name}</b><audio ref={audioRef} src={selectedClip.url} controls onLoadedMetadata={e => { e.currentTarget.volume = selectedClip.volume; e.currentTarget.playbackRate = selectedClip.speed; }} /></div> : <div className="empty-preview"><Film size={42}/><b>O teu próximo projeto começa aqui</b><span>Importa vídeos, imagens ou áudio para a timeline.</span><button className="primary" onClick={() => fileRef.current?.click()}><Plus size={15}/> Adicionar media</button></div>}
                </div>
                {titleText.trim() && <div className="title-overlay" style={{ color: titleColor, fontSize: titleSize + "px" }}>{titleText}</div>}
              </div>
              <div className="preview-controls"><span>{selectedClip?.name || "Nenhum clip selecionado"}</span><span>{duration ? duration.toFixed(1) + "s" : "00:00:00"}</span></div>
            </div>
            <div className="inspector"><div className="panel-top"><span><Layers3 size={15}/> INSPECTOR</span><Settings2 size={15}/></div>{selectedClip ? <><div className="asset-thumb">{selectedClip.kind === "image" ? <img src={selectedClip.url} alt=""/> : <Film/>}</div><b className="asset-name">{selectedClip.name}</b><div className="property"><span>Tipo</span><b>{selectedClip.kind}</b></div><div className="property"><span>Duração original</span><b>{selectedClip.duration.toFixed(1)}s</b></div><div className="edit-controls"><label>Início (seg.)<input type="number" min="0" max={selectedClip.duration} step="0.1" value={selectedClip.trimStart} onChange={e => patchClip(selectedClip.id, { trimStart: Math.min(Number(e.target.value), selectedClip.trimEnd - 0.1) })}/></label><label>Fim (seg.)<input type="number" min={selectedClip.trimStart + 0.1} max={selectedClip.duration} step="0.1" value={selectedClip.trimEnd} onChange={e => patchClip(selectedClip.id, { trimEnd: Math.min(selectedClip.duration, Math.max(Number(e.target.value), selectedClip.trimStart + 0.1)) })}/></label><label>Velocidade<select value={selectedClip.speed} onChange={e => { const speed = Number(e.target.value); patchClip(selectedClip.id, { speed }); if (videoRef.current) videoRef.current.playbackRate = speed; if (audioRef.current) audioRef.current.playbackRate = speed; }}><option value="0.5">0,5×</option><option value="0.75">0,75×</option><option value="1">1×</option><option value="1.25">1,25×</option><option value="1.5">1,5×</option><option value="2">2×</option></select></label><label>Volume<select value={selectedClip.volume} onChange={e => { const volume = Number(e.target.value); patchClip(selectedClip.id, { volume }); if (videoRef.current) videoRef.current.volume = volume; if (audioRef.current) audioRef.current.volume = volume; }}><option value="0">Mudo</option><option value="0.25">25%</option><option value="0.5">50%</option><option value="0.75">75%</option><option value="1">100%</option></select></label><label className="full-field">Efeito visual<select value={selectedClip.effect} onChange={e => patchClip(selectedClip.id, { effect: e.target.value })}><option value="none">Original</option><option value="mono">Preto e branco</option><option value="warm">Quente</option><option value="cool">Frio</option><option value="vivid">Cores vivas</option><option value="cinema">Cinema</option><option value="soft">Suave</option></select></label></div><div className="property"><span>Duração editada</span><b>{Math.max(0, selectedClip.trimEnd - selectedClip.trimStart).toFixed(1)}s</b></div><button className="danger subtle" onClick={() => { setClips(old => old.filter(c => c.id !== selected)); setSelected(null); }}>Remover clip</button></> : <div className="inspector-empty">Seleciona um clip na biblioteca ou timeline para editar as suas propriedades.</div>}</div>
          </div>
          <div className="title-tools"><div><b>Camada de texto</b><span>Pré-visualização do título sobre o vídeo</span></div><input value={titleText} onChange={e => setTitleText(e.target.value)} placeholder="Escreve o título ou legenda…"/><label>Cor <input type="color" value={titleColor} onChange={e => setTitleColor(e.target.value)}/></label><label>Tamanho <input type="range" min="16" max="72" value={titleSize} onChange={e => setTitleSize(Number(e.target.value))}/></label><button className="ghost" onClick={() => setTitleText("")}>Limpar</button></div>
          <div className="timeline"><div className="timeline-head"><div><b><Scissors size={15}/> TIMELINE</b><span>{clips.length} media · {clips.length} pista(s)</span></div><button className="icon-button" onClick={() => fileRef.current?.click()}><Plus size={17}/></button></div><div className="ruler"><span>00:00</span><span>00:10</span><span>00:20</span><span>00:30</span><span>00:40</span><span>00:50</span></div><div className="track"><div className="track-label">VÍDEO 1</div><div className="track-content">{clips.filter(c => c.kind !== "audio").map(c => <button key={c.id} className={"clip video-clip " + (selected === c.id ? "chosen" : "")} onClick={() => setSelected(c.id)}>{c.kind === "image" ? <ImagePlus size={13}/> : <Film size={13}/>}<span>{c.name}</span><small>{Math.max(0, c.trimEnd - c.trimStart).toFixed(1)}s</small></button>)}</div></div><div className="track"><div className="track-label">ÁUDIO 1</div><div className="track-content">{clips.filter(c => c.kind === "audio").map(c => <button key={c.id} className={"clip audio-clip " + (selected === c.id ? "chosen" : "")} onClick={() => setSelected(c.id)}><AudioLines size={13}/><span>{c.name}</span><small>{Math.max(0, c.trimEnd - c.trimStart).toFixed(1)}s</small></button>)}</div></div></div>
          <div className="media-library"><div className="library-title"><b><FolderOpen size={16}/> Biblioteca de media</b><span>{clips.length} itens</span></div>{clips.length ? <div className="asset-list">{clips.map(c => <button key={c.id} className={"asset-row " + (selected === c.id ? "chosen" : "")} onClick={() => setSelected(c.id)}><span className="asset-icon">{c.kind === "audio" ? <AudioLines/> : c.kind === "image" ? <ImagePlus/> : <Film/>}</span><span>{c.name}</span><small>{c.kind}</small></button>)}</div> : <div className="library-empty" onClick={() => fileRef.current?.click()}><Upload size={19}/> Arrasta os teus ficheiros para aqui ou clica para importar</div>}</div>
        </section>}
        {active === "developer" && <section className="build-studio">
          <div className="build-heading"><div><span className="eyebrow">NOVA AI DEVELOPMENT ENVIRONMENT</span><h1>Build Studio</h1><p>Descreve a tua ideia, conversa com os modelos e acompanha o trabalho num espaço de desenvolvimento.</p></div><div className="build-heading-actions"><span className="connection-state"><i/> Ambiente local</span><button className="outline" onClick={() => { setPrompt(""); setAnswer(""); setStatus("Nova conversa iniciada"); }}>＋ Nova conversa</button></div></div>
          <div className="build-layout">
            <aside className="build-projects">
              <div className="build-panel-label"><Files size={14}/> PROJECTOS</div>
              <button className="project-create" onClick={() => setStatus("Novo projecto: descreve-o no campo de instruções.")}>＋ Criar projecto</button>
              <div className="project-tree"><span className="tree-active"><FolderOpen size={14}/> projecto-actual</span><span><Code2 size={13}/> src/</span><span><Code2 size={13}/> server/</span><span><Files size={13}/> package.json</span><span><Files size={13}/> README.md</span></div>
              <div className="build-project-footer"><span>WORKSPACE</span><b>NOVA AI STUDIO</b><small>O explorador é uma estrutura visual inicial; edição de ficheiros pelo agente ainda será implementada.</small></div>
            </aside>
            <div className="build-chat">
              <div className="build-chat-top"><div><Bot size={17}/><b>Assistente NOVA</b><span className="pill">MULTIMODELO</span></div><span className="chat-context">Contexto do projecto</span></div>
              <div className="build-conversation">
                {!answer && <div className="build-welcome"><div className="welcome-orb"><Sparkles size={24}/></div><h2>O que vamos construir?</h2><p>Descreve uma aplicação, uma funcionalidade ou pede ajuda para resolver um problema técnico.</p><div className="prompt-ideas"><button onClick={() => setPrompt("Cria uma aplicação web moderna com autenticação, painel administrativo e base de dados.")}>Criar uma aplicação completa</button><button onClick={() => setPrompt("Analisa a arquitectura deste projecto e propõe melhorias de segurança e desempenho.")}>Analisar este projecto</button><button onClick={() => setPrompt("Cria uma interface profissional e responsiva para um produto SaaS.")}>Desenhar uma interface</button></div></div>}
                {answer && <div className="assistant-response"><div className="response-author"><Bot size={15}/> Resposta do modelo</div><pre className="ai-answer">{answer}</pre><small>Esta versão recebe respostas de chat. Alteração automática de ficheiros, execução de comandos e testes do agente ainda não estão ligados.</small></div>}
              </div>
              <div className="build-composer">
                <div className="composer-options"><label>Fornecedor <ProviderSelect provider={provider} setProvider={setProvider}/><input className="model-input" value={model} onChange={e => setModel(e.target.value)} placeholder="ID do modelo"/></label><label className="key-entry">Chave API <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Chave oficial do fornecedor"/></label></div>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Descreve o que queres criar ou alterar neste projecto…"/>
                <div className="composer-bottom"><span><MessageSquare size={13}/> As chaves são usadas apenas neste pedido</span><button className="primary" disabled={busy} onClick={askAI}><Sparkles size={15}/>{busy ? "A processar…" : "Executar pedido"}</button></div>
              </div>
            </div>
            <aside className="build-preview">
              <div className="preview-tabs"><button className="selected"><Eye size={14}/> Pré-visualização</button><button onClick={() => setStatus("O painel de código será ligado ao explorador numa etapa seguinte.")}><Code2 size={14}/> Código</button></div>
              <div className="preview-browser"><span>● ● ●</span><small>localhost · preview</small><span>↗</span></div>
              <div className="preview-placeholder"><div className="preview-placeholder-icon"><MonitorPlay size={27}/></div><b>Pré-visualização da aplicação</b><p>Quando o agente de construção e o executor estiverem ligados, a aplicação será apresentada aqui.</p><button className="outline" onClick={() => setStatus("Pré-visualização ainda não ligada a um servidor de projectos.")}>Abrir ambiente</button></div>
              <div className="preview-bottom"><span><TerminalSquare size={13}/> TERMINAL</span><small>Aguardando execução</small></div>
            </aside>
          </div>
        </section>}
        {active === "photo-editor" && <PhotoEditor />}
        {["image","video","voice","assets","settings"].includes(active) && <section className="tool-view"><span className="eyebrow">NOVA CREATIVE SUITE</span><h1>{modules.find(m => m.id === active)?.label || "Definições de IA"}</h1><p>Este módulo está previsto na arquitetura do NOVA AI STUDIO.</p><div className="feature-grid">{(active === "video" ? ["Texto para vídeo","Imagem para vídeo","Transformação de vídeo","Avatares realistas"] : active === "voice" ? ["Texto para voz","Clonagem autorizada de voz","Dobragem e tradução","Sincronização labial"] : active === "image" ? ["Imagem por prompt","Edição generativa","Personagens e cenários","Design publicitário"] : active === "assets" ? ["Projetos","Media importada","Modelos e presets","Exportações"] : ["OpenAI","Google Gemini","Anthropic","Mais fornecedores"]).map(item => <div className="feature-card" key={item}><Sparkles size={18}/><b>{item}</b><span>Em integração</span></div>)}</div><div className="notice"><Bot size={18}/><span>Este módulo ainda não executa gerações reais. Será ligado a fornecedores e serviços compatíveis após implementação e testes.</span></div></section>}
      </main>
    </div>
    <footer className="statusbar"><span><span className="live-dot"/>{status}</span><span>Web + Windows Desktop · {clips.length} media no projeto</span></footer>
  </div>;
}

function PhotoEditor() {
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState("");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState(false);
  const [crop, setCrop] = useState("original");
  const [format, setFormat] = useState("image/png");
  const [quality, setQuality] = useState(92);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!source) return;
    const image = new Image();
    image.onload = () => { imageRef.current = image; draw(); };
    image.src = source;
  }, [source]);

  useEffect(() => { if (imageRef.current) draw(); }, [brightness, contrast, saturation, blur, rotation, flip, crop]);

  function draw() {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;
    let sw = image.naturalWidth, sh = image.naturalHeight;
    const ratio = crop === "square" ? 1 : crop === "landscape" ? 16/9 : crop === "portrait" ? 4/5 : 0;
    if (ratio) {
      if (sw / sh > ratio) { const nw = sh * ratio; sw = nw; }
      else { const nh = sw / ratio; sh = nh; }
    }
    const quarter = Math.abs(rotation % 180) === 90;
    canvas.width = Math.max(1, Math.round(quarter ? sh : sw));
    canvas.height = Math.max(1, Math.round(quarter ? sw : sh));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(flip ? -1 : 1, 1);
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;
    ctx.drawImage(image, (image.naturalWidth-sw)/2, (image.naturalHeight-sh)/2, sw, sh, -sw/2, -sh/2, sw, sh);
    ctx.restore();
  }

  function importPhoto(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => { setSource(String(reader.result)); setFileName(file.name); resetAdjustments(); };
    reader.readAsDataURL(file);
  }
  function resetAdjustments() { setBrightness(100); setContrast(100); setSaturation(100); setBlur(0); setRotation(0); setFlip(false); setCrop("original"); }
  function exportPhoto() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = (fileName.replace(/\\.[^.]+$/, "") || "nova-editada") + (format === "image/jpeg" ? ".jpg" : ".png");
      a.click(); URL.revokeObjectURL(url);
    }, format, quality/100);
  }

  return <section className="photo-studio">
    <div className="photo-heading"><div><span className="eyebrow">NOVA CREATIVE · PHOTO LAB</span><h1>Editor profissional de fotografias</h1><p>Importa uma imagem, ajusta a composição e a aparência e exporta o resultado.</p></div><div className="photo-heading-actions"><button className="outline" onClick={() => inputRef.current?.click()}><Upload size={15}/> Abrir fotografia</button><button className="primary" disabled={!source} onClick={exportPhoto}><Download size={15}/> Exportar imagem</button><input ref={inputRef} type="file" accept="image/*" hidden onChange={e => importPhoto(e.target.files?.[0])}/></div></div>
    <div className="photo-workspace">
      <aside className="photo-tools">
        <div className="photo-tool-title"><SlidersHorizontal size={15}/> AJUSTES</div>
        {[
          {label:"Luminosidade",value:brightness,set:setBrightness,min:0,max:200},
          {label:"Contraste",value:contrast,set:setContrast,min:0,max:200},
          {label:"Saturação",value:saturation,set:setSaturation,min:0,max:200},
          {label:"Desfoque",value:blur,set:setBlur,min:0,max:12}
        ].map(item => <label className="photo-slider" key={item.label}><span>{item.label}<b>{item.value}{item.label === "Desfoque" ? "px" : "%"}</b></span><input type="range" min={item.min} max={item.max} value={item.value} onChange={e => item.set(Number(e.target.value))}/></label>)}
        <div className="photo-tool-title"><ImageIcon size={15}/> COMPOSIÇÃO</div>
        <label className="photo-select">Formato de corte<select value={crop} onChange={e => setCrop(e.target.value)}><option value="original">Original</option><option value="square">Quadrado 1:1</option><option value="landscape">Paisagem 16:9</option><option value="portrait">Retrato 4:5</option></select></label>
        <div className="photo-transform"><button onClick={() => setRotation(v => (v+270)%360)} title="Rodar para a esquerda"><RotateCcw size={16}/></button><button onClick={() => setRotation(v => (v+90)%360)} title="Rodar para a direita"><RotateCw size={16}/></button><button onClick={() => setFlip(v => !v)} title="Espelhar"><FlipHorizontal size={16}/></button></div>
        <button className="reset-photo" onClick={resetAdjustments}>Repor ajustes</button>
        <div className="photo-tool-title"><Download size={15}/> EXPORTAÇÃO</div>
        <label className="photo-select">Formato<select value={format} onChange={e => setFormat(e.target.value)}><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option></select></label>
        {format === "image/jpeg" && <label className="photo-slider"><span>Qualidade <b>{quality}%</b></span><input type="range" min="50" max="100" value={quality} onChange={e => setQuality(Number(e.target.value))}/></label>}
      </aside>
      <div className="photo-canvas-area">
        <div className="photo-canvas-top"><span>{fileName || "Nenhuma imagem aberta"}</span><span>{source ? "Pré-visualização editável" : "Área de trabalho"}</span></div>
        <div className="photo-canvas-wrap">{source ? <canvas ref={canvasRef} className="photo-canvas"/> : <button className="photo-empty" onClick={() => inputRef.current?.click()}><ImageIcon size={38}/><b>Abre uma fotografia para começar</b><span>Suporta PNG, JPEG, WebP e outros formatos do navegador</span></button>}</div>
        <div className="photo-canvas-footer"><span>NOVA PHOTO LAB</span><span>As alterações são aplicadas localmente no navegador</span></div>
      </div>
    </div>
  </section>;
}

function effectFilter(effect: string) { const filters: Record<string, string> = { none: "none", mono: "grayscale(1)", warm: "sepia(.35) saturate(1.2)", cool: "saturate(.85) hue-rotate(12deg)", vivid: "saturate(1.65) contrast(1.08)", cinema: "contrast(1.18) saturate(.82)", soft: "brightness(1.08) saturate(.8)" }; return filters[effect] || "none"; }

function ProviderSelect({ provider, setProvider }: { provider: Provider; setProvider: (p: Provider) => void }) {
  return <select value={provider} onChange={e => setProvider(e.target.value as Provider)}><option value="openai">OpenAI</option><option value="google">Google Gemini</option><option value="anthropic">Anthropic</option></select>;
}