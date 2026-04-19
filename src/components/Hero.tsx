import React, { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import HeroImage from "../assets/hero-real-image.png";

const SLIDE_DURATION = 5000; // 5 seconds per slide

const slides = [
  {
    id: "01",
    title: "Community-Driven Culture",
    heading: "Limited Drops, Maximum Impact",
    image: HeroImage,
  },
  {
    id: "02",
    title: "Future-Ready Fashion",
    heading: "The Future of Streetwear",
    image: HeroImage,
  },
  {
    id: "03",
    title: "Art Meets Attitude",
    heading: "Wear Your Statement",
    image: HeroImage,
  },
  {
    id: "04",
    title: "Built for the Streets",
    heading: "Rugged Style, Urban Soul",
    image: HeroImage,
  },
];

const Hero: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();

    const updateTimer = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const currentProgress = (elapsedTime / SLIDE_DURATION) * 100;

      if (currentProgress >= 100) {
        setProgress(100);
        clearInterval(updateTimer);
        // Delay the slide switch slightly to show the bar at 100%
        setTimeout(() => {
          setCurrentSlide((prev) => (prev + 1) % slides.length);
          setProgress(0);
        }, 50);
      } else {
        setProgress(currentProgress);
      }
    }, 10); // High frequency for smooth progress bar

    return () => clearInterval(updateTimer);
  }, [currentSlide]);

  return (
    <section className="p-3 md:p-6">
      <div className="relative w-full h-[calc(100vh-10rem)] overflow-hidden bg-black text-white rounded-[40px]">
        {/* Background Slides */}
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.heading}
              className="w-full h-full object-cover opacity-100 object-top"
            />
            <div className="absolute inset-0 bg-linear-to-t md:bg-linear-to-r from-black/90 to-black/10" />
          </div>
        ))}

        {/* Main Content */}
        <div
          className="relative z-10 h-full md:max-w-7xl mx-auto flex flex-col justify-end md:justify-center
           px-6 md:px-12"
        >
          <div className="max-w-3xl flex flex-col gap-8 md:gap-10 mb-36">
            {/* Key on H1 ensures animation re-triggers on slide change */}
            <h1
              key={currentSlide}
              className="text-5xl md:text-6xl font-poppins lg:text-8xl  leading-[0.9] tracking-tighter italic transition-all duration-700 animate-in fade-in slide-in-from-bottom-6"
            >
              {slides[currentSlide].heading.split(",").map((text, i) => (
                <React.Fragment key={i}>
                  {text} {i === 0 && <br />}
                </React.Fragment>
              ))}
            </h1>

            <button className="w-fit group flex items-center bg-white text-black px-1 py-1 rounded-full pr-8 hover:bg-gray-200 transition-colors">
              <div className="bg-primary text-black p-3 rounded-full mr-4 group-hover:rotate-45 transition-transform">
                <ArrowRight size={20} />
              </div>
              <span className="font-bold uppercase">Shop now</span>
            </button>
          </div>
        </div>

        {/* Progress Footer */}
        <div className="absolute bottom-12 left-0 w-full px-6 md:px-12 z-10">
          <div className="max-w-7xl mx-auto">
            {/* Main Progress Track */}
            <div className="relative w-full h-[2px] bg-gray-700 mb-8 overflow-hidden">
              {/* Moving Indicator */}
              <div
                className="absolute top-0 h-full bg-white shadow-[0_0_8px_white]"
                style={{
                  left: `${currentSlide * 25}%`,
                  width: `${progress / 4}%`,
                  // Use linear for width to match the timer, but ease for position jumps
                  transition: progress === 0 ? "none" : "width 10ms linear",
                }}
              />
            </div>

            {/* Labels Grid */}
            <div className="grid grid-cols-4 gap-4">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  onClick={() => {
                    setCurrentSlide(index);
                    setProgress(0);
                  }}
                  className={`cursor-pointer transition-all duration-300 ${
                    index === currentSlide
                      ? "opacity-100 translate-y-[-4px]"
                      : "opacity-40"
                  }`}
                >
                  <p className="text-xl md:text-lg font-bold mb-1">
                    {slide.id}
                  </p>
                  <p className="text-xs hidden md:flex md:text-sm font-medium uppercase tracking-widest leading-tight">
                    {slide.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
