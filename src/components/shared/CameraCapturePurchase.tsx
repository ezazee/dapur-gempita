'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Camera, X, Upload } from 'lucide-react';
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoImgRef = useRef<HTMLImageElement | null>(null);
    const secondaryLogoRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        const watermarkImg = new window.Image();
        watermarkImg.src = '/Logo_Yayasan_GEMPITA.png';
        watermarkImg.crossOrigin = 'anonymous';
        watermarkImg.onload = () => {
            logoImgRef.current = watermarkImg;
        };

        const secondaryImg = new window.Image();
        secondaryImg.src = '/Logo SPPG Bengkulu.png';
        secondaryImg.crossOrigin = 'anonymous';
        secondaryImg.onload = () => {
            secondaryLogoRef.current = secondaryImg;
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

    const applyWatermarkAndCapture = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {

        const now = new Date();

        const getDayName = (d: number) =>
            ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d];

        const getMonthName = (m: number) =>
            ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][m];

        const dayName = getDayName(now.getDay());
        const dateStr = `${dayName}, ${now.getDate()} ${getMonthName(now.getMonth())} ${now.getFullYear()}`;

        const timeStr =
            `${now.getHours().toString().padStart(2, '0')}:` +
            `${now.getMinutes().toString().padStart(2, '0')}:` +
            `${now.getSeconds().toString().padStart(2, '0')}`;

        const padding = canvas.width * 0.03;

        const fontSize = canvas.width * 0.028;
        const timeSize = fontSize * 1.9;

        // bar background (lighter or gradient)
        // If we use the black-text BGN logo, we should probably have a lighter background or high contrast.
        // The user wants BGN below Gempita.
        const barHeight = fontSize * 7.5; // TALLER BAR FOR STACKED LOGOS
        const barY = canvas.height - barHeight;

        const gradient = context.createLinearGradient(0, barY, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(255,255,255,0)');
        gradient.addColorStop(0.1, 'rgba(255,255,255,0.95)'); // White background for black-text logos
        gradient.addColorStop(1, 'rgba(240,240,240,1)');
        context.fillStyle = gradient;
        context.fillRect(0, barY, canvas.width, barHeight);

        // LOGO PLACEMENT (STACKED)
        const logoHeight = (barHeight - padding * 2) / 2.2;
        
        // 1. Gempita Logo (Top)
        if (logoImgRef.current) {
            const logo = logoImgRef.current;
            const logoWidth = (logo.width / logo.height) * logoHeight;
            context.drawImage(logo, padding, barY + padding * 0.8, logoWidth, logoHeight);
        }

        // 2. BGN Logo (Bottom)
        if (secondaryLogoRef.current) {
            const logo = secondaryLogoRef.current;
            const logoWidth = (logo.width / logo.height) * logoHeight;
            context.drawImage(logo, padding, barY + logoHeight + padding * 1.2, logoWidth, logoHeight);
        }

        // TEXT SETTINGS
        context.textAlign = "right";
        context.textBaseline = "bottom";
        context.shadowColor = "rgba(0,0,0,0.6)";
        context.shadowBlur = 6;

        // DATE (Bottom-most)
        context.fillStyle = "#000000"; 
        context.font = `600 ${fontSize}px Arial`;
        const dateY = canvas.height - padding;
        context.fillText(dateStr, canvas.width - padding, dateY);

        // TIME (Above Date)
        context.fillStyle = '#1e3a8a';
        context.font = `900 ${timeSize}px Arial`;
        const timeY = dateY - fontSize - 5;
        context.fillText(timeStr, canvas.width - padding, timeY);

        context.shadowColor = "transparent";
        context.shadowBlur = 0;

        const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);

        onCapture(imageDataUrl);

        stopCamera();
        setIsOpen(false);
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

        applyWatermarkAndCapture(canvas, context);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
                if (!canvasRef.current) return;
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (!context) return;

                // Set canvas size to image natural size
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;

                // Draw image
                context.drawImage(img, 0, 0, canvas.width, canvas.height);

                applyWatermarkAndCapture(canvas, context);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);

        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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
                        <div className="relative h-16 w-16 overflow-hidden rounded border">
                            <Image
                                src={currentImage}
                                alt="Foto Barang"
                                fill
                                className="object-cover"
                            />
                        </div>
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
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleOpen}
                            className="h-8"
                        >
                            <Camera className="h-4 w-4 mr-1" />
                            Kamera
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-8"
                        >
                            <Upload className="h-4 w-4 mr-1" />
                            Upload
                        </Button>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </div>
                )}
            </div>

            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Ambil Foto Barang</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="relative bg-black rounded-lg overflow-hidden flex justify-center items-center min-h-[300px]">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-auto max-h-[60vh] object-contain"
                            />
                        </div>
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

            {/* Hidden canvas for both camera and file upload processing */}
            <canvas ref={canvasRef} className="hidden" />
        </>
    );
}
