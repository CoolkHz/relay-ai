"use client";

import React from "react";
import {
  Listbox,
  ListboxItem,
  type ListboxProps,
  type Selection,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { cn } from "@heroui/react";

export type SidebarItem = {
  key: string;
  title: string;
  icon?: string;
  href?: string;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  className?: string;
};

export type SidebarNavProps = Omit<ListboxProps<SidebarItem>, "children"> & {
  items: SidebarItem[];
  isCompact?: boolean;
  hideEndContent?: boolean;
  iconClassName?: string;
  defaultSelectedKey: string;
  onSelect?: (key: string) => void;
};

const SidebarNav = React.forwardRef<HTMLElement, SidebarNavProps>(
  (
    {
      items,
      isCompact,
      defaultSelectedKey,
      onSelect,
      hideEndContent,
      itemClasses: itemClassesProp = {},
      iconClassName,
      classNames,
      className,
      ...props
    },
    ref
  ) => {
    const [selected, setSelected] = React.useState<React.Key>(defaultSelectedKey);

    React.useEffect(() => {
      setSelected(defaultSelectedKey);
    }, [defaultSelectedKey]);

    const itemClasses = {
      ...itemClassesProp,
      base: cn(itemClassesProp?.base, {
        "w-11 h-11 gap-0 p-0": isCompact,
      }),
    };

    return (
      <Listbox
        key={isCompact ? "compact" : "default"}
        ref={ref}
        hideSelectedIcon
        as="nav"
        className={cn("list-none", className)}
        classNames={{
          ...classNames,
          list: cn("items-center", classNames?.list),
        }}
        color="default"
        itemClasses={{
          ...itemClasses,
          base: cn(
            "px-3 min-h-11 rounded-large h-[44px] data-[selected=true]:bg-default-100",
            itemClasses?.base
          ),
          title: cn(
            "text-small font-medium text-default-500 group-data-[selected=true]:text-foreground",
            itemClasses?.title
          ),
        }}
        items={items}
        selectedKeys={[selected] as unknown as Selection}
        selectionMode="single"
        variant="flat"
        onSelectionChange={(keys) => {
          const key = Array.from(keys)[0];
          setSelected(key as React.Key);
          onSelect?.(key as string);
        }}
        {...props}
      >
        {(item) => (
          <ListboxItem
            key={item.key}
            endContent={isCompact || hideEndContent ? null : (item.endContent ?? null)}
            startContent={
              isCompact ? null : item.icon ? (
                <Icon
                  className={cn(
                    "text-default-500 group-data-[selected=true]:text-foreground",
                    iconClassName
                  )}
                  icon={item.icon}
                  width={24}
                />
              ) : (
                (item.startContent ?? null)
              )
            }
            textValue={item.title}
            title={isCompact ? null : item.title}
          />
        )}
      </Listbox>
    );
  }
);

SidebarNav.displayName = "SidebarNav";

export default SidebarNav;
