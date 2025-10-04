import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { BodyView, PainPin } from '../../types';

interface BodyPinInputProps {
  id: string;
  value: PainPin[];
  onChange: (pins: PainPin[]) => void;
  imageSrc?: string; // defaults to images/anatomical_views.png
}

const DEFAULT_VIEW: BodyView = 'anterior';

const BodyPinInput: React.FC<BodyPinInputProps> = ({ id, value, onChange, imageSrc = 'images/anatomical_views.png' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<{ id: string } | null>(null);
  const [activePinId, setActivePinId] = useState<string | null>(null);
  // In single-image mode, show all pins regardless of view
  const pinsForImage = useMemo(() => value, [value]);

  const addPinAt = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = ((clientX - rect.left) / rect.width) * 100;
    const yPct = ((clientY - rect.top) / rect.height) * 100;

    const newPin: PainPin = {
      id: crypto.randomUUID(),
      view: DEFAULT_VIEW,
      xPct: Math.min(100, Math.max(0, xPct)),
      yPct: Math.min(100, Math.max(0, yPct)),
      label: '',
    };
    onChange([...value, newPin]);
  }, [onChange, value]);

  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Avoid adding a new pin if clicking on an existing pin element
    if ((e.target as HTMLElement).dataset.pin) return;
    addPinAt(e.clientX, e.clientY);
  }, [addPinAt]);

  const startDrag = useCallback((pinId: string) => {
    draggingRef.current = { id: pinId };
    setActivePinId(pinId);
  }, []);

  // Pointer Events for mouse/touch/pen support
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const { id: pinId } = draggingRef.current;
    const updated = value.map(p => p.id === pinId ? { ...p, xPct: Math.min(100, Math.max(0, xPct)), yPct: Math.min(100, Math.max(0, yPct)) } : p);
    onChange(updated);
  }, [onChange, value]);

  const endDrag = useCallback(() => {
    draggingRef.current = null;
  }, []);

  const updateLabel = useCallback((pinId: string, label: string) => {
    const updated = value.map(p => p.id === pinId ? { ...p, label } : p);
    onChange(updated);
  }, [onChange, value]);

  const removePin = useCallback((pinId: string) => {
    onChange(value.filter(p => p.id !== pinId));
  }, [onChange, value]);

  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        PS2: Drop pins on the diagram where you feel pain. Click to add, drag to adjust, and label for specificity.
      </label>

      <div
        ref={containerRef}
        className="relative w-full max-w-md mx-auto border border-gray-300 rounded overflow-hidden select-none"
        onClick={handleContainerClick}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        tabIndex={0}
        role="group"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && activePinId) {
            // Deselect active pin for QoL
            setActivePinId(null);
          }
        }}
      >
        <img src={imageSrc} alt={`Anatomical view`} className="block w-full h-auto" />

        {pinsForImage.map(pin => (
          <div
            key={pin.id}
            data-pin
            className={`absolute cursor-move ${activePinId === pin.id ? 'ring-2 ring-blue-500 rounded-full' : ''}`}
            style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%`, transform: 'translate(-50%, -100%)' }}
            onPointerDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); startDrag(pin.id); }}
          >
            <div className="relative">
              <span className="block w-3 h-3 bg-red-600 rounded-full shadow" />
              <span className="absolute left-1/2 -translate-x-1/2 mt-1 text-xs bg-white border border-gray-300 rounded px-1 py-0.5 whitespace-nowrap">
                {pin.label || 'Unlabeled'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2">
        <h4 className="text-sm font-semibold text-gray-700">Pins</h4>
        {pinsForImage.length === 0 ? (
          <p className="text-sm text-gray-500">Click on the image to add a pin.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {pinsForImage.map((pin, idx) => (
              <li key={pin.id} className="flex items-center gap-2">
                <span className="text-xs text-gray-500">#{idx + 1}</span>
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                  placeholder="Label (e.g., right eye, left lower back)"
                  value={pin.label}
                  onChange={(e) => updateLabel(pin.id, e.target.value)}
                />
                <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => removePin(pin.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default BodyPinInput;
