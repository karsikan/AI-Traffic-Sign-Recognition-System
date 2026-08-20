import { useEffect, useRef, useState } from "react";
import type { Detection } from "@/types";
import AutoTranslateText from "../AutoTranslateText";
import { useLang } from "@/context/LanguageContext";

interface BoundingBoxPreviewProps {
  imageSrc: string;
  detections: Detection[];
  hoveredIdx: number | null;
  setHoveredIdx: (idx: number | null) => void;
  fileName?: string;
  fileSizeKB?: number;
}

export default function BoundingBoxPreview({
  imageSrc,
  detections,
  hoveredIdx,
  setHoveredIdx,
  fileName,
  fileSizeKB,
}: BoundingBoxPreviewProps) {
  const { t } = useLang();
  const imgRef = useRef<HTMLImageElement>(null);
  const [dimensions, setDimensions] = useState({
    naturalWidth: 1,
    naturalHeight: 1,
    clientWidth: 1,
    clientHeight: 1,
  });

  const updateDimensions = () => {
    if (imgRef.current) {
      setDimensions({
        naturalWidth: imgRef.current.naturalWidth || 1,
        naturalHeight: imgRef.current.naturalHeight || 1,
        clientWidth: imgRef.current.clientWidth || 1,
        clientHeight: imgRef.current.clientHeight || 1,
      });
    }
  };

  useEffect(() => {
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const scaleX = dimensions.clientWidth / dimensions.naturalWidth;
  const scaleY = dimensions.clientHeight / dimensions.naturalHeight;

  return (
    <div className="card overflow-hidden p-0 relative">
      <div className="relative inline-block w-full">
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Upload preview"
          onLoad={updateDimensions}
          className="w-full h-auto object-contain max-h-[500px] rounded-t-2xl"
        />

        {detections.map((d, i) => {
          if (!d.bbox || d.bbox.length !== 4) return null;
          const [x1, y1, x2, y2] = d.bbox;
          const left = x1 * scaleX;
          const top = y1 * scaleY;
          const width = (x2 - x1) * scaleX;
          const height = (y2 - y1) * scaleY;

          const isHovered = hoveredIdx === i;

          return (
            <div
              key={i}
              className={`absolute border-2 transition-all ${
                isHovered
                  ? "border-signal bg-signal/20 z-20 shadow-lg scale-[1.02]"
                  : "border-go bg-go/10 z-10"
              }`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`,
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <span className="absolute bottom-full left-0 bg-asphalt-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-t transform translate-y-[2px] whitespace-nowrap">
                <AutoTranslateText text={d.label} /> ({(d.confidence * 100).toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>
      {(fileName || fileSizeKB) && (
        <div className="p-4 border-t border-slate-200 dark:border-asphalt-700 bg-slate-50 dark:bg-asphalt-800/55 flex justify-between items-center text-xs text-slate-500">
          {fileName && <span>{t("fileLabel")}: {fileName}</span>}
          {fileSizeKB !== undefined && <span>{t("sizeLabel")}: {fileSizeKB.toFixed(1)} KB</span>}
        </div>
      )}
    </div>
  );
}
