import React, { useMemo, useRef, useEffect } from "react";
import { FixedSizeList as List } from "react-window";
import { ArrowDown } from "lucide-react";
import { Button } from "./button";

interface VirtualizedChatMessageListProps {
  messages: any[];
  renderMessage: (index: number) => React.ReactNode;
  className?: string;
}

const ITEM_HEIGHT = 80; // Approximate height per message
const OVERSCAN_COUNT = 5; // Number of items to render outside visible area

export const VirtualizedChatMessageList: React.FC<VirtualizedChatMessageListProps> = ({
  messages,
  renderMessage,
  className = ""
}) => {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const [showScrollButton, setShowScrollButton] = React.useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAtBottom && messages.length > 0) {
      listRef.current?.scrollToItem(messages.length - 1, "end");
    }
  }, [messages.length, isAtBottom]);

  // Handle scroll events to detect if user is at bottom
  const handleScroll = ({ scrollOffset, scrollUpdateWasRequested }: any) => {
    if (!scrollUpdateWasRequested && containerRef.current) {
      const { scrollHeight, clientHeight } = containerRef.current;
      const threshold = 100; // pixels from bottom
      const atBottom = scrollOffset + clientHeight >= scrollHeight - threshold;
      
      setIsAtBottom(atBottom);
      setShowScrollButton(!atBottom && messages.length > 0);
    }
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messages.length > 0) {
      listRef.current?.scrollToItem(messages.length - 1, "end");
      setIsAtBottom(true);
      setShowScrollButton(false);
    }
  };

  // Memoized row renderer for performance
  const Row = useMemo(() => {
    return ({ index, style }: { index: number; style: React.CSSProperties }) => (
      <div style={style}>
        <div className="px-4 py-2">
          {renderMessage(index)}
        </div>
      </div>
    );
  }, [renderMessage]);

  if (messages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-muted-foreground">
          <p>Nessun messaggio ancora</p>
          <p className="text-xs mt-1">Inizia una conversazione!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={containerRef} className="w-full h-full">
        <List
          ref={listRef}
          height={containerRef.current?.clientHeight || 400}
          itemCount={messages.length}
          itemSize={ITEM_HEIGHT}
          onScroll={handleScroll}
          overscanCount={OVERSCAN_COUNT}
        >
          {Row}
        </List>
      </div>

      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          variant="outline"
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-full shadow-lg z-10 bg-background"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};