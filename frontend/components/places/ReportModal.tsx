"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { ReportType } from "@/lib/api";
import { AlertTriangle, Check } from "lucide-react";

export interface ReportFormData {
  type: ReportType;
  description: string;
}

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "place" | "review";
  targetId: string;
  targetName: string;
  onSubmit: (data: ReportFormData) => void;
  isSubmitting?: boolean;
}

export function ReportModal({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetName,
  onSubmit,
  isSubmitting = false,
}: ReportModalProps) {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [description, setDescription] = useState("");

  const reportTypeOptions: {
    value: ReportType;
    label: string;
    description: string;
  }[] = [
    {
      value: "data_fix",
      label: "資料修正",
      description: "場所資訊錯誤或需要更新",
    },
    {
      value: "abuse",
      label: "濫用檢舉",
      description: "不當內容、騷擾或垃圾訊息",
    },
    {
      value: "safety",
      label: "安全問題",
      description: "場所存在安全疑慮或風險",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) {
      alert("請選擇檢舉類型");
      return;
    }
    if (!description.trim()) {
      alert("請說明檢舉原因");
      return;
    }
    onSubmit({
      type: selectedType,
      description: description.trim(),
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedType(null);
      setDescription("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              檢舉{targetType === "place" ? "場所" : "評論"}
            </DialogTitle>
            <DialogDescription>
              您正在檢舉: {targetName}
              <br />
              請選擇檢舉類型並說明原因
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Report Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">檢舉類型 *</Label>
              <div className="space-y-2">
                {reportTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`w-full p-3 border rounded-lg text-left transition-all ${
                      selectedType === option.value
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
                        : "border-border hover:border-orange-300"
                    }`}
                    onClick={() => setSelectedType(option.value)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {option.description}
                        </div>
                      </div>
                      {selectedType === option.value && (
                        <Check className="w-5 h-5 text-orange-500 flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">
                詳細說明 *
              </Label>
              <Textarea
                id="description"
                placeholder="請詳細說明檢舉原因..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={500}
                className="resize-none"
                required
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length} / 500
              </p>
            </div>

            {/* Warning Notice */}
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                ⚠️ 請注意：濫用檢舉功能可能導致帳號被停權。請確保您的檢舉是合理且真實的。
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!selectedType || !description.trim() || isSubmitting}
            >
              {isSubmitting ? "提交中..." : "提交檢舉"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
