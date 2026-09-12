import "../styles/mobile-ui.css";
import { Truck, Award, RotateCcw, Paintbrush } from "lucide-react";
const FeaturesSection = ({ className }: {
    className?: string;
}) => {
    const featureItems = [
        {
            icon: <Truck size={36} className="text-[#FFD700]" strokeWidth={1.5}/>,
            title: "EXPRESS DELIVERY",
            description: "WORLDWIDE SHIPPING",
        },
        {
            icon: <Award size={36} className="text-[#FFD700]" strokeWidth={1.5}/>,
            title: "QUALITY FABRIC",
            description: "100% ORGANIC COTTON",
        },
        {
            icon: (<RotateCcw size={36} className="text-[#FFD700]" strokeWidth={1.5}/>),
            title: "EASY RETURNS",
            description: "30-DAY POLICY",
        },
        {
            icon: (<Paintbrush size={36} className="text-[#FFD700]" strokeWidth={1.5}/>),
            title: "CUSTOM PRINT",
            description: "PERSONALIZED DESIGN",
        },
    ];
    return (<div className={`v1-features w-full bg-secondary text-white py-12 px-6 md:px-12 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 items-center text-center">
        {featureItems.map((item, index) => (<div key={index} className="flex flex-row items-center gap-6">
            
            <div className="p-4 bg-transparent border border-[#FFD700]/30 rounded-full flex items-center justify-center">
              {item.icon}
            </div>
            
            <div className="flex flex-col items-start gap-2 text-left">
              <h3 className="text-lg md:text-xl font-semibold tracking-wide uppercase font-big-shoulders">
                {item.title}
              </h3>

              <p className="text-sm md:text-base text-gray-400 font-poppins">
                {item.description}
              </p>
            </div>
          </div>))}
      </div>
    </div>);
};
export default FeaturesSection;
