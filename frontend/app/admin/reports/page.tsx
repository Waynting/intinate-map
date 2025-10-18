"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { authApi, reportsApi, type Report, type ReportStatus } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  ArrowLeft,
  Flag,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Eye,
  Filter,
} from "lucide-react";

export default function ReportsAdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Check admin authentication
    if (!authApi.isAuthenticated() || !authApi.isAdmin()) {
      router.push("/");
      return;
    }

    loadReports();
  }, [router]);

  useEffect(() => {
    // Apply filter
    if (statusFilter === "all") {
      setFilteredReports(reports);
    } else {
      setFilteredReports(reports.filter(r => r.status === statusFilter));
    }
  }, [statusFilter, reports]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await reportsApi.list({}, 20000, 0);
      setReports(data.reports);
      setFilteredReports(data.reports);
    } catch (error) {
      toast({
        title: "載入失敗",
        description: "無法載入報告列表",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, newStatus: ReportStatus) => {
    try {
      await reportsApi.updateStatus(reportId, newStatus);
      toast({
        title: "更新成功",
        description: `報告狀態已更新為${getStatusLabel(newStatus)}`,
      });
      // Reload reports
      loadReports();
    } catch (error) {
      toast({
        title: "更新失敗",
        description: "無法更新報告狀態",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("確定要刪除這個報告嗎？")) return;

    try {
      await reportsApi.delete(reportId);
      toast({
        title: "刪除成功",
        description: "報告已刪除",
      });
      setReports(reports.filter(r => r.id !== reportId));
    } catch (error) {
      toast({
        title: "刪除失敗",
        description: "無法刪除報告",
        variant: "destructive",
      });
    }
  };

  const getStatusLabel = (status: ReportStatus) => {
    const labels: Record<ReportStatus, string> = {
      open: "待處理",
      resolved: "已解決",
      rejected: "已拒絕",
    };
    return labels[status] || status;
  };

  const getStatusBadgeVariant = (status: ReportStatus) => {
    if (status === "open") return "default";
    if (status === "resolved") return "secondary";
    return "destructive";
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      data_fix: "資料修正",
      abuse: "濫用檢舉",
      safety: "安全問題",
    };
    return labels[type] || type;
  };

  const getStatusIcon = (status: ReportStatus) => {
    if (status === "open") return <Clock className="w-4 h-4" />;
    if (status === "resolved") return <CheckCircle2 className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  const stats = {
    open: reports.filter(r => r.status === "open").length,
    resolved: reports.filter(r => r.status === "resolved").length,
    rejected: reports.filter(r => r.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.push("/admin")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回管理後台
              </Button>
              <div className="flex items-center gap-2">
                <Flag className="w-6 h-6 text-red-500" />
                <h1 className="text-2xl font-bold">報告管理</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                待處理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.open}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                已解決
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.resolved}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                已拒絕
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="space-y-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-5 h-5" />
              篩選
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                全部 ({reports.length})
              </Button>
              <Button
                variant={statusFilter === "open" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("open")}
              >
                待處理 ({stats.open})
              </Button>
              <Button
                variant={statusFilter === "resolved" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("resolved")}
              >
                已解決 ({stats.resolved})
              </Button>
              <Button
                variant={statusFilter === "rejected" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("rejected")}
              >
                已拒絕 ({stats.rejected})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>報告列表</CardTitle>
            <CardDescription className="mt-2">
              共 {filteredReports.length} 個報告
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredReports.length === 0 ? (
              <EmptyState
                icon="🎉"
                title="沒有報告"
                description={
                  statusFilter === "all"
                    ? "目前沒有任何報告，系統運作正常。"
                    : `目前沒有「${getStatusLabel(statusFilter as ReportStatus)}」狀態的報告。`
                }
                secondaryAction={
                  statusFilter !== "all"
                    ? {
                        label: "查看全部",
                        onClick: () => setStatusFilter("all"),
                      }
                    : undefined
                }
              />
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="border rounded-lg p-5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(report.status)}
                          <Badge variant={getStatusBadgeVariant(report.status)}>
                            {getStatusLabel(report.status)}
                          </Badge>
                          <Badge variant="outline">
                            {getTypeLabel(report.type)}
                          </Badge>
                        </div>
                        <h3 className="font-medium mb-1">
                          {getTypeLabel(report.type)} 報告
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {report.payload?.description || report.payload?.reason || "無描述"}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          報告時間: {new Date(report.createdAt).toLocaleString("zh-TW")}
                        </div>
                        {report.reporter && (
                          <div className="text-xs text-muted-foreground">
                            報告者: {report.reporter.email}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t">
                      {report.placeId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/places/${report.placeId}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          查看場所
                        </Button>
                      )}
                      {report.status === "open" && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleUpdateStatus(report.id, "resolved")}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            標記為已解決
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleUpdateStatus(report.id, "rejected")}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            拒絕
                          </Button>
                        </>
                      )}
                      {report.status !== "open" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(report.id, "open")}
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          重新開啟
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteReport(report.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        刪除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
