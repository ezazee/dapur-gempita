import { useState, useEffect } from "react";
import { Search, FileText, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AuditLog } from "@/types/database";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function AuditLogsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableFilter, setTableFilter] = useState<string>("all");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs((data || []) as unknown as AuditLog[]);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal memuat audit log",
      });
    } finally {
      setLoading(false);
    }
  };

  const uniqueTables = [...new Set(logs.map(l => l.table_name))];

  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.table_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTable = tableFilter === "all" || l.table_name === tableFilter;
    return matchesSearch && matchesTable;
  });

  const getActionBadge = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create') || actionLower.includes('insert')) {
      return <Badge variant="default">CREATE</Badge>;
    }
    if (actionLower.includes('update')) {
      return <Badge variant="secondary">UPDATE</Badge>;
    }
    if (actionLower.includes('delete')) {
      return <Badge variant="destructive">DELETE</Badge>;
    }
    return <Badge variant="outline">{action}</Badge>;
  };

  return (
    <DashboardLayout
      title="Audit Log"
      description="Riwayat aktivitas sistem"
    >
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari aktivitas..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Semua Tabel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tabel</SelectItem>
              {uniqueTables.map((table) => (
                <SelectItem key={table} value={table}>
                  {table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Tabel</TableHead>
                <TableHead>Record ID</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery || tableFilter !== "all" ? "Tidak ada log yang cocok" : "Belum ada audit log"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.created_at), "d MMM yyyy HH:mm:ss", { locale: id })}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{log.table_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.record_id ? log.record_id.slice(0, 8) + '...' : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {log.ip_address || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
