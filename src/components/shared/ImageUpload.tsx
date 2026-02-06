import { useState } from "react";
import { Camera, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  className,
}: ImageUploadProps) {
  // Mock component since Supabase Storage is removed
  return (
    <div className={cn("space-y-4", className)}>
      <div className="border border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Upload foto dinonaktifkan sementara (Migrasi Storage).
        </p>
        <Button variant="ghost" disabled className="mt-2">
          <Camera className="h-4 w-4 mr-2" />
          Upload Foto
        </Button>
      </div>
    </div>
  );
}
