"use client";

import React, { useState, useEffect, useRef } from "react";
import { Camera, X, AlertCircle, ScanBarcode, ArrowRight, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function CameraScannerModal({ isOpen, onClose, onScan }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError("");
    setScanning(true);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera video access is not supported by your browser or environment.");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }

      // Check if torch/flashlight is supported
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() || {};
      if (capabilities.torch) {
        setHasTorch(true);
      }

      // Initialize BarcodeDetector if available
      initBarcodeDetection(mediaStream);
    } catch (err) {
      console.warn("Camera start failed:", err);
      setCameraError(err.message || "Could not access device camera. Please check camera permissions.");
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setScanning(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(!torchOn);
    } catch (err) {
      console.warn("Torch failed:", err);
    }
  };

  const initBarcodeDetection = (mediaStream) => {
    if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
      // Browser does not support native BarcodeDetector; fallback to interval or manual
      return;
    }

    try {
      const barcodeDetector = new window.BarcodeDetector({
        formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code"],
      });

      let active = true;

      const detectLoop = async () => {
        if (!active || !videoRef.current) return;

        try {
          if (videoRef.current.readyState >= 2) {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawVal = barcodes[0].rawValue;
              if (rawVal) {
                active = false;
                onScan(rawVal);
                onClose();
                return;
              }
            }
          }
        } catch {}

        if (active) {
          requestAnimationFrame(detectLoop);
        }
      };

      requestAnimationFrame(detectLoop);
    } catch (err) {
      console.warn("BarcodeDetector init error:", err);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    onScan(code);
    setManualCode("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#0b0b0b] text-white shadow-2xl overflow-hidden border border-[#2e2a25]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#262420]">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-[#1f1d1a] text-[#d8b46a] border border-[#3a342a] flex items-center justify-center">
              <Camera size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Camera Barcode Scanner</h3>
              <p className="text-[11px] text-[#9c9489]">Hold barcode inside target frame</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-1.5 rounded-full transition-colors ${torchOn ? "bg-[#d8b46a] text-black" : "text-[#9c9489] hover:text-white"}`}
                title="Toggle Flashlight"
              >
                <Zap size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[#9c9489] hover:text-white p-1 rounded-full hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center max-w-xs space-y-3">
              <AlertCircle size={32} className="mx-auto text-[#e06d53]" />
              <p className="text-xs text-[#d89080]">{cameraError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={startCamera}
                className="h-8 text-xs bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                <RefreshCw size={13} className="mr-1.5" /> Retry Camera
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Scanning Target Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-64 h-36 border-2 border-[#d8b46a]/60 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                  {/* Neon laser scan line */}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#d8b46a] to-transparent animate-pulse top-1/2 -translate-y-1/2" />
                  
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 size-3 border-t-2 border-l-2 border-[#d8b46a]" />
                  <div className="absolute -top-1 -right-1 size-3 border-t-2 border-r-2 border-[#d8b46a]" />
                  <div className="absolute -bottom-1 -left-1 size-3 border-b-2 border-l-2 border-[#d8b46a]" />
                  <div className="absolute -bottom-1 -right-1 size-3 border-b-2 border-r-2 border-[#d8b46a]" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Manual Barcode Input Fallback */}
        <div className="p-4 border-t border-[#262420] bg-[#121212] space-y-2">
          <p className="text-[10px] text-[#9c9489] uppercase tracking-wider font-semibold">
            Or type barcode manually
          </p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-2.5 top-2.5 size-4 text-[#706a61]" />
              <Input
                type="text"
                placeholder="e.g. 890123456789 or SKU"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="pl-8 h-9 text-xs bg-[#1a1a1a] text-white border-[#333] placeholder:text-[#555] focus:border-[#d8b46a]"
              />
            </div>
            <Button
              type="submit"
              variant="gold"
              size="sm"
              disabled={!manualCode.trim()}
              className="h-9 px-4 text-xs font-semibold shrink-0"
            >
              Add <ArrowRight size={13} className="ml-1" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

