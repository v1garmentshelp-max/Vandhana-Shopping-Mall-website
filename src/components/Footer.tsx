import React from "react";

import logo from "../assets/light-logo.svg";
import FacebookIcon from "../assets/icons/FacebookIcon";
import LinkedinIcon from "../assets/icons/LinkedinIcon";
import InstagramIcon from "../assets/icons/InstagramIcon";
import TwitterIcon from "../assets/icons/TwitterIcon";

const Footer: React.FC = () => {
  const menuLinks = ["Home", "Shop", "About Us", "Collection", "Category"];
  const pageLinks = ["Home", "License", "Changelog", "Style Guide", "Support"];

  const socialLinks = [
    {
      name: "Linkedin",
      icon: <LinkedinIcon color="#ffd700" />,
    },
    {
      name: "Instagram",
      icon: <InstagramIcon color="#ffd700" />,
    },
    {
      name: "Twitter",
      icon: <TwitterIcon color="#ffd700" />,
    },
    {
      name: "Facebook",
      icon: <FacebookIcon color="#ffd700" />,
    },
  ];

  return (
    <footer className="w-full bg-[#111111] text-white pt-16 pb-8 px-6 md:px-12 font-big-shoulders">
      <div className="max-w-7xl mx-auto">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          {/* Brand Section */}
          <div className="md:col-span-5">
            <div className="shrink-0 flex flex-col  gap-2 mb-2 w-fit items-center">
              <img src={logo} alt="logo" className="w-24" />
              <h1 className="text-3xl font-bold tracking-normal text-white">
                V1Garments
              </h1>
            </div>
            <h3 className="text-xl font-semibold mb-4 text-white/60">
              Streetwear for the Bold, Built for the Movement.
            </h3>
            <p className="text-white/60 leading-relaxed max-w-sm">
              Inspired by the raw energy of the streets, we create statement
              pieces that blend style, attitude, and individuality.
            </p>
          </div>

          {/* Links Sections */}
          <div className="md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8">
            {/* Menu Column */}
            <div>
              <h4 className="text-xl font-bold mb-6 text-primary">Menu</h4>
              <ul className="space-y-4 font-poppins">
                {menuLinks.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pages Column */}
            <div>
              <h4 className="text-xl font-bold mb-6 text-primary">Pages</h4>
              <ul className="space-y-4 font-poppins">
                {pageLinks.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social Column */}
            <div>
              <h4 className="text-xl font-bold mb-6 text-primary">Social</h4>
              <ul className="space-y-4 font-poppins">
                {socialLinks.map((social) => (
                  <li key={social.name}>
                    <a
                      href="#"
                      className="flex items-center gap-3 text-white/60 hover:text-white transition-colors"
                    >
                      {social.icon}
                      {social.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        {/* <div className="pt-8 border-t border-dashed border-gray-700 text-center">
          <p className="text-sm text-gray-400 font-poppins">
            © Copyright <span className="font-bold text-white">Vandana</span>
          </p>
        </div> */}
      </div>
    </footer>
  );
};

export default Footer;
