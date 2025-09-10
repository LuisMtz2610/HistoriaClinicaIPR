"use client";

import React from "react";

type FileItem = {
  id?: string;
  path?: string;
  name?: string;
  url: string;
  created_at?: string;
  createdAt?: string;
  inserted_at?: string;
  type?: string;
};

interface PatientFilesGridProps {
  files: FileItem[];
  onDelete?: (f: FileItem) => void;
}

const prettyDate = (iso?: string | Date) =>
  iso ? new Date(iso).toLocaleString() : "—";

const baseName = (path: string) => path.split("/").pop() || path;

export default function PatientFilesGrid({ files, onDelete }: PatientFilesGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {(files || []).map((f) => {
        const name = baseName(f.path || f.name || "");
        const createdAt = f.created_at || f.createdAt || f.inserted_at;
        const url = f.url;
        const isImage = /\.(png|jpe?g|webp|gif|bmp)$/i.test(name);

        return (
          <div
            key={f.id || f.path}
            className="relative rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
          >
            {/* Botón Eliminar */}
            {onDelete && (
              <button
                onClick={() => onDelete(f)}
                className="absolute right-2 top-2 text-red-600 hover:text-red-700 text-sm"
                title="Eliminar"
              >
                Eliminar
              </button>
            )}

            {/* Encabezado */}
            <div className="mb-2">
              <div
                className="text-gray-800 font-medium text-sm truncate"
                title={name}
              >
                {name || f.type || "archivo"}
              </div>
              <div className="text-xs text-gray-500">
                {prettyDate(createdAt)}
              </div>
            </div>

            {/* Preview */}
            {isImage ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block group"
              >
                <img
                  src={url}
                  alt={name}
                  loading="lazy"
                  className="w-full h-40 object-cover rounded-lg border border-gray-100"
                />
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 rounded-2xl ring-2 ring-black/5 pointer-events-none" />
              </a>
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800 text-white text-sm"
              >
                Abrir archivo
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
