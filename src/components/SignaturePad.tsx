import { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';

interface Props {
  width?: number;
  height?: number;
  onSignatureChange: (dataUrl: string | null) => void;
  value?: string | null;
  readOnly?: boolean;
}

export default function SignaturePad({
  width = 760,
  height = 220,
  onSignatureChange,
  value,
  readOnly = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        setHasContent(true);
      };
      img.src = value;
    }
  }, [width, height]);

  useEffect(() => {
    if (!value) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      setHasContent(true);
    };
    img.src = value;
  }, [value, width, height]);

  function getPos(e: React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (readOnly) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setIsDrawing(true);
    lastPos.current = getPos(e);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDrawing || readOnly) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    if (!hasContent) setHasContent(true);
  }

  function onPointerUp() {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPos.current = null;
    emitData();
  }

  function emitData() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let empty = true;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) { empty = false; break; }
    }
    if (empty) {
      setHasContent(false);
      onSignatureChange(null);
      return;
    }
    onSignatureChange(canvas.toDataURL('image/png'));
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas || readOnly) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    setHasContent(false);
    onSignatureChange(null);
  }

  return (
    <div className="space-y-2">
      <div className={`relative rounded-xl border-2 overflow-hidden bg-white ${
        readOnly ? 'border-gray-100' : 'border-dashed border-gray-300 hover:border-primary-400 transition-colors'
      }`}>
        <canvas
          ref={canvasRef}
          className={`signature-canvas block ${readOnly ? '' : 'cursor-crosshair'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {!hasContent && !readOnly && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-300 text-sm">请在上方区域手写签名</span>
          </div>
        )}
        {hasContent && (
          <div className="absolute top-2 right-2 text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
            已签名
          </div>
        )}
      </div>
      {!readOnly && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            请使用鼠标或触控笔书写，签名将作为法律依据，请确保清晰可辨认
          </p>
          <button type="button" onClick={clear} className="btn-secondary text-xs py-1.5 px-3">
            <Eraser size={14} />
            清除签名
          </button>
        </div>
      )}
    </div>
  );
}
