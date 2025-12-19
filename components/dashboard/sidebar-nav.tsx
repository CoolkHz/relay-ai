"use client";

// Usage: <SidebarNav items={items} defaultSelectedKey="/" onSelectKey={setKey} />
import React from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils/cn";

export type SidebarItem = {
  key: string;
  title: string;
  icon?: string;
  href?: string;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  className?: string;
};

export type SidebarNavProps = React.HTMLAttributes<HTMLDivElement> & {
  items: SidebarItem[];
  isCompact?: boolean;
  hideEndContent?: boolean;
  iconClassName?: string;
  defaultSelectedKey: string;
  onSelectKey?: (key: string) => void;
};

const SidebarNav = React.forwardRef<HTMLDivElement, SidebarNavProps>(
  (
    {
      items,
      isCompact,
      defaultSelectedKey,
      onSelectKey,
      hideEndContent,
      iconClassName,
      className,
      ...props
    },
    ref
  ) => {
    const [selected, setSelected] = React.useState<React.Key>(defaultSelectedKey);

    React.useEffect(() => {
      setSelected(defaultSelectedKey);
    }, [defaultSelectedKey]);

    return (
      <nav ref={ref} className={cn("space-y-1", className)} {...props}>
        {items.map((item) => {
          const isSelected = selected === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setSelected(item.key);
                onSelectKey?.(item.key);
              }}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                isCompact && "h-11 w-11 justify-center p-0",
                isSelected
                  ? "bg-accent text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {!isCompact &&
                (item.icon ? (
                  <Icon
                    className={cn(
                      "text-muted-foreground group-hover:text-foreground",
                      isSelected && "text-foreground",
                      iconClassName
                    )}
                    icon={item.icon}
                    width={20}
                  />
                ) : (
                  (item.startContent ?? null)
                ))}
              {!isCompact && <span className="truncate">{item.title}</span>}
              {!isCompact && !hideEndContent && (item.endContent ?? null)}
            </button>
          );
        })}
      </nav>
    );
  }
);

SidebarNav.displayName = "SidebarNav";

export default SidebarNav;
