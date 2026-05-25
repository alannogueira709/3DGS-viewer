/**
 * App.jsx — Demo GaussianSplatViewer
 * v2: passa fileFormat corretamente para arquivos locais (blob: URLs)
 */

import { useState, useCallback, useEffect, useRef } from "react";
import GaussianSplatViewer from "./components/GaussianSplatViewer";

const T = {
  bg:"#08080f", surface:"rgba(255,255,255,0.04)", border:"rgba(255,255,255,0.08)",
  accent:"#7efff5", accentDim:"rgba(126,255,245,0.12)", accentBorder:"rgba(126,255,245,0.25)",
  purple:"#a78bfa", purpleDim:"rgba(167,139,250,0.12)",
  text:"#e8eaf0", muted:"rgba(232,234,240,0.42)",
  font:"'IBM Plex Mono','Fira Code',monospace", radius:"12px",
};

const PRESETS = [
  { label:"Train",   url:"https://huggingface.co/cakewalk/splat-data/resolve/main/train.splat",   fmt:"splat" },
  { label:"Truck",   url:"https://huggingface.co/cakewalk/splat-data/resolve/main/truck.splat",   fmt:"splat" },
  { label:"Garden",  url:"https://huggingface.co/cakewalk/splat-data/resolve/main/garden.splat",  fmt:"splat" },
  { label:"Bicycle", url:"https://huggingface.co/cakewalk/splat-data/resolve/main/bicycle.splat", fmt:"splat" },
];

const ACCEPTED = [".splat",".ply",".ksplat",".spz"];

function buildCode({ src, fileFormat, height, background, fov, alphaThreshold, sphericalHarmonics, antialiased, dynamicScene, cameraUp, splatRotation }) {
  return [
    `import GaussianSplatViewer from "./components/GaussianSplatViewer";`,``,
    `<GaussianSplatViewer`,
    `  src="${src || "https://example.com/cena.splat"}"`,
    fileFormat ? `  fileFormat="${fileFormat}"` : null,
    `  cameraUp={[${cameraUp.join(", ")}]}`,
    `  splatRotation={[${splatRotation.join(", ")}]}`,
    `  height="${height}"`,
    `  background="${background}"`,
    fov !== 60               ? `  fov={${fov}}`                              : null,
    alphaThreshold !== 5     ? `  alphaThreshold={${alphaThreshold}}`        : null,
    sphericalHarmonics !== 0 ? `  sphericalHarmonics={${sphericalHarmonics}}` : null,
    !antialiased             ? `  antialiased={false}`                       : null,
    dynamicScene             ? `  dynamicScene`                              : null,
    `  onLoad={() => console.log("pronto!")}`,
    `/>`,
  ].filter(Boolean).join("\n");
}

// ── UI atoms ──────────────────────────────────────────────────────────────────
const Label = ({c}) => <span style={{fontSize:"0.65rem",color:T.muted,fontFamily:T.font}}>{c}</span>;

function Card({children}) {
  return <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.radius,padding:"1rem 1.1rem",display:"flex",flexDirection:"column",gap:"0.85rem"}}>{children}</div>;
}

function TextInput({value, onChange, placeholder}) {
  const [f,setF]=useState(false);
  return <input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    onFocus={()=>setF(true)} onBlur={()=>setF(false)}
    style={{width:"100%",padding:"0.5rem 0.7rem",boxSizing:"border-box",background:"rgba(255,255,255,0.03)",border:`1px solid ${f?T.accent:T.border}`,borderRadius:"8px",color:T.text,fontFamily:T.font,fontSize:"0.72rem",outline:"none",transition:"border-color 0.2s"}}/>;
}

function RangeRow({label,min,max,value,onChange,suffix=""}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
      <Label c={label}/>
      <input type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))}
        style={{flex:1,height:"2px",WebkitAppearance:"none",appearance:"none",background:T.border,borderRadius:"99px",border:"none",outline:"none",cursor:"pointer"}}/>
      <span style={{width:"2.8rem",textAlign:"right",fontSize:"0.65rem",color:T.accent,fontFamily:T.font}}>{value}{suffix}</span>
    </div>
  );
}

