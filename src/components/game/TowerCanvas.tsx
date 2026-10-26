import { useEffect, useRef, useState } from "react";
import { TowerRenderer, type GameQuality, type GameResult, type RenderStatus } from "@/game/tower-renderer";

type Props = {
  sessionId: string;
  status: RenderStatus;
  quality: GameQuality;
  onReady: () => void;
  onScore: (score: number, perfects: number) => void;
  onPerfect: () => void;
  onStone: () => void;
  onFall: () => void;
  onOver: (result: GameResult) => void;
  onPerformance: (fps: number) => void;
  captureRef?: React.MutableRefObject<(() => Promise<Blob | null>) | null>;
};

export default function TowerCanvas(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<TowerRenderer | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    try {
      engine.current = new TowerRenderer(host.current, props.sessionId, {
        onScore: (s, p) => latest.current.onScore(s, p),
        onPerfect: () => latest.current.onPerfect(),
        onStone: () => latest.current.onStone(),
        onFall: () => latest.current.onFall(),
        onOver: (r) => latest.current.onOver(r),
        onPerformance: (fps) => latest.current.onPerformance(fps),
      });
      engine.current.setStatus(latest.current.status);
      engine.current.setQuality(latest.current.quality);
      latest.current.onReady();
    } catch {
      setError(true);
    }
    return () => { engine.current?.dispose(); engine.current = null; };    // A new session remounts this component through its React key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { engine.current?.setStatus(props.status); }, [props.status]);
  useEffect(() => { engine.current?.setQuality(props.quality); }, [props.quality]);
  useEffect(() => {
    if (!props.captureRef) return;
    props.captureRef.current = () => engine.current?.captureTowerImage() ?? Promise.resolve(null);
    return () => { if (props.captureRef) props.captureRef.current = null; };
  }, [props.captureRef]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.code !== "Space" || event.repeat || target?.matches("input, textarea, select, button, [contenteditable]")) return;
      if (latest.current.status === "playing") {
        event.preventDefault();
        engine.current?.drop();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  return (
    <div
      ref={host}
      className="tower-stage"
      onPointerDown={(event) => {
        if (props.status !== "playing" || event.button !== 0) return;
        event.preventDefault();
        engine.current?.drop();
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {error && <div className="tower-webgl-error" role="alert"><h3>Il 3D non è disponibile</h3><p>Attiva l’accelerazione grafica del browser oppure prova con un dispositivo più recente.</p></div>}
    </div>
  );
}
