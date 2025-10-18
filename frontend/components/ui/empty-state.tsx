/**
 * Empty State Component
 * Provides friendly, actionable empty states across the application
 */

import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface EmptyStateProps {
  /** Large emoji icon (e.g., "🔍", "❤️", "📍") */
  icon: string;
  /** Main title */
  title: string;
  /** Descriptive text */
  description: string;
  /** Primary action button (optional) */
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Secondary action button (optional) */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Custom content to display below description (optional) */
  children?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Large Emoji Icon */}
      <div className="text-6xl mb-4" role="img" aria-label={title}>
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>

      {/* Description */}
      <p className="text-base text-muted-foreground mb-6 max-w-md">
        {description}
      </p>

      {/* Custom Content */}
      {children && <div className="mb-6">{children}</div>}

      {/* Action Buttons */}
      {(primaryAction || secondaryAction) && (
        <div className="flex gap-3 flex-wrap justify-center">
          {primaryAction && (
            <Button onClick={primaryAction.onClick} size="lg">
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              size="lg"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
