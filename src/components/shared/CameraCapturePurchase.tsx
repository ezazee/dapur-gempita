'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CameraCapturePurchaseProps {
    onCapture: (imageDataUrl: string) => void;
    currentImage?: string;
    onRemove?: () => void;
}

export function CameraCapturePurchase({ onCapture, currentImage, onRemove }: CameraCapturePurchaseProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Use back camera on mobile
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Set canvas size to video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Add timestamp watermark
        const now = new Date();
        const timestamp = now.toLocaleString('id-ID', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // Watermark styling
        const fontSize = Math.max(canvas.width * 0.03, 16);
        context.font = `bold ${fontSize}px Arial`;
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        context.lineWidth = 3;

        // Position at bottom-right
        const padding = 10;
        const textWidth = context.measureText(timestamp).width;
        const x = canvas.width - textWidth - padding;
        const y = canvas.height - padding;

        // Draw background rectangle
        context.fillRect(x - 5, y - fontSize - 5, textWidth + 10, fontSize + 10);

        // Draw text with outline
        context.strokeText(timestamp, x, y);
        context.fillStyle = 'white';
        context.fillText(timestamp, x, y);

        // Get image data
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(imageDataUrl);

        // Close dialog and stop camera
        stopCamera();
        setIsOpen(false);
    };

    const handleClose = () => {
        stopCamera();
        setIsOpen(false);
    };

    const handleOpen = () => {
        setIsOpen(true);
        setTimeout(() => startCamera(), 100);
    };

    return (
        <>
            <div className="flex gap-2 items-center">
                {currentImage ? (
                    <div className="relative group">
                        <img
                            src={currentImage}
                            alt="Foto Barang"
                            className="h-16 w-16 object-cover rounded border"
                        />
                        {onRemove && (
                            <button
                                type="button"
                                onClick={onRemove}
                                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpen}
                        className="h-8"
                    >
                        <Camera className="h-4 w-4 mr-1" />
                        Foto
                    </Button>
                )}
            </div>

            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Ambil Foto Barang</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="relative bg-black rounded-lg overflow-hidden">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-auto"
                            />
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={handleClose}>
                                Batal
                            </Button>
                            <Button onClick={capturePhoto} disabled={!stream}>
                                <Camera className="mr-2 h-4 w-4" />
                                Ambil Foto
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
