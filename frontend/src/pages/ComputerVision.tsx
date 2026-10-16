import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Camera as CamIcon, Upload, Play, AlertCircle, CheckCircle,
  Image, MapPin, RefreshCw, Info
} from 'lucide-react';
import { fetchCameras, detectObjects, createIncidentFromDetection, fetchBuildings, Camera, Building } from '../api';
import { formatDate } from '../utils';

interface DetectionResult {
  detection_id: number;
  processing_mode: string;
  detections: Array<{
    id: number;
    label: string;
    confidence: number | null;
    bbox: { x: number; y: number; width: number; height: number };
    method: string;
    note?: string;
  }>;
  image_width: number;
  image_height: number;
  timestamp: string;
  image_url: string;
}

const CAMERA_STATUS_COLORS: Record<string, string> = {
  demo: '#D89A35',
  connected: '#2E6B45',
  offline: '#C94A42',
  unconfigured: '#6D716A',
};

export default function ComputerVision() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [incidentCreated, setIncidentCreated] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<number>(0);
  const [severity, setSeverity] = useState('medium');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCameras().then(c => {
      setCameras(c);
      if (c.length > 0) setSelectedCamera(c[0]);
    });
    fetchBuildings().then(setBuildings);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Maximum 10 MB.');
      return;
    }
    setError(null);
    setResult(null);
    setIncidentCreated(false);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const drawBoundingBoxes = useCallback((res: DetectionResult) => {
    const canvas = canvasRef.current;
    if (!canvas || !imagePreview) return;
    const img = new window.Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      res.detections.forEach(det => {
        const { x, y, width, height } = det.bbox;
        const isDemo = det.method === 'demo_simulation';
        ctx.strokeStyle = isDemo ? '#D89A35' : '#2E6B45';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
        // Label background
        const label = `${det.label.replace(/_/g, ' ')}${det.confidence ? ` ${(det.confidence * 100).toFixed(0)}%` : ''}`;
        ctx.fillStyle = isDemo ? 'rgba(216,154,53,0.9)' : 'rgba(46,107,69,0.9)';
        ctx.fillRect(x, y - 22, label.length * 8 + 12, 22);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        ctx.fillText(label, x + 6, y - 6);
      });
    };
    img.src = imagePreview;
  }, [imagePreview]);

  useEffect(() => {
    if (result && imagePreview) {
      drawBoundingBoxes(result);
    }
  }, [result, imagePreview, drawBoundingBoxes]);

  const runDetection = async () => {
    if (!imageFile) return;
    setDetecting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', imageFile);
      if (selectedCamera) fd.append('camera_id', String(selectedCamera.id));
      if (selectedBuilding) fd.append('building_id', String(selectedBuilding));
      const res = await detectObjects(fd);
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDetecting(false);
    }
  };

  const handleCreateIncident = async () => {
    if (!result || !selectedBuilding) return;
    try {
      await createIncidentFromDetection({
        detection_id: result.detection_id,
        building_id: selectedBuilding,
        severity,
        location_desc: selectedCamera ? `${selectedCamera.name} — ${selectedCamera.location}` : undefined,
      });
      setIncidentCreated(true);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#332820] flex items-center gap-2">
            <CamIcon size={24} className="text-[#C19A6B]" />
            Computer Vision & CCTV Analytics
          </h1>
          <p className="text-sm text-[#6D716A] mt-0.5">
            Automated waste accumulation, overflow, and litter detection from campus imagery
          </p>
        </div>
        <button className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          onClick={() => fetchCameras().then(c => { setCameras(c); })}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera selector panel */}
        <div className="card-surface p-5 shadow-sm space-y-4">
          <p className="text-xs font-bold text-[#6D716A] uppercase tracking-wider">
            Campus Cameras & Feeds
          </p>
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {cameras.map(cam => (
              <div
                key={cam.id}
                onClick={() => setSelectedCamera(cam)}
                className={`p-3 rounded-lg cursor-pointer border transition-all text-sm ${
                  selectedCamera?.id === cam.id
                    ? 'border-[#2E6B45] bg-[#F5F0E7] shadow-xs'
                    : 'border-[#E8DDCB] bg-white hover:border-[#C19A6B]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[#332820]">{cam.name}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      color: CAMERA_STATUS_COLORS[cam.status],
                      background: `${CAMERA_STATUS_COLORS[cam.status]}18`,
                    }}
                  >
                    {cam.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#6D716A]">
                  <MapPin size={12} className="text-[#C19A6B]" />
                  <span>{cam.location || 'Location unset'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Selected camera details */}
          {selectedCamera && (
            <div className="p-3 bg-[#F5F0E7] rounded-lg border border-[#E8DDCB]">
              <p className="font-semibold text-sm text-[#332820] mb-0.5">{selectedCamera.name}</p>
              <p className="text-xs text-[#6D716A] mb-2">{selectedCamera.location}</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: CAMERA_STATUS_COLORS[selectedCamera.status] }}
                />
                <span className="text-xs font-medium" style={{ color: CAMERA_STATUS_COLORS[selectedCamera.status] }}>
                  {selectedCamera.status === 'demo' && 'Demo Feed Mode (Simulated)'}
                  {selectedCamera.status === 'connected' && 'Live RTSP Feed Connected'}
                  {selectedCamera.status === 'offline' && 'Offline / Unreachable'}
                  {selectedCamera.status === 'unconfigured' && 'Stream URL Not Configured'}
                </span>
              </div>
              <p className="text-[11px] text-[#6D716A] mt-1.5">
                {selectedCamera.last_seen
                  ? `Last telemetry heartbeat: ${formatDate(selectedCamera.last_seen)}`
                  : 'Heartbeat status: Active'}
              </p>
            </div>
          )}
        </div>

        {/* Detection workspace */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image upload */}
          <div className="card-surface p-5 shadow-sm">
            <p className="text-xs font-bold text-[#6D716A] uppercase tracking-wider mb-3">
              Image Analysis Workspace
            </p>

            <div className="bg-[#F5F0E7] border border-[#E8DDCB] rounded-lg p-3 mb-4 text-xs text-[#332820] flex items-start gap-2">
              <Info size={16} className="shrink-0 mt-0.5 text-[#C19A6B]" />
              <span className="leading-relaxed">
                Upload a campus photograph to evaluate waste presence and overflow. Processes with OpenCV contour color thresholding or YOLOv8 when available. Results are analytical aids with full bounding box metrics.
              </span>
            </div>

            <div
              className="border-2 border-dashed border-[#C19A6B]/50 hover:border-[#2E6B45] bg-[#F5F0E7]/40 rounded-xl p-8 text-center cursor-pointer transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) {
                  const fakeEv = { target: { files: [f] } } as any;
                  handleFileChange(fakeEv);
                }
              }}
            >
              {imagePreview ? (
                <div className="text-xs text-[#332820]">
                  <Image size={24} className="mx-auto mb-1.5 text-[#2E6B45]" />
                  <p className="font-semibold text-sm">{imageFile?.name}</p>
                  <p className="text-[#6D716A] mt-0.5">{(imageFile!.size / 1024).toFixed(0)} KB · Click to choose a different image</p>
                </div>
              ) : (
                <div>
                  <Upload size={28} className="mx-auto mb-2 text-[#C19A6B]" />
                  <p className="text-sm font-semibold text-[#332820]">Drop campus image or click to browse</p>
                  <p className="text-xs text-[#6D716A] mt-1">JPEG, PNG, WebP · Up to 10 MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />

            <div className="flex items-center gap-3 mt-4">
              <select className="nexus-input flex-1"
                value={selectedBuilding} onChange={e => setSelectedBuilding(Number(e.target.value))}>
                <option value={0}>Select building (for incident linking)</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button
                className="btn-primary flex items-center gap-2 shrink-0"
                onClick={runDetection}
                disabled={!imageFile || detecting}
              >
                {detecting ? <div className="spinner" /> : <Play size={14} />}
                {detecting ? 'Analysing…' : 'Run Detection'}
              </button>
            </div>

            {error && (
              <div className="mt-3 text-xs text-[#C94A42] flex items-center gap-1.5 bg-red-50 p-2.5 rounded-lg border border-red-200">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Results */}
          {result && (
            <div className="card-surface p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-[#6D716A] uppercase tracking-wider">Detection Results</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    result.processing_mode === 'demo'
                      ? 'bg-amber-100 text-[#D89A35] border border-amber-300'
                      : 'bg-emerald-100 text-[#2E6B45] border border-emerald-300'
                  }`}>
                    {result.processing_mode === 'demo' ? '⚠ Demo Simulation Mode' : `✓ ${result.processing_mode}`}
                  </span>
                </div>
              </div>

              {result.processing_mode === 'demo' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-[#332820] mb-4">
                  These detections are generated via baseline analytical rules. Install OpenCV or YOLO weights for live camera inferencing.
                </div>
              )}

              {/* Canvas with bounding boxes */}
              <div className="relative overflow-hidden rounded-xl border border-[#E8DDCB] bg-black/5 mb-4 flex justify-center">
                <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg" style={{ display: imagePreview ? 'block' : 'none' }} />
              </div>

              {/* Detection table */}
              <div className="overflow-x-auto rounded-lg border border-[#E8DDCB] mb-4">
                <table className="nexus-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Label</th>
                      <th>Confidence</th>
                      <th>Bounding Box</th>
                      <th>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.detections.map(det => (
                      <tr key={det.id}>
                        <td className="text-[#6D716A] font-mono">{det.id}</td>
                        <td className="font-semibold text-[#332820] capitalize">{det.label.replace(/_/g, ' ')}</td>
                        <td>
                          {det.confidence !== null
                            ? <span className="font-semibold text-[#2E6B45]">{(det.confidence * 100).toFixed(1)}%</span>
                            : <span className="text-[#6D716A]">N/A (demo)</span>}
                        </td>
                        <td className="font-mono text-xs text-[#6D716A]">
                          {det.bbox.x},{det.bbox.y} {det.bbox.width}×{det.bbox.height}
                        </td>
                        <td className="text-xs text-[#6D716A]">{det.method}</td>
                      </tr>
                    ))}
                    {result.detections.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-[#6D716A] py-4">No waste objects detected in this image</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Create incident */}
              {!incidentCreated && result.detections.length > 0 && (
                <div className="flex items-center gap-3 p-4 bg-[#F5F0E7] rounded-lg border border-[#E8DDCB]">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#332820] mb-1">Create Waste Incident from Detection</p>
                    <div className="flex gap-2">
                      <select className="nexus-input text-xs" value={selectedBuilding}
                        onChange={e => setSelectedBuilding(Number(e.target.value))}>
                        <option value={0}>Select building</option>
                        {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <select className="nexus-input text-xs" value={severity} onChange={e => setSeverity(e.target.value)}>
                        <option value="low">Low Severity</option>
                        <option value="medium">Medium Severity</option>
                        <option value="high">High Severity</option>
                        <option value="critical">Critical Severity</option>
                      </select>
                    </div>
                  </div>
                  <button
                    className="btn-primary shrink-0 text-xs py-2 px-3"
                    onClick={handleCreateIncident}
                    disabled={!selectedBuilding}
                  >
                    Create Incident
                  </button>
                </div>
              )}

              {incidentCreated && (
                <div className="flex items-center gap-2 text-sm text-[#2E6B45] p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <CheckCircle size={16} />
                  Incident successfully created and linked to building. View in Waste Management.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
