import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
 
const tk = {
  accent:    "#7efff5",
  accentDim: "rgba(126,255,245,0.15)",
  border:    "rgba(255,255,255,0.08)",
  text:      "#e8eaf0",
  muted:     "rgba(232,234,240,0.45)",
  danger:    "#ff6b6b",
  font:      "'IBM Plex Mono','Fira Code',monospace",
};
 
function injectKeyframes() {
  if (document.getElementById("gsv-kf")) return;
  const s = document.createElement("style");
  s.id = "gsv-kf";
  s.textContent = `@keyframes gsv-spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(s);
}
 
function Overlay({ visible, progress, status }) {
  return (
    <div style={{
      position:"absolute", inset:0, zIndex:10,
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", gap:"1rem",
      background:"rgba(10,10,18,0.88)",
      opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none",
      transition:"opacity 0.5s ease",
    }}>
      <div style={{ width:48, height:48, borderRadius:"50%",
        border:`2px solid ${tk.border}`, borderTopColor:tk.accent,
        animation:"gsv-spin 0.9s linear infinite" }}/>
      <div style={{ width:200, height:2, background:tk.border, borderRadius:99, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${progress}%`,
          background:`linear-gradient(90deg,${tk.accent},#a78bfa)`,
          transition:"width 0.3s ease" }}/>
      </div>
      <span style={{ fontSize:"0.7rem", color:tk.muted, letterSpacing:"0.1em",
        textTransform:"uppercase", fontFamily:tk.font, textAlign:"center",
        maxWidth:280, lineHeight:1.5 }}>{status}</span>
    </div>
  );
}
 
function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  const lines = (error.message || String(error)).split("\n");
  return (
    <div style={{
      position:"absolute", inset:0, zIndex:20, overflowY:"auto",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", gap:"0.75rem",
      background:"rgba(10,10,18,0.96)", padding:"2rem",
    }}>
      <span style={{ fontSize:"2rem", color:tk.danger }}>⚠</span>
      <div style={{ maxWidth:380, textAlign:"center" }}>
        {lines.map((l, i) => (
          <p key={i} style={{
            fontSize: i === 0 ? "0.78rem" : "0.65rem",
            color: i === 0 ? tk.danger : tk.muted,
            margin:"0.25rem 0", lineHeight:1.6, fontFamily:tk.font,
          }}>{l || "\u00A0"}</p>
        ))}
      </div>
      <button onClick={onRetry} style={{
        marginTop:"0.5rem", padding:"0.4rem 1.4rem",
        background:"rgba(255,255,255,0.04)", border:`1px solid ${tk.border}`,
        borderRadius:6, color:tk.text, fontSize:"0.7rem",
        cursor:"pointer", letterSpacing:"0.08em", textTransform:"uppercase",
        fontFamily:tk.font,
      }}>Tentar novamente</button>
    </div>
  );
}
 
function resolveSceneFormat(GS3D, fileFormat) {
  if (!fileFormat) return undefined;
  const fmt = fileFormat.toLowerCase().replace(".", "");
  if (GS3D.SceneFormat) {
    const map = {
      splat:  GS3D.SceneFormat.Splat,
      ply:    GS3D.SceneFormat.Ply,
      ksplat: GS3D.SceneFormat.KSplat,
      spz:    GS3D.SceneFormat.Spz,
    };
    if (map[fmt] !== undefined) return map[fmt];
  }
  const fallbackMap = { splat: 0, ksplat: 1, ply: 2, spz: 3 };
  return fallbackMap[fmt];
}
 
