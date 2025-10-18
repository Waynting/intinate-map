"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { authApi, reviewsApi, placesApi, favoritesApi, type Review, type Place, type Favorite } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  ArrowLeft,
  Star,
  MapPin,
  MessageSquare,
  Calendar,
  Award,
  Edit,
  Trash2,
  Plus,
  Heart,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";

export default function ProfilePage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myPlaces, setMyPlaces] = useState<Place[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myPlacesExpanded, setMyPlacesExpanded] = useState(true);
  const [myPlacesTypeFilter, setMyPlacesTypeFilter] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push("/auth/login");
      return;
    }

    const user = authApi.getCurrentUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setCurrentUser(user);
    loadUserData(user.id);
  }, [router]);

  const loadUserData = async (userId: string) => {
    setIsLoading(true);
    try {
      const [reviewsData, placesData, favoritesData] = await Promise.all([
        reviewsApi.listByUser(userId),
        placesApi.list({ createdBy: userId, limit: 20000 }),
        favoritesApi.list(),
      ]);
      setReviews(reviewsData.reviews);
      setMyPlaces(placesData.places);
      setFavorites(favoritesData.favorites);
    } catch (error) {
      toast({
        title: "載入失敗",
        description: "無法載入個人資料",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReview = async (review: Review) => {
    if (!confirm("確定要刪除這則評論嗎？")) {
      return;
    }

    try {
      await reviewsApi.delete(review.id);
      toast({
        title: "刪除成功",
        description: "評論已刪除",
      });
      setReviews(reviews.filter((r) => r.id !== review.id));
    } catch (error) {
      toast({
        title: "刪除失敗",
        description: "無法刪除評論",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlace = async (place: Place) => {
    if (!confirm(`確定要刪除「${place.name}」嗎？`)) {
      return;
    }

    try {
      await placesApi.delete(place.id);
      toast({
        title: "刪除成功",
        description: "場所已刪除",
      });
      setMyPlaces(myPlaces.filter((p) => p.id !== place.id));
    } catch (error) {
      toast({
        title: "刪除失敗",
        description: "無法刪除場所",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFavorite = async (favorite: Favorite) => {
    if (!confirm(`確定要取消收藏「${favorite.place.name}」嗎？`)) {
      return;
    }

    try {
      await favoritesApi.remove(favorite.id);
      toast({
        title: "取消成功",
        description: "已從收藏中移除",
      });
      setFavorites(favorites.filter((f) => f.id !== favorite.id));
    } catch (error) {
      toast({
        title: "取消失敗",
        description: "無法取消收藏",
        variant: "destructive",
      });
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      user: "一般用戶",
      admin: "管理員",
      moderator: "版主",
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "admin") return "destructive";
    if (role === "moderator") return "default";
    return "secondary";
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const getFilteredMyPlaces = () => {
    if (!myPlacesTypeFilter) return myPlaces;
    return myPlaces.filter((place) => place.type === myPlacesTypeFilter);
  };

  const getPlaceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      hotel: "飯店",
      motel: "汽車旅館",
      guesthouse: "民宿",
    };
    return labels[type] || type;
  };

  const getPlaceTypeCounts = () => {
    const counts: Record<string, number> = {
      hotel: 0,
      motel: 0,
      guesthouse: 0,
    };
    myPlaces.forEach((place) => {
      if (counts[place.type] !== undefined) {
        counts[place.type]++;
      }
    });
    return counts;
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
        <div className="container mx-auto px-4 py-3">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Sidebar - User Info */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{currentUser?.email}</CardTitle>
                    <div className="mt-1">
                      <Badge variant={getRoleBadgeVariant(currentUser?.role)}>
                        {getRoleLabel(currentUser?.role)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{reviews.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">則評論</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{myPlaces.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">個場所</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{favorites.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">個收藏</div>
                    </div>
                  </div>

                  {/* Average Rating */}
                  {reviews.length > 0 && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        <span className="text-xl font-bold">{calculateAverageRating()}</span>
                        <span className="text-sm text-muted-foreground">平均評分</span>
                      </div>
                    </div>
                  )}

                  {/* Member Since */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>會員</span>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 space-y-3 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push("/places")}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      瀏覽場所
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push("/places/new")}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      新增場所
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievement Card (if admin/moderator) */}
            {(currentUser?.role === "admin" || currentUser?.role === "moderator") && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    管理權限
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => router.push("/admin/reports")}
                  >
                    前往管理後台
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Content - Favorites, Reviews and Places */}
          <div className="md:col-span-2 space-y-6">
            {/* My Favorites */}
            <Card>
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  我的收藏 ({favorites.length})
                </CardTitle>
                <CardDescription className="mt-2">
                  您收藏的場所
                </CardDescription>
              </CardHeader>
              <CardContent>
                {favorites.length === 0 ? (
                  <EmptyState
                    icon="❤️"
                    title="尚無收藏"
                    description="探索並收藏您喜歡的場所，隨時查看與管理收藏清單。"
                    primaryAction={{
                      label: "開始探索",
                      onClick: () => router.push("/places"),
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    {favorites.map((favorite) => (
                      <div
                        key={favorite.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/places/${favorite.place.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{favorite.place.name}</h3>
                              <Badge variant="secondary">
                                {favorite.place.type === "hotel"
                                  ? "飯店"
                                  : favorite.place.type === "motel"
                                  ? "汽車旅館"
                                  : "民宿"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {favorite.place.address}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              {favorite.place.googleRating && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                  <span>{favorite.place.googleRating.toFixed(1)}</span>
                                  <span className="text-xs">
                                    ({favorite.place.googleRatingsTotal?.toLocaleString()})
                                  </span>
                                </div>
                              )}
                              {favorite.place.reviewCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="w-4 h-4" />
                                  <span>{favorite.place.reviewCount} 則評論</span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              收藏於 {new Date(favorite.createdAt).toLocaleDateString("zh-TW")}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/places/${favorite.place.id}`);
                              }}
                            >
                              查看
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFavorite(favorite);
                              }}
                            >
                              <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Reviews */}
            <Card>
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  我的評論 ({reviews.length})
                </CardTitle>
                <CardDescription className="mt-2">
                  您撰寫的所有評論
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <EmptyState
                    icon="💬"
                    title="尚無評論"
                    description="分享您的體驗，幫助其他人做出更好的選擇。"
                    primaryAction={{
                      label: "開始探索",
                      onClick: () => router.push("/places"),
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {review.isAnonymous ? "匿名評論" : "公開評論"}
                              </span>
                              <div className="flex items-center">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString("zh-TW")}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(`/places/${review.placeId}`)
                              }
                            >
                              查看場所
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReview(review)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {review.content && (
                          <p className="text-sm mt-2">{review.content}</p>
                        )}
                        {review.tags && review.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {review.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Places */}
            <Card>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      我創建的場所 ({myPlaces.length})
                    </CardTitle>
                    <CardDescription className="mt-2">
                      您新增到系統的場所
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMyPlacesExpanded(!myPlacesExpanded)}
                  >
                    {myPlacesExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              {myPlacesExpanded && (
                <CardContent>
                  {myPlaces.length === 0 ? (
                    <EmptyState
                      icon="📍"
                      title="尚未新增場所"
                      description="成為貢獻者，新增您知道的優質場所到系統中。"
                      primaryAction={{
                        label: "新增第一個場所",
                        onClick: () => router.push("/places/new"),
                      }}
                    />
                  ) : (
                    <>
                      {/* Type Filter */}
                      <div className="mb-4 pb-4 border-b">
                        <div className="flex items-center gap-2 mb-3">
                          <Filter className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">類型篩選</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant={myPlacesTypeFilter === null ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMyPlacesTypeFilter(null)}
                          >
                            全部 ({myPlaces.length})
                          </Button>
                          {Object.entries(getPlaceTypeCounts()).map(([type, count]) => (
                            count > 0 && (
                              <Button
                                key={type}
                                variant={myPlacesTypeFilter === type ? "default" : "outline"}
                                size="sm"
                                onClick={() => setMyPlacesTypeFilter(type)}
                              >
                                {getPlaceTypeLabel(type)} ({count})
                              </Button>
                            )
                          ))}
                        </div>
                      </div>

                      {/* Places List */}
                      <div className="space-y-4">
                        {getFilteredMyPlaces().length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>此類型沒有場所</p>
                          </div>
                        ) : (
                          getFilteredMyPlaces().map((place) => (
                            <div
                              key={place.id}
                              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium">{place.name}</h3>
                                    <Badge variant="secondary">
                                      {getPlaceTypeLabel(place.type)}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {place.address}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                    <span>{place.reviewCount} 則評論</span>
                                    {place.averageRating && (
                                      <div className="flex items-center gap-1">
                                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                        <span>{place.averageRating.toFixed(1)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/places/${place.id}`)}
                                  >
                                    查看
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/places/edit/${place.id}`)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeletePlace(place)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
