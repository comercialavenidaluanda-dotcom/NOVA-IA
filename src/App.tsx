import { useMemo, useRef, useState } from "react";
import { Aperture, AudioLines, Bot, Boxes, Code2, Film, FolderOpen, ImagePlus, Layers3, Mic2, MonitorPlay, Play, Plus, Scissors, Settings2, Sparkles, Upload, WandSparkles, X } from "lucide-react";

type Clip = { id: string; name: string; url: string; kind: string; duration: number; trimStart: number; trimEnd: number; volume: number; speed: number; effect: string };
type Provider = "openai" | "google" | "anthropic";

const modules = [
  { id: "editor", label: "Editor de vídeo", icon: Film },
  { id: "image", label: "Imagem IA", icon: ImagePlus },
  { id: "video", label: "Vídeo IA", icon: WandSparkles },
  { id: "voice", label: "Estúdio de voz", icon: Mic2 },
  { id: "developer", label: "AI Developer", icon: Code2 },
  { id: "assets", label: "Biblioteca", icon: FolderOpen }
];

export default function App() {
  const [active, setActive] = useState("editor");
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
        {active === "developer" && <section className="tool-view"><span className="eyebrow">PROMPT-TO-CODE</span><h1>NOVA AI Developer</h1><p>Transforma instruções em planos, código e projetos de software.</p><div className="ai-workbench"><div className="workbench-head"><Code2/> Assistente de desenvolvimento <span className="pill">MULTIMODELO</span></div><label>Fornecedor</label><ProviderSelect provider={provider} setProvider={setProvider}/><label>ID do modelo (obrigatório)</label><input value={model} onChange={e => setModel(e.target.value)} placeholder="ID exato do modelo ativo no fornecedor"/><label>Chave API (usada apenas neste pedido)</label><input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Introduz a tua chave oficial"/><label>O que queres construir?</label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Descreve a aplicação, funcionalidade ou código que pretendes criar…"/><button className="primary wide" disabled={busy} onClick={askAI}><Sparkles size={16}/>{busy ? "A processar…" : "Gerar com IA"}</button>{answer && <pre className="ai-answer">{answer}</pre>}<small className="security-note">A chave não é guardada pela interface. Usa apenas chaves oficiais e não partilhes credenciais.</small></div></section>}
        {["image","video","voice","assets","settings"].includes(active) && <section className="tool-view"><span className="eyebrow">NOVA CREATIVE SUITE</span><h1>{modules.find(m => m.id === active)?.label || "Definições de IA"}</h1><p>Este módulo está previsto na arquitetura do NOVA AI STUDIO.</p><div className="feature-grid">{(active === "video" ? ["Texto para vídeo","Imagem para vídeo","Transformação de vídeo","Avatares realistas"] : active === "voice" ? ["Texto para voz","Clonagem autorizada de voz","Dobragem e tradução","Sincronização labial"] : active === "image" ? ["Imagem por prompt","Edição generativa","Personagens e cenários","Design publicitário"] : active === "assets" ? ["Projetos","Media importada","Modelos e presets","Exportações"] : ["OpenAI","Google Gemini","Anthropic","Mais fornecedores"]).map(item => <div className="feature-card" key={item}><Sparkles size={18}/><b>{item}</b><span>Em integração</span></div>)}</div><div className="notice"><Bot size={18}/><span>Este módulo ainda não executa gerações reais. Será ligado a fornecedores e serviços compatíveis após implementação e testes.</span></div></section>}
      </main>
    </div>
    <footer className="statusbar"><span><span className="live-dot"/>{status}</span><span>Web + Windows Desktop · {clips.length} media no projeto</span></footer>
  </div>;
}

function effectFilter(effect: string) { const filters: Record<string, string> = { none: "none", mono: "grayscale(1)", warm: "sepia(.35) saturate(1.2)", cool: "saturate(.85) hue-rotate(12deg)", vivid: "saturate(1.65) contrast(1.08)", cinema: "contrast(1.18) saturate(.82)", soft: "brightness(1.08) saturate(.8)" }; return filters[effect] || "none"; }

function ProviderSelect({ provider, setProvider }: { provider: Provider; setProvider: (p: Provider) => void }) {
  return <select value={provider} onChange={e => setProvider(e.target.value as Provider)}><option value="openai">OpenAI</option><option value="google">Google Gemini</option><option value="anthropic">Anthropic</option></select>;
}