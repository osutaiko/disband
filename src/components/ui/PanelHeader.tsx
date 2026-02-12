import { Button } from "./button";
import { Smile } from "lucide-react";

const PanelHeader = ({
  title,
  buttons = [],
}: {
  title: string;
  buttons?: {
    title: string;
    icon: React.ReactNode;
    onClick: () => void;
  }[];
}) => {
  return (
    <div className="flex items-center justify-between shrink-0">
      <h2 className="underline p-2">{title}</h2>
      <div className="flex gap-1">
        {buttons.map((button, index) => (
          <Button
            key={index}
            title={button.title}
            variant="ghost"
            size="icon"
            onClick={button.onClick}
          >
            {button.icon}
          </Button>
        ))}
        {buttons.length === 0 && (
          <Button variant="ghost" size="icon" className="invisible">
            <Smile />
          </Button>
        )}
      </div>
    </div>
  );
};

export default PanelHeader;
