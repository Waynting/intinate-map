"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlaceType, PrivacyTag } from "@/lib/api";
import { X, Filter } from "lucide-react";

export interface PlaceFilterOptions {
  type?: PlaceType;
  minRating?: number;
  priceLevel?: number;
  privacyTags?: PrivacyTag[];
  district?: string;
}

interface PlaceFiltersProps {
  filters: PlaceFilterOptions;
  onFiltersChange: (filters: PlaceFilterOptions) => void;
  onReset: () => void;
}

export function PlaceFilters({ filters, onFiltersChange, onReset }: PlaceFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const typeOptions: { value: PlaceType; label: string }[] = [
    { value: "hotel", label: "飯店" },
    { value: "motel", label: "汽車旅館" },
    { value: "short_stay", label: "民宿" },
  ];

  const privacyTagOptions: { value: PrivacyTag; label: string }[] = [
    { value: "self_checkin", label: "自助入住" },
    { value: "soundproof", label: "隔音良好" },
    { value: "garage", label: "室內停車" },
    { value: "cash_only", label: "僅收現金" },
    { value: "kiosk", label: "自助機台" },
    { value: "hourly_rate", label: "鐘點房" },
    { value: "no_id_required", label: "免證件" },
    { value: "parking_inside", label: "停車入內" },
  ];

  const districtOptions = [
    // Taipei City (台北市)
    { value: "中山區", label: "中山區", city: "台北市" },
    { value: "萬華區", label: "萬華區", city: "台北市" },
    { value: "中正區", label: "中正區", city: "台北市" },
    { value: "大安區", label: "大安區", city: "台北市" },
    { value: "大同區", label: "大同區", city: "台北市" },
    { value: "松山區", label: "松山區", city: "台北市" },
    { value: "北投區", label: "北投區", city: "台北市" },
    { value: "士林區", label: "士林區", city: "台北市" },
    { value: "信義區", label: "信義區", city: "台北市" },
    { value: "南港區", label: "南港區", city: "台北市" },
    { value: "內湖區", label: "內湖區", city: "台北市" },
    { value: "文山區", label: "文山區", city: "台北市" },
    // New Taipei City (新北市)
    { value: "瑞芳區", label: "瑞芳區", city: "新北市" },
    { value: "板橋區", label: "板橋區", city: "新北市" },
    { value: "淡水區", label: "淡水區", city: "新北市" },
    { value: "新店區", label: "新店區", city: "新北市" },
    { value: "三重區", label: "三重區", city: "新北市" },
    { value: "中和區", label: "中和區", city: "新北市" },
    { value: "永和區", label: "永和區", city: "新北市" },
    { value: "汐止區", label: "汐止區", city: "新北市" },
    { value: "三峽區", label: "三峽區", city: "新北市" },
    { value: "樹林區", label: "樹林區", city: "新北市" },
    { value: "蘆洲區", label: "蘆洲區", city: "新北市" },
    { value: "土城區", label: "土城區", city: "新北市" },
    { value: "林口區", label: "林口區", city: "新北市" },
    { value: "鶯歌區", label: "鶯歌區", city: "新北市" },
  ];

  const handleTypeChange = (value: string) => {
    if (value === "all") {
      const { type, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange({ ...filters, type: value as PlaceType });
    }
  };

  const handleRatingChange = (value: string) => {
    if (value === "all") {
      const { minRating, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange({ ...filters, minRating: parseFloat(value) });
    }
  };

  const handlePriceLevelChange = (value: string) => {
    if (value === "all") {
      const { priceLevel, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange({ ...filters, priceLevel: parseInt(value) });
    }
  };

  const handlePrivacyTagToggle = (tag: PrivacyTag) => {
    const currentTags = filters.privacyTags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    if (newTags.length === 0) {
      const { privacyTags, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange({ ...filters, privacyTags: newTags });
    }
  };

  const handleDistrictChange = (value: string) => {
    if (value === "all") {
      const { district, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange({ ...filters, district: value });
    }
  };

  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="border-b bg-background">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <Label className="text-sm font-semibold">過濾條件</Label>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "收起" : "展開"}
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onReset}>
                <X className="w-4 h-4 mr-1" />
                清除
              </Button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-4">
            {/* District Filter */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">行政區</Label>
              <Select
                value={filters.district || "all"}
                onValueChange={handleDistrictChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="所有區域" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有區域</SelectItem>

                  <SelectGroup>
                    <SelectLabel>台北市</SelectLabel>
                    {districtOptions
                      .filter((d) => d.city === "台北市")
                      .map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                  </SelectGroup>

                  <SelectGroup>
                    <SelectLabel>新北市</SelectLabel>
                    {districtOptions
                      .filter((d) => d.city === "新北市")
                      .map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">類型</Label>
              <Select
                value={filters.type || "all"}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="所有類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有類型</SelectItem>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rating Filter */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">最低評分</Label>
              <Select
                value={filters.minRating?.toString() || "all"}
                onValueChange={handleRatingChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="所有評分" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有評分</SelectItem>
                  <SelectItem value="4.5">4.5+ ⭐</SelectItem>
                  <SelectItem value="4.0">4.0+ ⭐</SelectItem>
                  <SelectItem value="3.5">3.5+ ⭐</SelectItem>
                  <SelectItem value="3.0">3.0+ ⭐</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Level Filter */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">價格等級</Label>
              <Select
                value={filters.priceLevel?.toString() || "all"}
                onValueChange={handlePriceLevelChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="所有價格" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有價格</SelectItem>
                  <SelectItem value="1">💲 經濟型</SelectItem>
                  <SelectItem value="2">💲💲 中等</SelectItem>
                  <SelectItem value="3">💲💲💲 高級</SelectItem>
                  <SelectItem value="4">💲💲💲💲 豪華</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Privacy Tags Filter */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">隱私特色</Label>
              <div className="flex flex-wrap gap-2">
                {privacyTagOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant={
                      filters.privacyTags?.includes(option.value)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => handlePrivacyTagToggle(option.value)}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
