'use client';

import { useState, useRef, useEffect } from 'react';
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
    const logoImgRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        const img = new Image();
        img.src = '/Logo.png';
        img.onload = () => {
            logoImgRef.current = img;
        };
    }, []);

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

        // Custom formatting to ensure it's always very clear
        const now = new Date();
        const getDayName = (d: number) => ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d];
        const getMonthName = (m: number) => ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][m];
        
        const dayName = getDayName(now.getDay());
        const dateStr = `${dayName}, ${now.getDate()} ${getMonthName(now.getMonth())} ${now.getFullYear()}`;
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        const fontSize = Math.max(canvas.width * 0.035, 18);
        const padding = Math.max(canvas.width * 0.03, 15);
        
        // Draw bottom bar overlay
        const barHeight = fontSize * 4;
        const barY = canvas.height - barHeight;
        
        // Add a nice gradient
        const gradient = context.createLinearGradient(0, barY, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
        gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
        context.fillStyle = gradient;
        context.fillRect(0, barY, canvas.width, barHeight);

        // Logo
        if (logoImgRef.current) {
            const logo = logoImgRef.current;
            const maxLogoHeight = barHeight * 0.7;
            const logoHeight = Math.min(maxLogoHeight, 120);
            const logoWidth = (logo.width / logo.height) * logoHeight;
            const logoX = padding;
            // Vertically center in the dark part of the gradient
            const logoY = canvas.height - (barHeight * 0.5) - (logoHeight / 2) + (barHeight * 0.15); 
            context.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
        }

        // Text
        context.textAlign = 'right';
        context.textBaseline = 'bottom';
        context.shadowColor = 'rgba(0,0,0,0.8)';
        context.shadowBlur = 4;
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        
        // Time
        context.fillStyle = '#ffde59'; // vibrant yellow
        context.font = `900 ${fontSize * 1.5}px Arial, sans-serif`;
        context.fillText(timeStr, canvas.width - padding, canvas.height - padding - fontSize - 5);

        // Date
        context.fillStyle = '#ffffff';
        context.font = `bold ${fontSize}px Arial, sans-serif`;
        context.fillText(dateStr, canvas.width - padding, canvas.height - padding);

        // Reset shadow before getting image
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;

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
