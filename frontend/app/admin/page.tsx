"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authApi, placesApi, reviewsApi } from "@/lib/api";
import {
  Shield,
  Users,
  MapPin,
  MessageSquare,
  Flag,
  ArrowLeft,
  TrendingUp,
  Activity,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalPlaces: 0,
    totalReviews: 0,
    totalReports: 0,
    totalUsers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check admin authentication
    if (!authApi.isAuthenticated() || !authApi.isAdmin()) {
      router.push("/");
      return;
    }

    loadStats();
  }, [router]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      // Load basic statistics
      const placesData = await placesApi.list({ limit: 1 });
      const reviewsData = await reviewsApi.list({ limit: 1 });

      setStats({
        totalPlaces: placesData.count || 0,
        totalReviews: reviewsData.count || 0,
        totalReports: 0, // Will be implemented later
        totalUsers: 0, // Will be implemented later
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">管理後台</h1>
              </div>
            </div>
            <Button onClick={() => router.push("/profile")}>
              個人頁面
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Stats Overview */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            系統概覽
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="space-y-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  場所總數
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalPlaces}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  所有已註冊的場所
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-500" />
                  評論總數
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalReviews}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  所有用戶評論
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Flag className="w-4 h-4 text-red-500" />
                  待處理報告
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalReports}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  等待審核的報告
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  用戶總數
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  已註冊用戶
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            管理功能
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push("/admin/reports")}>
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2">
                  <Flag className="w-5 h-5 text-red-500" />
                  報告管理
                </CardTitle>
                <CardDescription className="mt-2">
                  審核和處理用戶提交的報告
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  前往管理
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push("/admin/places")}>
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  場所管理
                </CardTitle>
                <CardDescription className="mt-2">
                  管理所有場所資料，編輯和刪除
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  前往管理
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push("/admin/reviews")}>
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-500" />
                  評論管理
                </CardTitle>
                <CardDescription className="mt-2">
                  審核和管理所有用戶評論
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  前往管理
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push("/admin/users")}>
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  用戶管理
                </CardTitle>
                <CardDescription className="mt-2">
                  管理用戶帳戶和權限
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  前往管理
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
