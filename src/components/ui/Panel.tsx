import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type PanelAction = {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
};

const Panel = ({
  title,
  actions = [],
  isCollapsible = false,
  defaultCollapsed = false,
  className,
  contentClassName,
  children,
}: {
  title?: string;
  actions?: PanelAction[];
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <section className={cn('flex flex-col p-4 gap-4', className)}>
      {title && (
        <div className="flex items-center justify-between shrink-0">
          {isCollapsible ? (
            <Button
              variant="ghost"
              className="p-2 text-left inline-flex items-center gap-3"
              onClick={() => setIsCollapsed((prev) => !prev)}
            >
              {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              <h2 className="underline">{title}</h2>
            </Button>
          ) : (
            <h2 className="underline p-2">{title}</h2>
          )}
          <div className="flex gap-1">
            {actions.map((action, index) => (
              <Button
                key={`${action.title}-${index}`}
                title={action.title}
                variant="ghost"
                size="icon"
                onClick={action.onClick}
              >
                {action.icon}
              </Button>
            ))}
          </div>
        </div>
      )}

      {!isCollapsed && <div className={contentClassName}>{children}</div>}
    </section>
  );
}

export default Panel;
