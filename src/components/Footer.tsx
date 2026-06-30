import React from "react";
import { Link } from "react-router";
import logo from "../assets/light-logo.svg";
import FacebookIcon from "../assets/icons/FacebookIcon";
import LinkedinIcon from "../assets/icons/LinkedinIcon";
import InstagramIcon from "../assets/icons/InstagramIcon";
import TwitterIcon from "../assets/icons/TwitterIcon";

const Footer: React.FC = () => {
  const menuLinks = [
    { name: "Home", path: "/" },
    { name: "Men", path: "/men" },
    { name: "Women", path: "/women" },
    { name: "Kids", path: "/kids" },
    { name: "Customize", path: "/customize" },
  ];

  const pageLinks = [
    { name: "Collections", path: "/collections" },
    { name: "Wishlist", path: "/wishlist" },
    { name: "Cart", path: "/cart" },
    { name: "Profile", path: "/profile" },
    { name: "Support", path: "/support" },
  ];

  const socialLinks = [
    {
      name: "Linkedin",
      icon: <LinkedinIcon color="#ffd700" />,
      href: "#",
    },
    {
      name: "Instagram",
      icon: <InstagramIcon color="#ffd700" />,
      href: "#",
    },
    {
      name: "Twitter",
      icon: <TwitterIcon color="#ffd700" />,
      href: "#",
    },
    {
      name: "Facebook",
      icon: <FacebookIcon color="#ffd700" />,
      href: "#",
    },
  ];

  return (
    <footer className="w-full bg-[#111111] text-white pt-16 pb-8 px-6 md:px-12 font-big-shoulders">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-5">
            <Link to="/" className="shrink-0 flex flex-col gap-2 mb-2 w-fit items-center">
              <img src={logo} alt="logo" className="w-24" />
              <h1 className="text-3xl font-bold tracking-normal text-white">
                V1Garments
              </h1>
            </Link>

            <h3 className="text-xl font-semibold mb-4 text-white/60">
              Fashion for every family, built for everyday comfort.
            </h3>

            <p className="text-white/60 leading-relaxed max-w-sm font-poppins text-sm">
              Explore men, women, kids, and custom wear collections with quality
              styles, fresh arrivals, and easy shopping.
            </p>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-xl font-bold mb-6 text-primary">Menu</h4>
              <ul className="space-y-4 font-poppins">
                {menuLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.path}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xl font-bold mb-6 text-primary">Pages</h4>
              <ul className="space-y-4 font-poppins">
                {pageLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.path}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xl font-bold mb-6 text-primary">Social</h4>
              <ul className="space-y-4 font-poppins">
                {socialLinks.map((social) => (
                  <li key={social.name}>
                    <a
                      href={social.href}
                      target={social.href === "#" ? undefined : "_blank"}
                      rel={social.href === "#" ? undefined : "noreferrer"}
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

        <div className="pt-8 border-t border-dashed border-gray-700 text-center">
          <p className="text-sm text-gray-400 font-poppins">
            © Copyright <span className="font-bold text-white">V1Garments</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;