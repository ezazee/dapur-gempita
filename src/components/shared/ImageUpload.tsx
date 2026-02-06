import { useState, useRef } from "react";
import { Camera, X, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  entityType: string;
  entityId: string;
  onUploadComplete?: (url: string) => void;
  existingImages?: { id: string; file_url: string; file_name?: string }[];
  onImageDelete?: (imageId: string) => void;
  maxImages?: number;
  className?: string;
}

export function ImageUpload({
  entityType,
  entityId,
  onUploadComplete,
  existingImages = [],
  onImageDelete,
  maxImages = 5,
  className,
}: ImageUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState(existingImages);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length >= maxImages) {
      toast({
        variant: "destructive",
        title: "Batas tercapai",
        description: `Maksimal ${maxImages} foto`,
      });
      return;
    }

    const file = files[0];
    
    // Validate file type
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast({
        variant: "destructive",
        title: "Format tidak didukung",
        description: "Gunakan format JPEG, PNG, atau WebP",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File terlalu besar",
        description: "Ukuran maksimal 5MB",
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${entityType}/${entityId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('report-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('report-images')
        .getPublicUrl(fileName);

      // Save to report_images table
      const { data: imageRecord, error: dbError } = await supabase
        .from('report_images')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setImages([...images, { id: imageRecord.id, file_url: urlData.publicUrl, file_name: file.name }]);
      onUploadComplete?.(urlData.publicUrl);

      toast({
        title: "Berhasil",
        description: "Foto berhasil diunggah",
      });
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Gagal mengunggah",
        description: (error as Error).message,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('report_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      setImages(images.filter(img => img.id !== imageId));
      onImageDelete?.(imageId);

      toast({
        title: "Berhasil",
        description: "Foto berhasil dihapus",
      });
    } catch (error: unknown) {
      console.error('Delete error:', error);
      toast({
        variant: "destructive",
        title: "Gagal menghapus",
        description: (error as Error).message,
      });
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {images.map((image) => (
            <div key={image.id} className="relative group aspect-square rounded-lg overflow-hidden border">
              <img
                src={image.file_url}
                alt={image.file_name || 'Uploaded image'}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handleDelete(image.id)}
                className="absolute top-1 right-1 p-1 bg-destructive/90 text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {images.length < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mengunggah...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Unggah Foto Bukti
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            JPEG, PNG, atau WebP. Maks 5MB. ({images.length}/{maxImages} foto)
          </p>
        </div>
      )}
    </div>
  );
}