function Toggle({label,checked,onChange}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <Label c={label}/>
      <div onClick={()=>onChange(!checked)} style={{position:"relative",width:"32px",height:"18px",borderRadius:"99px",background:checked?T.accent:T.border,cursor:"pointer",transition:"background 0.2s",flexShrink:0}}>
        <div style={{position:"absolute",top:"2px",left:checked?"14px":"2px",width:"14px",height:"14px",borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
      </div>
    </div>
  );
}

function Badge({children,color="default"}) {
  const c={default:{bg:T.surface,border:T.border,text:T.muted},accent:{bg:T.accentDim,border:T.accentBorder,text:T.accent},purple:{bg:T.purpleDim,border:"rgba(167,139,250,0.25)",text:T.purple}}[color];
  return <span style={{padding:"3px 9px",borderRadius:"99px",fontSize:"0.6rem",letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:T.font,background:c.bg,border:`1px solid ${c.border}`,color:c.text}}>{children}</span>;
}

function CodePanel({code}) {
  const [copied,setCopied]=useState(false);
  const hl=code
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/(import|from)/g,`<span style="color:${T.purple}">$1</span>`)
    .replace(/("([^"]*)")/g,`<span style="color:${T.accent}">$1</span>`)
    .replace(/(\/\/[^\n]*)/g,`<span style="color:rgba(255,255,255,0.25)">$1</span>`);
  return (
    <div style={{position:"relative",background:"rgba(0,0,0,0.35)",borderTop:`1px solid ${T.border}`,padding:"0.75rem 1rem",fontFamily:T.font,fontSize:"0.65rem",lineHeight:1.8,overflowX:"auto",whiteSpace:"pre",color:T.muted,flexShrink:0}}>
      <button onClick={()=>{navigator.clipboard.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),1800);}}
        style={{position:"absolute",top:"0.5rem",right:"0.75rem",padding:"2px 8px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:"6px",color:copied?T.accent:T.muted,fontFamily:T.font,fontSize:"0.6rem",cursor:"pointer"}}>
        {copied?"✓ copiado":"copiar"}
      </button>
      <div dangerouslySetInnerHTML={{__html:hl}}/>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [urlInput,           setUrlInput]           = useState("");
  const [activeSrc,          setActiveSrc]          = useState("");
  const [activeFileFormat,   setActiveFileFormat]   = useState("");  // ← NOVO
  const [activePreset,       setActivePreset]       = useState(null);
  const [height,             setHeight]             = useState("100%");
  const [background,         setBackground]         = useState("#0a0a12");
  const [fov,                setFov]                = useState(60);
  const [alphaThreshold,     setAlphaThreshold]     = useState(5);
  const [sphericalHarmonics, setSH]                 = useState(0);
  const [antialiased,        setAA]                 = useState(true);
  const [dynamicScene,       setDyn]                = useState(false);
  const [cameraUp,           setCameraUp]           = useState("0,1,0");
  const [splatRotation,      setSplatRotation]      = useState("1,0,0,0");
  const [status,             setStatus]             = useState("Arraste um arquivo .splat ou escolha um preset");
  const [loaded,             setLoaded]             = useState(false);
  const [isDragging,         setIsDragging]         = useState(false);
  const [viewerKey,          setViewerKey]          = useState(0);

  const fileInputRef = useRef(null);

  useEffect(()=>{
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
    document.body.style.cssText=`margin:0;padding:0;background:${T.bg};color:${T.text};font-family:${T.font};height:100vh;overflow:hidden;`;
    document.documentElement.style.height="100%";
  },[]);

  // Extrai extensão do nome do arquivo → fileFormat
  function extFromName(name) {
    return name.split(".").pop().toLowerCase(); // "splat" | "ply" | "ksplat" | "spz"
  }

  function loadFile(file) {
    const fmt = extFromName(file.name);
    if (!["splat","ply","ksplat","spz"].includes(fmt)) {
      setStatus(`❌ Formato .${fmt} não suportado. Use: ${ACCEPTED.join(", ")}`);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrlInput(objectUrl);
    setActiveSrc(objectUrl);
    setActiveFileFormat(fmt);       // ← passa o formato para o componente
    setActivePreset(null);
    setLoaded(false);
    setViewerKey(k=>k+1);
    setStatus(`Carregando arquivo local: ${file.name} (.${fmt})`);
  }

  const handleDrop = useCallback((e)=>{
    e.preventDefault(); setIsDragging(false);
    const file=e.dataTransfer.files[0];
    if(file) loadFile(file);
  },[]);

  const handleFileInput = useCallback((e)=>{
    const file=e.target.files[0];
    if(file) loadFile(file);
    e.target.value="";
  },[]);

  const handlePreset = useCallback((idx)=>{
    const p=PRESETS[idx];
    setActivePreset(idx);
    setUrlInput(p.url);
    setActiveSrc(p.url);
    setActiveFileFormat(p.fmt);     // preset já tem o fmt definido
    setLoaded(false);
    setViewerKey(k=>k+1);
    setStatus(`Carregando preset: ${p.label}`);
  },[]);

  const handleLoadUrl = useCallback(()=>{
    if(!urlInput.trim()) return;
    const ext=urlInput.trim().split("?")[0].split(".").pop().toLowerCase();
    const fmt=["splat","ply","ksplat","spz"].includes(ext)?ext:"";
    setActiveSrc(urlInput.trim());
    setActiveFileFormat(fmt);
    setLoaded(false);
    setViewerKey(k=>k+1);
    setStatus(`Carregando URL: ${urlInput.trim().split("/").pop()}`);
  },[urlInput]);

  const SL = ({c}) => <div style={{fontSize:"0.6rem",letterSpacing:"0.15em",textTransform:"uppercase",color:T.muted,marginBottom:"0.5rem"}}>{c}</div>;

  return (
    <div style={{display:"grid",gridTemplateRows:"auto 1fr",height:"100vh",overflow:"hidden",fontFamily:T.font,background:T.bg}}>

      {/* Header */}
      <header style={{display:"flex",alignItems:"center",gap:"1rem",padding:"0.85rem 1.5rem",borderBottom:`1px solid ${T.border}`,background:"rgba(8,8,15,0.8)",backdropFilter:"blur(12px)",zIndex:100}}>
        <div style={{width:36,height:36,borderRadius:"8px",background:`linear-gradient(135deg,${T.accent},${T.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",fontWeight:600,color:"#08080f",flexShrink:0}}>Σ</div>
        <div>
          <div style={{fontSize:"0.85rem",fontWeight:500,letterSpacing:"0.06em"}}>GaussianSplatViewer</div>
          <div style={{fontSize:"0.6rem",color:T.muted,marginTop:"2px",letterSpacing:"0.1em",textTransform:"uppercase"}}>React · @mkkellogg/gaussian-splats-3d · Three.js</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:"8px"}}>
          <Badge color="accent">3DGS</Badge>
          <Badge color="purple">Three.js</Badge>
        </div>
      </header>

      {/* Body */}
      <div style={{display:"grid",gridTemplateColumns:"320px 1fr",overflow:"hidden",height:"100%"}}>

        {/* Sidebar */}
        <aside style={{borderRight:`1px solid ${T.border}`,padding:"1.25rem",display:"flex",flexDirection:"column",gap:"1.25rem",overflowY:"auto",background:"rgba(255,255,255,0.012)"}}>

          {/* Drop zone */}
          <div
            onDragOver={e=>{e.preventDefault();setIsDragging(true);}}
            onDragLeave={()=>setIsDragging(false)}
            onDrop={handleDrop}
            onClick={()=>fileInputRef.current?.click()}
            style={{border:`2px dashed ${isDragging?T.accent:T.border}`,borderRadius:T.radius,padding:"1.25rem",textAlign:"center",cursor:"pointer",transition:"all 0.2s",background:isDragging?T.accentDim:"transparent"}}>
            <div style={{fontSize:"1.4rem",marginBottom:"0.4rem",opacity:0.5}}>↑</div>
            <div style={{fontSize:"0.65rem",color:isDragging?T.accent:T.muted,lineHeight:1.7}}>
              Arraste um arquivo aqui<br/>
              <strong style={{color:T.text}}>.splat · .ply · .ksplat · .spz</strong>
            </div>
            <input ref={fileInputRef} type="file" accept={ACCEPTED.join(",")} onChange={handleFileInput} style={{display:"none"}}/>
          </div>

          {/* Formato detectado */}
          {activeFileFormat && (
            <div style={{background:T.accentDim,border:`1px solid ${T.accentBorder}`,borderRadius:"8px",padding:"0.5rem 0.75rem",fontSize:"0.65rem",color:T.accent,fontFamily:T.font}}>
              ✓ Formato detectado: <strong>.{activeFileFormat}</strong>
            </div>
          )}

          {/* URL manual */}
          <div>
            <SL c="URL pública"/>
            <Card>
              <TextInput value={urlInput} onChange={setUrlInput} placeholder="https://exemplo.com/cena.splat"/>
              <button onClick={handleLoadUrl} style={{width:"100%",padding:"0.6rem",background:`linear-gradient(135deg,${T.accentDim},${T.purpleDim})`,border:`1px solid ${T.accentBorder}`,borderRadius:"8px",color:T.accent,fontFamily:T.font,fontSize:"0.7rem",letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer"}}>▶ Carregar URL</button>
            </Card>
          </div>

          {/* Presets */}
          <div>
            <SL c="Presets (cakewalk/splat-data)"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
              {PRESETS.map((p,i)=>(
                <button key={p.label} onClick={()=>handlePreset(i)} style={{padding:"0.4rem 0.6rem",background:activePreset===i?T.accentDim:T.surface,border:`1px solid ${activePreset===i?T.accentBorder:T.border}`,borderRadius:"6px",color:activePreset===i?T.accent:T.muted,fontFamily:T.font,fontSize:"0.65rem",cursor:"pointer",textAlign:"left",transition:"all 0.2s"}}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Renderer */}
          <div>
            <SL c="Renderer"/>
            <Card>
              <RangeRow label="FOV" min={30} max={120} value={fov} onChange={setFov} suffix="°"/>
              <RangeRow label="Alpha" min={0} max={50} value={alphaThreshold} onChange={setAlphaThreshold}/>
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                <Label c="SH Degree"/>
                <select value={sphericalHarmonics} onChange={e=>setSH(Number(e.target.value))} style={{flex:1,padding:"0.35rem 0.5rem",background:"rgba(255,255,255,0.03)",border:`1px solid ${T.border}`,borderRadius:"6px",color:T.text,fontFamily:T.font,fontSize:"0.7rem",outline:"none"}}>
                  <option value={0}>0 — Off</option>
                  <option value={1}>1 — Low</option>
                  <option value={2}>2 — Mid</option>
                  <option value={3}>3 — High</option>
                </select>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                <Label c="Camera Up"/>
                <select value={cameraUp} onChange={e=>setCameraUp(e.target.value)} style={{flex:1,padding:"0.35rem 0.5rem",background:"rgba(255,255,255,0.03)",border:`1px solid ${T.border}`,borderRadius:"6px",color:T.text,fontFamily:T.font,fontSize:"0.7rem",outline:"none"}}>
                  <option value="0,1,0">Padrão (Y-Up / Three.js)</option>
                  <option value="0,-1,-0.6">Invertido (Y-Down / Colmap)</option>
                  <option value="0,-1,0">Y-Down Direto</option>
                  <option value="0,0,1">Z-Up (Blender/ROS)</option>
                </select>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                <Label c="Splat Rotation"/>
                <select value={splatRotation} onChange={e=>setSplatRotation(e.target.value)} style={{flex:1,padding:"0.35rem 0.5rem",background:"rgba(255,255,255,0.03)",border:`1px solid ${T.border}`,borderRadius:"6px",color:T.text,fontFamily:T.font,fontSize:"0.7rem",outline:"none"}}>
                  <option value="1,0,0,0">Rotacionar 180° no X (Flip Y/Z)</option>
                  <option value="0,0,0,1">Sem rotação (Padrão)</option>
                  <option value="0,0,1,0">Rotacionar 180° no Z</option>
                  <option value="0.7071,0,0,0.7071">Rotacionar 90° no X</option>
                </select>
              </div>
              <Toggle label="Antialiased" checked={antialiased} onChange={setAA}/>
              <Toggle label="Dynamic Scene" checked={dynamicScene} onChange={setDyn}/>
            </Card>
          </div>

          {/* Aparência */}
          <div>
            <SL c="Aparência"/>
            <Card>
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}><Label c="Altura"/><TextInput value={height} onChange={setHeight} placeholder="500px"/></div>
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}><Label c="Background"/><TextInput value={background} onChange={setBackground} placeholder="#0a0a12"/></div>
            </Card>
          </div>

        </aside>

        {/* Viewer */}
        <div style={{display:"grid",gridTemplateRows:"auto 1fr auto",overflow:"hidden"}}>

          {/* Toolbar */}
          <div style={{padding:"0.6rem 1rem",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:"0.75rem",fontSize:"0.65rem",color:T.muted,fontFamily:T.font,background:"rgba(255,255,255,0.012)"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:loaded?T.accent:T.muted,boxShadow:loaded?`0 0 6px ${T.accent}`:"none",transition:"all 0.4s",flexShrink:0}}/>
            <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{status}</span>
            <div style={{display:"flex",gap:"6px",flexShrink:0}}>
              <Badge>WebGL 2</Badge>
              <Badge>Orbit Controls</Badge>
            </div>
          </div>

          {/* Canvas */}
          <div style={{position:"relative",overflow:"hidden"}}>
            {activeSrc ? (() => {
              const parsedCameraUp = cameraUp.split(",").map(Number);
              const parsedSplatRotation = splatRotation.split(",").map(Number);
              return (
                <GaussianSplatViewer
                  key={`${viewerKey}-${activeSrc}`}
                  src={activeSrc}
                  fileFormat={activeFileFormat || undefined}
                  cameraUp={parsedCameraUp}
                  splatRotation={parsedSplatRotation}
                  width="100%" height="100%"
                  background={background}
                  fov={fov} alphaThreshold={alphaThreshold}
                  sphericalHarmonics={sphericalHarmonics}
                  antialiased={antialiased} dynamicScene={dynamicScene}
                  onLoad={()=>{setLoaded(true);setStatus("Pronto");}}
                  onProgress={(pct,msg)=>setStatus(msg??`Carregando… ${pct}%`)}
                  onError={(err)=>setStatus(`Erro: ${err.message.split("\n")[0]}`)}
                  style={{position:"absolute",inset:0}}
                />
              );
            })() : (
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"1rem",background:`radial-gradient(ellipse 70% 50% at 60% 50%,rgba(126,255,245,0.05) 0%,transparent 70%),${T.bg}`}}>
                <div style={{width:64,height:64,borderRadius:"50%",border:`1px solid ${T.border}`,background:T.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.8rem"}}>〄</div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:"0.85rem",fontWeight:500,marginBottom:"0.4rem"}}>GaussianSplatViewer</div>
                  <div style={{fontSize:"0.65rem",color:T.muted,maxWidth:300,lineHeight:1.7}}>
                    Arraste um <span style={{color:T.accent}}>.splat</span> ou <span style={{color:T.accent}}>.ply</span> para a sidebar,<br/>
                    ou escolha um dos presets públicos.
                  </div>
                </div>
              </div>
            )}
          </div>

          <CodePanel code={buildCode({src:activeSrc||urlInput,fileFormat:activeFileFormat,height,background,fov,alphaThreshold,sphericalHarmonics,antialiased,dynamicScene,cameraUp:cameraUp.split(",").map(Number),splatRotation:splatRotation.split(",").map(Number)})}/>
        </div>
      </div>
    </div>
  );
}
