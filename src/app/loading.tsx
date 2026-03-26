import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function Loading() {
    return (
        <DashboardLayout title="Memuat..." description="Mohon tunggu sebentar">
            <div className="space-y-6">
                {/* Stats Grid Skeleton */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array(4).fill(0).map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                </div>

                {/* Main Content Grid Skeleton */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <Skeleton className="h-[500px] rounded-xl" />
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-[250px] rounded-xl" />
                        <Skeleton className="h-[250px] rounded-xl" />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
