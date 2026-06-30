import {
  AlignCenter,
  AlignLeft,
  AlignRightIcon,
  Bold,
  Check,
  ChevronDown,
  CopyPlus,
  Italic,
  Layers,
  Strikethrough,
  Trash2,
  Underline,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { MdOutlineTextFields } from "react-icons/md";
import { FiUpload } from "react-icons/fi";
import SweatShirt from "../assets/icons/SweatShirt.svg";
import Hoodie from "../assets/icons/Hoodie.svg";
import Tshirt from "../assets/icons/Tshirt.svg";
import { GrPowerCycle } from "react-icons/gr";
import crewFront from "../assets/T-Shirt Models/crew_front.png";
import crewBack from "../assets/T-Shirt Models/crew_back.png";
import hoodieFront from "../assets/T-Shirt Models/mens_hoodie_front.png";
import hoodieBack from "../assets/T-Shirt Models/mens_hoodie_back.png";
import longsleeveFront from "../assets/T-Shirt Models/mens_longsleeve_front.png";
import longsleeveBack from "../assets/T-Shirt Models/mens_longsleeve_back.png";
import { Canvas, FabricImage, IText, type FabricObject } from "fabric";
import { flip, offset, shift, useFloating } from "@floating-ui/react";
import { addToCart } from "../services/cartApi";

type Side = "front" | "back";
type GarmentType = "crew" | "hoodie" | "longsleeve";

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
  mobile?: string;
  type?: string;
};

const CUSTOM_PRODUCT_PRICE = 799;
const CUSTOM_PRODUCT_ORIGINAL_PRICE = 999;

const COLORS = [
  { name: "White", code: "#ffffff" },
  { name: "Black", code: "#1a1a1a" },
  { name: "Heather Grey", code: "#9ca3af" },
  { name: "Navy Blue", code: "#1e3a8a" },
  { name: "Red", code: "#dc2626" },
  { name: "Forest Green", code: "#166534" },
];

const FONTS = [
  "Arial",
  "Poppins",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
  "Impact",
];

const MODELS: Record<GarmentType, Record<Side, string>> = {
  crew: { front: crewFront, back: crewBack },
  hoodie: { front: hoodieFront, back: hoodieBack },
  longsleeve: { front: longsleeveFront, back: longsleeveBack },
};