export default function GaussianSplatViewer({
  src,
  fileFormat,
  cameraUp = [0, 1, 0],
  width = "100%",
  height = "500px",
  background = "#0a0a12",
  fov = 60,
  antialiased = true,
  dynamicScene = false,
  sphericalHarmonics = 0,
  alphaThreshold = 5,
  onLoad, onProgress, onError,
  className, style,
}) {
  const wrapperRef = useRef(null);
  const cleanupRef = useRef(null);
 
  const [loading,  setLoading]  = useState(true);
  const [progress, setProgress] = useState(0);
  const [status,   setStatus]   = useState("Aguardando…");
  const [error,    setError]    = useState(null);
  const [retryKey, setRetryKey] = useState(0);
 
  useEffect(() => {
    if (!src) {
      setError(new Error("Prop `src` não informada."));
      setLoading(false);
      return;
    }
 
    if (src.startsWith("blob:") && !fileFormat) {
      setError(new Error(
        "Arquivos locais precisam da prop fileFormat.\n" +
        "Exemplo: fileFormat=\"splat\" ou fileFormat=\"ply\""
      ));
      setLoading(false);
      return;
    }
 
    injectKeyframes();
    setLoading(true);
    setProgress(0);
    setStatus("Iniciando…");
    setError(null);
 
    let mounted = true;
    let viewer   = null;
    let renderer = null;
    let rafId    = null;
    let ro       = null;
 
    function cleanup() {
      mounted = false;
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      if (viewer) {
        try { viewer.dispose?.()?.catch?.(() => {}); } catch (_) {}
        viewer = null;
      }
      if (renderer) {
        try {
          renderer.domElement?.parentNode?.removeChild(renderer.domElement);
          renderer.dispose();
        } catch (_) {}
        renderer = null;
      }
    }
    cleanupRef.current = cleanup;
 
    async function init() {
      try {
        setStatus("Carregando biblioteca…");
        const GS3D = await import("@mkkellogg/gaussian-splats-3d");
        if (!mounted) return;
 
        const wrapper = wrapperRef.current;
        if (!wrapper || !document.body.contains(wrapper)) return;
 
        const w = wrapper.clientWidth  || 800;
        const h = wrapper.clientHeight || 500;
 
        setStatus("Criando renderer WebGL…");
        renderer = new THREE.WebGLRenderer({ antialias: antialiased, alpha: false });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(w, h);
 
        const canvas = renderer.domElement;
        Object.assign(canvas.style, {
          position:"absolute", inset:"0",
          width:"100%", height:"100%",
          display:"block", outline:"none",
        });
        wrapper.appendChild(canvas);
        if (!mounted) { cleanup(); return; }
 
        const camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 1000);
        camera.position.set(0, 1, 5);
 
        setStatus("Inicializando viewer…");
        viewer = new GS3D.Viewer({
          selfDrivenMode:           false,
          renderer,
          camera,
          cameraUp:                 cameraUp,
          useBuiltInControls:       true,
          dynamicScene,
          sphericalHarmonicsDegree: sphericalHarmonics,
          sharedMemoryForWorkers:   false,
          logLevel: GS3D.LogLevel?.Info ?? 1,
        });
        if (!mounted) { cleanup(); return; }
 
        setStatus("Baixando cena…");
        const isBlob = src.startsWith("blob:");
        
        const sceneOptions = {
          splatAlphaRemovalThreshold: alphaThreshold,
          showLoadingUI:              false,
          progressiveLoad:            isBlob ? false : true,
          onProgress: (pct, _l, _t, msg) => {
            if (!mounted) return;
            const p = Math.min(Math.round(pct * 100), 99);
            setProgress(p);
            setStatus(msg ?? `Carregando… ${p}%`);
            onProgress?.(p, msg);
          },
        };
 
        const fmt = resolveSceneFormat(GS3D, fileFormat);
        if (fmt !== undefined) sceneOptions.format = fmt;
 
        await viewer.addSplatScene(src, sceneOptions).catch((err) => {
          if (!mounted || err?.name === "AbortError") return;
          if (err?.message?.includes("File format not supported") || err?.message?.includes("Could not load")) {
            const ext = fileFormat || src.split(".").pop() || "?";
            throw new Error(
              `Formato "${ext}" não reconhecido pela lib.\n\n` +
              `Soluções:\n1. No SuperSplat: Export → Splat (.splat)\n2. Export → PLY Standard`
            );
          }
          throw err;
        });
 
        if (!mounted) { cleanup(); return; }
 
        
        setStatus("Ajustando câmera…");
        try {
          const splatMesh = viewer.splatMesh;
          splatMesh.updateMatrixWorld(true);
          
          // Calcula a caixa delimitadora da cena
          const box = new THREE.Box3().setFromObject(splatMesh);
          
          if (!box.isEmpty()) {
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            
            // Calcula a distância necessária para enquadrar o objeto baseado no FOV
            const fovRad = camera.fov * (Math.PI / 180);
            const cameraDistance = (maxDim / 2) / Math.tan(fovRad / 2) * 1.2; // 1.2 = margem de padding
            
            // Ajusta planos de recorte baseado no tamanho do objeto (evita cortes)
            camera.near = maxDim * 0.001;
            camera.far = maxDim * 100;
            
            // Define o vetor UP da câmera e calcula a posição com base nele
            const upVec = new THREE.Vector3().fromArray(cameraUp).normalize();
            camera.up.copy(upVec);
            
            camera.position.copy(center)
              .add(new THREE.Vector3(0.5, 0, 1.0).normalize().multiplyScalar(cameraDistance))
              .addScaledVector(upVec, cameraDistance * 0.3);
              
            camera.lookAt(center);
            camera.updateProjectionMatrix();
 
            // Atualiza o alvo do OrbitControls para o centro da cena
            if (viewer.controls) {
              viewer.controls.target.copy(center);
              viewer.controls.update();
            }
          }
        } catch (e) {
          console.warn("Não foi possível ajustar a câmera automaticamente:", e);
        }
        // ── FIM AUTO-FIT ────────────────────────────────────────────────────
 
        function animate() {
          if (!mounted) return;
          rafId = requestAnimationFrame(animate);
          viewer?.update?.();
          viewer?.render?.();
        }
        animate();
 
        ro = new ResizeObserver(([entry]) => {
          if (!mounted || !renderer || !camera) return;
          const { width: rw, height: rh } = entry.contentRect;
          if (rw > 0 && rh > 0) {
            renderer.setSize(rw, rh);
            camera.aspect = rw / rh;
            camera.updateProjectionMatrix();
          }
        });
        ro.observe(wrapper);
 
        setProgress(100);
        setStatus("Pronto");
        setTimeout(() => { if (mounted) setLoading(false); }, 400);
        onLoad?.();
 
      } catch (err) {
        if (!mounted) return;
        console.error("[GaussianSplatViewer]", err);
        setError(err);
        setLoading(false);
        onError?.(err);
      }
    }
 
    init();
    return () => { cleanupRef.current?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, fileFormat, fov, antialiased, dynamicScene, sphericalHarmonics, alphaThreshold, retryKey, cameraUp]);
 
  const handleRetry = useCallback(() => {
    cleanupRef.current?.();
    setRetryKey(k => k + 1);
  }, []);
 
  const badges = ["3DGS",
    dynamicScene       ? "Dynamic"               : null,
    sphericalHarmonics ? `SH${sphericalHarmonics}` : null,
    fileFormat         ? fileFormat.replace(".","").toUpperCase() : null,
  ].filter(Boolean);
 
  return (
    <div ref={wrapperRef} className={className} style={{
      position:"relative", width, height, background,
      borderRadius:"12px", overflow:"hidden", fontFamily:tk.font, ...style,
    }}>
      <Overlay visible={loading && !error} progress={progress} status={status}/>
      <ErrorBox error={error} onRetry={handleRetry}/>
      {!loading && !error && (
        <div style={{ position:"absolute", bottom:14, left:14, display:"flex", gap:8, zIndex:5 }}>
          {badges.map(b => (
            <span key={b} style={{ padding:"3px 8px", background:tk.accentDim,
              border:`1px solid ${tk.border}`, borderRadius:99,
              fontSize:"0.6rem", color:tk.accent,
              letterSpacing:"0.12em", textTransform:"uppercase" }}>{b}</span>
          ))}
        </div>
      )}
    </div>
  );
}
 
export { GaussianSplatViewer };