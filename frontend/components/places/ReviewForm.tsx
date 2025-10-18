"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReviewTag } from "@/lib/api";
import { Star, Check } from "lucide-react";

export interface ReviewFormData {
  rating: number;
  content: string;
  tags: ReviewTag[];
  isAnonymous: boolean;
}

interface ReviewFormProps {
  placeId: string;
  placeName: string;
  onSubmit: (data: ReviewFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function ReviewForm({
  placeId,
  placeName,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ReviewFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<ReviewTag[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(true);

  const tagOptions: { value: ReviewTag; label: string; description: string }[] = [
    { value: "clean", label: "清潔", description: "環境乾淨整潔" },
    { value: "privacy", label: "隱私", description: "隱私性良好" },
    { value: "quiet", label: "安靜", description: "環境安靜" },
    { value: "comfortable", label: "舒適", description: "舒適度高" },
    { value: "friendly_staff", label: "服務好", description: "服務態度佳" },
    { value: "value", label: "CP值高", description: "性價比高" },
    { value: "spacious", label: "寬敞", description: "空間寬敞" },
    { value: "safe", label: "安全", description: "安全性高" },
  ];

  const handleTagToggle = (tag: ReviewTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert("請選擇評分");
      return;
    }
    onSubmit({
      rating,
      content: content.trim(),
      tags: selectedTags,
      isAnonymous,
    });
  };

  const displayRating = hoverRating || rating;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>撰寫評論</CardTitle>
        <CardDescription>{placeName}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Rating */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">評分 *</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="transition-transform hover:scale-110 focus:outline-none"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <Star
                    className={`w-8 h-8 ${
                      value <= displayRating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating > 0 ? `${rating} 星` : "請選擇評分"}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-sm font-semibold">
              評論內容
            </Label>
            <Textarea
              id="content"
              placeholder="分享您的體驗... (選填)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {content.length} / 1000
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">評價標籤</Label>
            <p className="text-xs text-muted-foreground mb-2">
              選擇符合您體驗的標籤 (可多選)
            </p>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={selectedTags.includes(option.value) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-sm py-1.5 px-3"
                  onClick={() => handleTagToggle(option.value)}
                  title={option.description}
                >
                  {selectedTags.includes(option.value) && (
                    <Check className="w-3 h-3 mr-1" />
                  )}
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Anonymous Option */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">發布選項</Label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                className={`flex-1 p-3 border rounded-lg transition-all ${
                  isAnonymous
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setIsAnonymous(true)}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-medium text-sm">匿名發布</div>
                    <div className="text-xs text-muted-foreground">
                      保護您的隱私
                    </div>
                  </div>
                  {isAnonymous && <Check className="w-5 h-5 text-primary" />}
                </div>
              </button>
              <button
                type="button"
                className={`flex-1 p-3 border rounded-lg transition-all ${
                  !isAnonymous
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setIsAnonymous(false)}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-medium text-sm">公開發布</div>
                    <div className="text-xs text-muted-foreground">
                      顯示您的帳號
                    </div>
                  </div>
                  {!isAnonymous && <Check className="w-5 h-5 text-primary" />}
                </div>
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              取消
            </Button>
          )}
          <Button
            type="submit"
            disabled={rating === 0 || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "提交中..." : "提交評論"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
