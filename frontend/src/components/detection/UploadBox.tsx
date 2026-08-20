import { UploadCloud } from "lucide-react";
import React, { useState } from "react";

interface UploadBoxProps {
  onFileSelected: (file: File) => void;
  accept: string;
  maxSizeMB?: number;
  label?: string;
  sublabel?: string;
}

export default function UploadBox({
  onFileSelected,
  accept,
  maxSizeMB = 10,
  label = "Drag and drop or click to upload",
  sublabel = "Supports images or videos",
}: UploadBoxProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size <= maxSizeMB * 1024 * 1024) {
        onFileSelected(file);
      } else {
        alert(`File exceeds size limit of ${maxSizeMB}MB.`);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size <= maxSizeMB * 1024 * 1024) {
        onFileSelected(file);
      } else {
        alert(`File exceeds size limit of ${maxSizeMB}MB.`);
      }
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[300px] relative ${
        dragActive
          ? "border-signal bg-signal/10 scale-[0.99]"
          : "border-slate-300 dark:border-asphalt-700 hover:border-signal dark:hover:border-signal bg-white dark:bg-asphalt-800"
      }`}
    >
      <input
        type="file"
        accept={accept}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleInputChange}
      />
      <UploadCloud size={48} className="text-slate-400 dark:text-slate-500 mb-4 animate-bounce" />
      <p className="font-semibold text-lg text-slate-700 dark:text-slate-200">{label}</p>
      <p className="text-sm text-slate-500 mt-1">{sublabel}</p>
    </div>
  );
}
