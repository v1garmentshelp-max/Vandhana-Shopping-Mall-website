import React, { useRef, useState, useEffect } from "react";
import { RotateCw } from "lucide-react";

export interface CanvasElement {
  id: string;
  type: "text" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string;
  fontFamily?: string;
  fontSize?: number;
  fill?: string;
  fontWeight?: string;
  fontStyle?: string;
  underline?: boolean;
  linethrough?: boolean;
  textAlign?: "left" | "center" | "right";
  opacity?: number;
}

interface DraggableElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  setNodeRef?: (node: HTMLElement | null) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export default function DraggableElement({
  element,
  isSelected,
  onSelect,
  onUpdate,
  containerRef,
  setNodeRef,
  onInteractionStart,
  onInteractionEnd,
}: DraggableElementProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [actionActive, setActionActive] = useState<boolean>(false);

  useEffect(() => {
    if (!isSelected) setIsEditing(false);
  }, [isSelected]);

  // Local state for smooth dragging without waiting for parent
  const [localTransform, setLocalTransform] = useState({
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
  });

  // Sync from props if not dragging
  const isDraggingAny = useRef(false);
  useEffect(() => {
    if (!isDraggingAny.current) {
      setLocalTransform({
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
      });
    }
  }, [element.x, element.y, element.width, element.height, element.rotation]);

  // Combined Pointer Handlers
  const startPos = useRef({ x: 0, y: 0 });
  const startState = useRef({ ...localTransform });
  const actionType = useRef<"drag" | "resize" | "rotate" | null>(null);

  const startAction = (
    e: React.PointerEvent,
    type: "drag" | "resize" | "rotate",
  ) => {
    e.stopPropagation();
    onSelect(element.id);
    if (type === "drag" && (e.target as HTMLElement).closest(".handler"))
      return;

    isDraggingAny.current = true;
    actionType.current = type;
    setActionActive(true);
    onInteractionStart?.();

    if (type === "rotate" && elRef.current) {
      const rect = elRef.current.getBoundingClientRect();
      startPos.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    } else {
      startPos.current = { x: e.clientX, y: e.clientY };
    }

    startState.current = { ...localTransform };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!containerRef.current || !actionType.current) return;

    // Scale factor if container is scaled (CSS scale)
    const containerRect = containerRef.current.getBoundingClientRect();
    const scale = containerRect.width / containerRef.current.offsetWidth;

    if (actionType.current === "drag") {
      const dx = (e.clientX - startPos.current.x) / scale;
      const dy = (e.clientY - startPos.current.y) / scale;

      let newX = startState.current.x + dx;
      let newY = startState.current.y + dy;

      if (containerRef.current) {
        const maxX = containerRef.current.offsetWidth;
        const maxY = containerRef.current.offsetHeight;

        let elW = startState.current.width;
        let elH = startState.current.height;
        if (elRef.current) {
          elW = elRef.current.offsetWidth;
          elH = elRef.current.offsetHeight;
        }

        const halfW = elW / 2;
        const halfH = elH / 2;

        // Ensure we don't end up with min > max if the element scaled larger than the container!
        newX = Math.max(
          Math.min(halfW, maxX / 2),
          Math.min(newX, Math.max(maxX - halfW, maxX / 2)),
        );
        newY = Math.max(
          Math.min(halfH, maxY / 2),
          Math.min(newY, Math.max(maxY - halfH, maxY / 2)),
        );
      }

      setLocalTransform((prev) => ({
        ...prev,
        x: newX,
        y: newY,
      }));
    } else if (actionType.current === "resize") {
      const dx = (e.clientX - startPos.current.x) / scale;
      const dy = (e.clientY - startPos.current.y) / scale;

      const rad = startState.current.rotation * (Math.PI / 180);
      const unrotatedDx = dx * Math.cos(-rad) - dy * Math.sin(-rad);
      const unrotatedDy = dx * Math.sin(-rad) + dy * Math.cos(-rad);

      const newWidth = Math.max(20, startState.current.width + unrotatedDx);
      const newHeight = Math.max(20, startState.current.height + unrotatedDy);

      setLocalTransform((prev) => ({
        ...prev,
        width: newWidth,
        height:
          element.type === "image"
            ? newWidth * (startState.current.height / startState.current.width)
            : newHeight,
      }));
    } else if (actionType.current === "rotate") {
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      angle = (angle + 90) % 360;
      if (e.shiftKey) angle = Math.round(angle / 45) * 45;
      setLocalTransform((prev) => ({ ...prev, rotation: angle }));
    }
  };

  const handlePointerUp = () => {
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
    onInteractionEnd?.();

    // Commit changes
    onUpdate(element.id, {
      x: localTransform.x,
      y: localTransform.y,
      width: localTransform.width,
      height: localTransform.height,
      rotation: localTransform.rotation,
    });

    setTimeout(() => {
      isDraggingAny.current = false;
      setActionActive(false);
    }, 0);
    actionType.current = null;
  };

  const handleTextChange = (e: React.FormEvent<HTMLDivElement>) => {
    onUpdate(element.id, { content: e.currentTarget.textContent || "" });
  };

  return (
    <div
      ref={(node) => {
        (elRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (isSelected && setNodeRef) setNodeRef(node);
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => startAction(e, "drag")}
      className={`absolute cursor-move ${
        actionActive
          ? "outline-dashed outline-2 outline-gray-400 z-30"
          : isSelected
            ? "ring-2 ring-primary ring-offset-1 z-20"
            : "z-10 hover:ring-1 hover:ring-gray-300"
      }`}
      style={{
        left: localTransform.x,
        top: localTransform.y,
        width: localTransform.width,
        height: element.type === "text" ? "auto" : localTransform.height,
        transform: `translate(-50%, -50%) rotate(${localTransform.rotation}deg)`,
        transformOrigin: "center",
        touchAction: "none",
        opacity: element.opacity ?? 1,
      }}
    >
      {/* Content */}
      <div
        className="w-full h-full"
        style={{
          fontFamily: element.fontFamily,
          fontSize: element.fontSize,
          color: element.fill,
          fontWeight: element.fontWeight,
          fontStyle: element.fontStyle,
          textDecoration: [
            element.underline ? "underline" : "",
            element.linethrough ? "line-through" : "",
          ]
            .filter(Boolean)
            .join(" "),
          textAlign: element.textAlign,
        }}
      >
        {element.type === "text" ? (
          <div
            ref={textRef}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => {
              setIsEditing(false);
              handleTextChange(e);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
              setTimeout(() => textRef.current?.focus(), 0);
            }}
            onPointerDown={(e) => (isEditing ? e.stopPropagation() : undefined)} // Allow selecting text only when editing
            className="w-full h-full whitespace-pre-wrap break-all outline-none min-w-[20px] min-h-[20px] px-1"
          >
            {element.content}
          </div>
        ) : (
          <img
            src={element.content}
            alt="element"
            className="w-full h-full object-contain pointer-events-none"
          />
        )}
      </div>

      {/* Editor Handles */}
      {isSelected && !actionActive && (
        <>
          <div
            className="handler absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full border shadow flex items-center justify-center cursor-grab hover:bg-gray-50 text-gray-600"
            onPointerDown={(e) => startAction(e, "rotate")}
          >
            <RotateCw size={12} />
          </div>

          <div
            className="handler absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow cursor-nwse-resize"
            onPointerDown={(e) => startAction(e, "resize")}
          />

          <div className="handler absolute -top-2 -left-2 w-3 h-3 bg-white border border-primary rounded-full pointer-events-none" />
          <div className="handler absolute -bottom-2 -left-2 w-3 h-3 bg-white border border-primary rounded-full pointer-events-none" />
        </>
      )}
    </div>
  );
}
