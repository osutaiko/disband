import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const Panel = ({
  title,
  buttonGroup = [],
  isCollapsible = false,
  defaultCollapsed = false,
  isScrollable = false,
  className,
  contentClassName,
  headerClassName,
  children,
}: {
  title?: string;
  buttonGroup?: React.ReactNode[];
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  isScrollable?: boolean;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  children: React.ReactNode;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <section className={cn('flex flex-col', className)}>
      {title && (
        <div className={cn('flex items-center justify-between shrink-0 p-4', headerClassName)}>
          {isCollapsible ? (
            <Button
              variant="ghost"
              className="p-2 text-left inline-flex items-center gap-3"
              onClick={() => setIsCollapsed((prev) => !prev)}
            >
              <h2 className="underline">{title}</h2>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
              />
            </Button>
          ) : (
            <h2 className="underline p-2">{title}</h2>
          )}
          <div className="flex gap-1">
            {buttonGroup}
          </div>
        </div>
      )}

      {!isCollapsed && (
        isScrollable ? (
          <div className={cn('-mr-4 min-h-0 px-4 pb-4', contentClassName)}>
            <ScrollArea className="h-full">
              {children}
            </ScrollArea>
          </div>
        ) : (
          <div className={cn('p-4', contentClassName)}>
            {children}
          </div>
        )
      )}
    </section>
  );
}

export default Panel;
