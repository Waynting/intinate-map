"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ReviewForm, type ReviewFormData } from "@/components/places/ReviewForm";
import { authApi, placesApi, reviewsApi, type Place } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [place, setPlace] = useState<Place | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      router.push("/auth/login");
      return;
    }

    loadPlace();
  }, [resolvedParams.id, router]);

  const loadPlace = async () => {
    setIsLoading(true);
    try {
      const placeData = await placesApi.get(resolvedParams.id);
      setPlace(placeData);
    } catch (error) {
      toast({
        title: "載入失敗",
        description: "無法載入場所資料",
        variant: "destructive",
      });
      router.push("/places");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: ReviewFormData) => {
    if (!place) return;

    setIsSubmitting(true);
    try {
      await reviewsApi.create({
        placeId: place.id,
        rating: data.rating,
        content: data.content || undefined,
        tags: data.tags.length > 0 ? data.tags : undefined,
        isAnonymous: data.isAnonymous,
      });

      toast({
        title: "評論已提交",
        description: "感謝您的評論！",
      });

      router.push(`/places/${place.id}`);
    } catch (error: any) {
      toast({
        title: "提交失敗",
        description: error.response?.data?.message || "無法提交評論",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  if (!place) {
    return null;
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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <ReviewForm
          placeId={place.id}
          placeName={place.name}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
