import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Check, X, RotateCcw, ZoomIn } from 'lucide-react';
import { getCroppedImg } from '../lib/imageUtils';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ image, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onRotationChange = (rotation: number) => {
    setRotation(rotation);
  };

  const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col animate-in fade-in">
      <div className="relative flex-1">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteInternal}
          onZoomChange={onZoomChange}
          onRotationChange={onRotationChange}
          cropShape="round"
          showGrid={false}
        />
      </div>

      <div className="p-8 bg-white rounded-t-[40px] space-y-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <ZoomIn size={20} className="text-slate-400" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-purple-600"
            />
          </div>
          <div className="flex items-center space-x-4">
            <RotateCcw size={20} className="text-slate-400" />
            <input
              type="range"
              value={rotation}
              min={0}
              max={360}
              step={1}
              aria-labelledby="Rotation"
              onChange={(e) => setRotation(Number(e.target.value))}
              className="flex-1 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-purple-600"
            />
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-3xl font-black text-sm flex items-center justify-center space-x-2 active:scale-95 transition-all"
          >
            <X size={20} />
            <span>Cancelar</span>
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-4 bg-purple-600 text-white rounded-3xl font-black text-sm flex items-center justify-center space-x-2 shadow-xl shadow-purple-200 active:scale-95 transition-all"
          >
            <Check size={20} />
            <span>Aplicar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
