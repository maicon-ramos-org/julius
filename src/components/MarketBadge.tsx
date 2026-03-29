import React from "react";

interface MarketBadgeProps {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md";
}

export function MarketBadge({ name, logoUrl, size = "md" }: MarketBadgeProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-10 w-10 text-sm",
  };

  // Generate color from name hash
  const getColorFromName = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 65%, 50%)`;
  };

  // Get first 2 letters of name (or first letter of each word)
  const getInitials = (name: string) => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return words[0][0]?.toUpperCase() + words[1][0]?.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`Logo ${name}`}
        className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  const initials = getInitials(name);
  const backgroundColor = getColorFromName(name);

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ backgroundColor }}
      title={name}
    >
      {initials}
    </div>
  );
}