const getStoredUser = (): StoredUser | null => {
  const raw =
    localStorage.getItem("user") || sessionStorage.getItem("user") || null;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const Customizer = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [side, setSide] = useState<Side>("front");
  const [garmentType, setGarmentType] = useState<GarmentType>("crew");
  const [selectedColor, setSelectedColor] = useState(COLORS[0].code);
  const [size, setSize] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [cartError, setCartError] = useState("");

  const canvasFrontRef = useRef<HTMLCanvasElement>(null);
  const canvasBackRef = useRef<HTMLCanvasElement>(null);
  const fabricFrontRef = useRef<Canvas | null>(null);
  const fabricBackRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeObject, setActiveObject] = useState<FabricObject | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);

  const { refs, floatingStyles } = useFloating({
    placement: "top",
    middleware: [offset(16), flip(), shift({ padding: 16 })],
  });

  const getActiveCanvas = useCallback(() => {
    return side === "front" ? fabricFrontRef.current : fabricBackRef.current;
  }, [side]);

  const [, setTick] = useState(0);
  const forceUpdate = () => setTick((t) => t + 1);

  useEffect(() => {
    if (!canvasFrontRef.current || !canvasBackRef.current) return;
    if (fabricFrontRef.current || fabricBackRef.current) return;

    const initCanvas = (ref: React.RefObject<HTMLCanvasElement | null>) => {
      const c = new Canvas(ref.current!, {
        width: 160,
        height: 300,
        preserveObjectStacking: true,
        selection: false,
      });

      c.on("selection:created", () => {
        setActiveObject(c.getActiveObject() || null);
      });

      c.on("selection:updated", () => {
        setActiveObject(c.getActiveObject() || null);
      });

      c.on("selection:cleared", () => {
        setActiveObject(null);
      });

      c.on("object:moving", () => {
        setIsInteracting(true);
      });

      c.on("object:scaling", () => setIsInteracting(true));
      c.on("object:rotating", () => setIsInteracting(true));
      c.on("mouse:up", () => setIsInteracting(false));
      c.on("object:modified", () => forceUpdate());

      return c;
    };

    fabricFrontRef.current = initCanvas(canvasFrontRef);
    fabricBackRef.current = initCanvas(canvasBackRef);
  }, [step]);

  useEffect(() => {
    return () => {
      fabricFrontRef.current?.dispose();
      fabricFrontRef.current = null;
      fabricBackRef.current?.dispose();
      fabricBackRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!activeObject || !containerRef.current) {
      refs.setReference(null);
      return;
    }

    const canvasEl = containerRef.current;

    const virtualEl = {
      getBoundingClientRect() {
        const cr = canvasEl.getBoundingClientRect();
        const or = activeObject.getBoundingRect();
        return {
          x: cr.left + or.left,
          y: cr.top + or.top,
          top: cr.top + or.top + 1,
          left: cr.left + or.left,
          bottom: cr.top + or.top + or.height,
          right: cr.left + or.left + or.width,
          width: or.width,
          height: or.height,
        } as DOMRect;
      },
    };

    refs.setReference(virtualEl);
  }, [activeObject, isInteracting, showFontMenu, refs, side]);

  const handleNext = () => step < 3 && setStep(step + 1);

  const goToPreview = () => {
    const c = getActiveCanvas();
    if (!c) return;
    c.discardActiveObject();
    c.renderAll();
    setStep(3);
  };

  const handleBack = () => step > 1 && setStep(step - 1);

  const toggleSide = (newSide: Side) => {
    if (side === newSide) return;
    const c = getActiveCanvas();
    c?.discardActiveObject();
    c?.renderAll();
    setSide(newSide);
  };

  const addText = () => {
    const text = new IText("Your Text", {
      fontFamily: "Poppins",
      fontSize: 28,
      fill: "#000000",
      textAlign: "center",
      left: 80,
      top: 50,
      originX: "center",
      originY: "center",
      transparentCorners: false,
      cornerColor: "#3b82f6",
      cornerStrokeColor: "#3b82f6",
      borderColor: "#3b82f6",
      cornerSize: 10,
      padding: 5,
    });

    const c = getActiveCanvas();
    if (!c) return;
    c.add(text);
    c.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
    c.renderAll();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target?.result) {
          FabricImage.fromURL(event.target.result as string).then((img) => {
            img.scaleToWidth(120);
            img.set({
              left: 102,
              top: 180,
              originX: "center",
              originY: "center",
              transparentCorners: false,
              cornerColor: "#3b82f6",
              cornerStrokeColor: "#3b82f6",
              borderColor: "#3b82f6",
              cornerSize: 10,
              padding: 5,
            });

            const c = getActiveCanvas();
            if (!c) return;
            c.add(img);
            c.setActiveObject(img);
            c.renderAll();
          });
        }
      };

      reader.readAsDataURL(e.target.files[0]);
    }

    e.target.value = "";
  };

  const updateActiveProps = (updates: Record<string, any>) => {
    if (!activeObject) return;
    activeObject.set(updates);
    getActiveCanvas()?.renderAll();
    forceUpdate();
  };

  const duplicateActive = () => {
    if (!activeObject) return;

    activeObject.clone([]).then((cloned: FabricObject) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
      });

      const c = getActiveCanvas();
      if (!c) return;
      c.add(cloned);
      c.setActiveObject(cloned);
      c.renderAll();
    });
  };

  const deleteActive = () => {
    if (!activeObject) return;

    const c = getActiveCanvas();
    if (!c) return;
    c.remove(activeObject);
    c.discardActiveObject();
    c.renderAll();
  };

  const bringForward = () => {
    if (!activeObject) return;

    const c = getActiveCanvas();
    if (!c) return;
    c.bringObjectForward(activeObject);
    c.renderAll();
  };

  const getFontPreview = (font: string) =>
    font.length > 8 ? font.substring(0, 6) + ".." : font;

  const cycleAlign = () => {
    if (!activeObject || activeObject.type !== "i-text") return;

    const current = (activeObject as IText).textAlign || "left";
    const nextMap: Record<string, string> = {
      left: "center",
      center: "right",
      right: "left",
    };

    updateActiveProps({ textAlign: nextMap[current] });
  };

  const exportDesignOnly = (fabricCanvas: Canvas | null) => {
    if (!fabricCanvas) return null;

    return fabricCanvas.toDataURL({
      format: "png",
      multiplier: 2,
    });
  };

  const exportCanvasWithShirt = async (
    sideToExport: Side,
    fabricCanvas: Canvas | null,
  ): Promise<string | null> => {
    if (!fabricCanvas) return null;

    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 420;
      canvas.height = 520;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.fillStyle = selectedColor;
      ctx.fillRect(0, 0, 420, 520);

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        ctx.drawImage(img, 0, 0, 420, 520);

        const fabricImage = new Image();

        fabricImage.onload = () => {
          const workAreaX = (420 - 160) / 2;
          const workAreaY = 520 * 0.2;

          ctx.drawImage(fabricImage, workAreaX, workAreaY, 160, 300);
          resolve(canvas.toDataURL("image/png", 1.0));
        };

        fabricImage.src = fabricCanvas.toDataURL({
          format: "png",
          quality: 1,
          multiplier: 2,
        });
      };

      img.onerror = () => {
        resolve(null);
      };

      img.src = MODELS[garmentType][sideToExport];
    });
  };

  const buildPayload = async () => {
    const frontFabric = fabricFrontRef.current;
    const backFabric = fabricBackRef.current;

    const cActive = getActiveCanvas();
    if (cActive) {
      cActive.discardActiveObject();
      cActive.renderAll();
    }

    return {
      size,
      color: selectedColor,
      garmentType,
      design: {
        front: await exportCanvasWithShirt("front", frontFabric),
        back: await exportCanvasWithShirt("back", backFabric),
      },
      designOnly: {
        front: exportDesignOnly(frontFabric),
        back: exportDesignOnly(backFabric),
      },
    };
  };

  const handleAddToCart = async () => {
    if (!size || isAdding) return;

    const user = getStoredUser();
    const userId = Number(user?.id || 0);

    if (!userId) {
      navigate("/auth");
      return;
    }

    setIsAdding(true);
    setCartError("");

    try {
      const payload = await buildPayload();
      const displayImage =
        payload.design.front ||
        payload.design.back ||
        MODELS[garmentType].front;

      await addToCart({
        user_id: userId,
        selected_size: size,
        selected_color: selectedColor,
        quantity: 1,
        is_custom: true,
        custom_title: `Custom ${garmentType}`,
        custom_brand: "V1Garments",
        custom_image_url: displayImage,
        custom_price: CUSTOM_PRODUCT_PRICE,
        custom_original_price: CUSTOM_PRODUCT_ORIGINAL_PRICE,
        custom_payload: payload,
      });

      navigate("/cart");
    } catch (err: any) {
      setCartError(err?.message || "Unable to add custom product to cart");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="font-poppins bg-[#f5f5f5] h-[calc(100vh-48px)] lg:h-[calc(100vh-72px)] flex justify-center">
      <div className="w-full max-w-[530px] h-full bg-white shadow-xl flex flex-col">
        <div className="bg-[#e9ecef] pt-8 pb-5 px-8 flex justify-between relative border-b border-gray-200 shrink-0">
          <div className="absolute top-[48px] left-[60px] right-[60px] h-[2px] bg-gray-300 z-0">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
            />
          </div>

          <div
            className="flex flex-col items-center z-10 gap-2 w-20 cursor-pointer"
            onClick={() => setStep(1)}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 1 ? "bg-green-500 text-white shadow-sm" : "bg-white text-gray-500 border border-gray-300"}`}
            >
              {step > 1 ? <Check size={12} strokeWidth={3} /> : "1"}
            </div>
            <span className="text-[10px] font-bold text-gray-800 text-center whitespace-nowrap">
              Pick Color & Size
            </span>
          </div>

          <div
            className="flex flex-col items-center z-10 gap-2 w-20 cursor-pointer"
            onClick={() => (size ? setStep(2) : null)}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 2 ? "bg-green-500 text-white shadow-sm" : "bg-white text-gray-500 border border-gray-300"}`}
            >
              {step > 2 ? <Check size={12} strokeWidth={3} /> : "2"}
            </div>
            <span
              className={`text-[10px] font-bold text-center whitespace-nowrap transition-colors ${step >= 2 ? "text-gray-800" : "text-gray-500"}`}
            >
              Finalise Design
            </span>
          </div>

          <div className="flex flex-col items-center z-10 gap-2 w-20 cursor-pointer">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 3 ? "bg-green-500 text-white shadow-sm" : "bg-white text-gray-500 border border-gray-300"}`}
            >
              3
            </div>
            <span
              className={`text-[10px] font-bold text-center whitespace-nowrap transition-colors ${step >= 3 ? "text-gray-800" : "text-gray-500"}`}
            >
              Preview
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hidescrollbar bg-white">
          {step === 1 && (
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-medium text-base text-gray-900 mb-2">
                  Select Garment
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "crew", icon: Tshirt },
                    { label: "hoodie", icon: Hoodie },
                    { label: "longsleeve", icon: SweatShirt },
                  ].map((type) => (
                    <button
                      key={type.label}
                      onClick={() => setGarmentType(type.label as GarmentType)}
                      className={`p-3 flex text-sm flex-col items-center rounded-lg capitalize font-semibold border-2 transition-all ${
                        garmentType === type.label
                          ? "border-yellow-400 bg-yellow-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <img src={type.icon} className="size-14" />
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-base text-gray-900 mb-2">
                  Select Color
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 custom-scrollbar w-full">
                  {COLORS.map((c) => (
                    <div key={c.code} className="flex justify-center shrink-0">
                      <button
                        onClick={() => setSelectedColor(c.code)}
                        className={`w-20 h-20 rounded-md border-2 transition-all cursor-pointer flex items-start justify-end p-1.5 ${selectedColor === c.code ? "border-yellow-400 scale-110 shadow-md" : "border-gray-200 opacity-90 hover:opacity-100"}`}
                        style={{ backgroundColor: c.code }}
                        title={c.name}
                      >
                        {selectedColor === c.code && (
                          <Check
                            size={14}
                            strokeWidth={3}
                            className={
                              c.code === "#ffffff" || c.code === "#f3f4f6"
                                ? "text-gray-800"
                                : "text-white"
                            }
                          />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-base text-gray-900 mb-2">
                  Select Size
                </h3>
                <div className="flex flex-wrap gap-2">
                  {["S", "M", "L", "XL", "2XL", "3XL"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`px-4 py-2 border rounded-lg font-medium ${
                        size === s
                          ? "border-primary bg-primary text-black"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step >= 2 && (
            <div className="flex relative justify-center h-full items-start w-full overflow-hidden py-0">
              <div
                className="relative"
                style={{
                  width: "420px",
                  height: "520px",
                  overflow: "hidden",
                }}
              >
                <img
                  src={MODELS[garmentType][side]}
                  className="absolute top-0 left-0"
                  style={{
                    width: "420px",
                    height: "520px",
                    objectFit: "cover",
                    backgroundColor: selectedColor,
                    pointerEvents: "none",
                  }}
                />

                <div
                  ref={containerRef}
                  className="absolute z-20 left-1/2 top-[20%] w-[160px] h-[300px] -translate-x-1/2"
                >
                  <div
                    className={`absolute inset-0 transition-opacity pointer-events-none ${step === 2 && activeObject ? "border border-dashed border-gray-200/50" : "opacity-0"}`}
                  />

                  <div
                    className={`absolute inset-0 overflow-visible ${step !== 2 ? "pointer-events-none select-none" : ""}`}
                  >
                    <div
                      style={{
                        display: side === "front" ? "block" : "none",
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <canvas ref={canvasFrontRef} width={160} height={300} />
                    </div>
                    <div
                      style={{
                        display: side === "back" ? "block" : "none",
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <canvas ref={canvasBackRef} width={160} height={300} />
                    </div>
                  </div>
                </div>
              </div>

              {activeObject && step === 2 && !isInteracting && (
                <div
                  ref={refs.setFloating}
                  style={{
                    ...floatingStyles,
                    top: Math.max(0, (floatingStyles.top as number) || 0),
                  }}
                  className="z-100 bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.15)] border border-gray-200 flex flex-wrap items-center justify-center px-1.5 md:px-2 h-auto min-h-[44px] gap-1 max-w-[90vw] py-1"
                >
                  {activeObject.type === "i-text" && (
                    <>
                      <div className="relative shrink-0">
                        <div
                          onClick={() => setShowFontMenu(!showFontMenu)}
                          className="flex items-center gap-1 bg-gray-50 hover:bg-gray-100 px-2 py-1.5 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200 text-sm font-medium"
                        >
                          <span className="truncate w-full text-gray-700">
                            {getFontPreview(
                              (activeObject as IText).fontFamily || "Arial",
                            )}
                          </span>
                          <ChevronDown size={14} className="text-gray-500" />
                        </div>

                        {showFontMenu && (
                          <div className="absolute top-10 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-2 transition-all flex flex-col z-50 w-40 overflow-y-auto hidescrollbar">
                            {FONTS.map((font) => (
                              <button
                                key={font}
                                onClick={() => {
                                  updateActiveProps({ fontFamily: font });
                                  setShowFontMenu(false);
                                }}
                                className={`text-left px-4 py-2 text-sm hover:bg-gray-50 w-full font-medium ${(activeObject as IText).fontFamily === font ? "text-primary font-bold" : "text-gray-700"}`}
                                style={{ fontFamily: font }}
                              >
                                {font}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center bg-gray-50 rounded-lg px-2 border border-transparent hover:border-gray-200 transition-colors h-[32px] shrink-0">
                        <input
                          type="number"
                          value={(activeObject as IText).fontSize || 28}
                          onChange={(e) =>
                            updateActiveProps({
                              fontSize: parseInt(e.target.value) || 28,
                            })
                          }
                          className="w-10 bg-transparent text-sm font-bold text-center outline-none app-appearance-none"
                        />
                      </div>

                      <div className="w-px h-5 bg-gray-200 mx-1 shrink-0"></div>

                      <div className="relative w-6 h-6 rounded-full border-2 border-gray-200 hover:border-gray-300 overflow-hidden cursor-pointer shadow-sm shrink-0">
                        <div
                          className="absolute inset-0 pointer-events-none rounded-full"
                          style={{
                            background: `linear-gradient(white, white) padding-box, linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet) border-box`,
                            border: "2px solid transparent",
                          }}
                        ></div>
                        <div
                          className="absolute inset-[3px] rounded-full pointer-events-none"
                          style={{
                            backgroundColor:
                              ((activeObject as IText).fill as string) ||
                              "#000000",
                          }}
                        ></div>
                        <input
                          type="color"
                          value={
                            ((activeObject as IText).fill as string) ||
                            "#000000"
                          }
                          onChange={(e) =>
                            updateActiveProps({ fill: e.target.value })
                          }
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                        />
                      </div>

                      <div className="w-px h-5 bg-gray-200 mx-1 shrink-0"></div>

                      <div className="flex gap-0.5 shrink-0">
                        <button
                          onClick={() =>
                            updateActiveProps({
                              fontWeight:
                                (activeObject as IText).fontWeight === "bold"
                                  ? "normal"
                                  : "bold",
                            })
                          }
                          className={`p-1.5 rounded transition-colors ${(activeObject as IText).fontWeight === "bold" ? "bg-gray-200 text-black" : "text-gray-600 hover:text-black hover:bg-gray-100"}`}
                        >
                          <Bold size={16} />
                        </button>

                        <button
                          onClick={() =>
                            updateActiveProps({
                              fontStyle:
                                (activeObject as IText).fontStyle === "italic"
                                  ? "normal"
                                  : "italic",
                            })
                          }
                          className={`p-1.5 rounded transition-colors ${(activeObject as IText).fontStyle === "italic" ? "bg-gray-200 text-black" : "text-gray-600 hover:text-black hover:bg-gray-100"}`}
                        >
                          <Italic size={16} />
                        </button>

                        <button
                          onClick={() =>
                            updateActiveProps({
                              underline: !(activeObject as IText).underline,
                            })
                          }
                          className={`p-1.5 rounded transition-colors ${(activeObject as IText).underline ? "bg-gray-200 text-black" : "text-gray-600 hover:text-black hover:bg-gray-100"}`}
                        >
                          <Underline size={16} />
                        </button>

                        <button
                          onClick={() =>
                            updateActiveProps({
                              linethrough: !(activeObject as IText).linethrough,
                            })
                          }
                          className={`p-1.5 rounded transition-colors ${(activeObject as IText).linethrough ? "bg-gray-200 text-black" : "text-gray-600 hover:text-black hover:bg-gray-100"}`}
                        >
                          <Strikethrough size={16} />
                        </button>

                        <button
                          onClick={cycleAlign}
                          className="p-1.5 rounded transition-colors text-gray-600 hover:text-black hover:bg-gray-100"
                        >
                          {(activeObject as IText).textAlign === "left" && (
                            <AlignLeft size={16} />
                          )}
                          {(!(activeObject as IText).textAlign ||
                            (activeObject as IText).textAlign === "center") && (
                            <AlignCenter size={16} />
                          )}
                          {(activeObject as IText).textAlign === "right" && (
                            <AlignRightIcon size={16} />
                          )}
                        </button>
                      </div>
                    </>
                  )}

                  {activeObject.type === "i-text" && (
                    <div className="w-px h-5 bg-gray-200 mx-1 shrink-0"></div>
                  )}

                  <div className="flex gap-0.5 shrink-0">
                    <button
                      onClick={bringForward}
                      title="Bring Forward"
                      className="p-1.5 rounded text-gray-600 hover:text-black hover:bg-gray-100 transition-colors"
                    >
                      <Layers size={16} />
                    </button>

                    <button
                      onClick={duplicateActive}
                      title="Duplicate"
                      className="p-1.5 rounded text-gray-600 hover:text-black hover:bg-gray-100 transition-colors"
                    >
                      <CopyPlus size={16} />
                    </button>

                    <button
                      onClick={deleteActive}
                      title="Delete"
                      className="p-1.5 rounded text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => toggleSide(side === "front" ? "back" : "front")}
                className="cursor-pointer absolute flex flex-col items-center justify-center gap-2 top-3 right-3 bg-black/10 backdrop-blur-md px-3 py-1 rounded"
              >
                <GrPowerCycle size={20} />
                <span className="text-sm">Flip</span>
              </button>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
          {step === 1 && (
            <div className="p-4">
              <button
                disabled={!size}
                onClick={handleNext}
                className={`w-full py-4 font-bold uppercase tracking-widest text-sm rounded-sm ${
                  size
                    ? "bg-[#469e98] text-white hover:bg-[#3b8782]"
                    : "bg-gray-300 text-gray-600 cursor-not-allowed"
                }`}
              >
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex bg-white">
                <button
                  onClick={addText}
                  className="flex-1 py-2 flex flex-col items-center border-r border-gray-200"
                >
                  <MdOutlineTextFields size={32} />
                  <span className="text-xs text-gray-600">Add Text</span>
                </button>

                <label className="flex-1 py-2 flex flex-col items-center border-r border-gray-200 cursor-pointer">
                  <FiUpload size={28} />
                  <span className="text-xs text-gray-600">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex">
                <button
                  onClick={handleBack}
                  className="flex-1 py-4 bg-white text-[#469e98] font-bold text-sm uppercase border-t border-gray-200"
                >
                  Back
                </button>

                <button
                  onClick={goToPreview}
                  className="flex-1 py-4 bg-[#469e98] text-white font-bold text-sm uppercase border-t border-gray-200"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col bg-white">
              <div className="flex flex-col p-4 bg-white">
                {cartError ? (
                  <p className="text-red-500 text-xs font-medium mb-2 text-center">
                    {cartError}
                  </p>
                ) : null}

                <button
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="w-full cursor-pointer py-4 rounded-sm bg-[#469e98] text-white font-bold text-sm tracking-widest hover:bg-[#3b8782] transition-colors uppercase disabled:opacity-60"
                >
                  {isAdding ? "Adding..." : "Add To Bag"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hidescrollbar::-webkit-scrollbar { display: none; }
        .hidescrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1; 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db; 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af; 
        }
        .app-appearance-none::-webkit-inner-spin-button, .app-appearance-none::-webkit-outer-spin-button {
          opacity: 1; margin: 0;
        }
      `,
        }}
      ></style>
    </div>
  );
};

export default Customizer;