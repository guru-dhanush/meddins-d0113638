
import React from 'react';
import { Facebook, Instagram, Twitter, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const FooterLink = ({ href, children }) => {
  return (
    <motion.li 
      whileHover={{ x: 5 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Link 
        to={href} 
        className="hover:text-rental-accent transition-colors relative group"
      >
        <span>{children}</span>
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-rental-accent group-hover:w-full transition-all duration-300"></span>
      </Link>
    </motion.li>
  );
};

const SocialIcon = ({ href, children, label }) => {
  return (
    <motion.a 
      href={href} 
      aria-label={label}
      whileHover={{ y: -3, scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="w-10 h-10 rounded-full bg-white/5 hover:bg-rental-accent hover:text-white flex items-center justify-center transition-colors"
    >
      {children}
    </motion.a>
  );
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-rental-dark text-white/80">
      <div className="container mx-auto py-16 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Company Info */}
          <div>
            <Link to="/" className="flex items-center mb-6">
              <span className="text-2xl font-bold text-white">Rent<span className="text-rental-accent">Flow</span></span>
            </Link>
            <p className="mb-6 text-white/70">
              Making your rental journey seamless and enjoyable with our premium selection of properties and user-friendly platform.
            </p>
            <div className="flex space-x-3">
              <SocialIcon href="#" label="Facebook">
                <Facebook size={18} />
              </SocialIcon>
              <SocialIcon href="#" label="Instagram">
                <Instagram size={18} />
              </SocialIcon>
              <SocialIcon href="#" label="Twitter">
                <Twitter size={18} />
              </SocialIcon>
              <SocialIcon href="#" label="LinkedIn">
                <Linkedin size={18} />
              </SocialIcon>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white relative inline-block">
              Quick Links
              <span className="absolute -bottom-1 left-0 w-12 h-0.5 bg-rental-accent"></span>
            </h3>
            <ul className="space-y-3">
              <FooterLink href="/">Home</FooterLink>
              <FooterLink href="/properties">Browse Properties</FooterLink>
              <FooterLink href="/about">About Us</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
              <FooterLink href="/blog">Blog</FooterLink>
            </ul>
          </div>

          {/* For Renters */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white relative inline-block">
              For Renters
              <span className="absolute -bottom-1 left-0 w-12 h-0.5 bg-rental-accent"></span>
            </h3>
            <ul className="space-y-3">
              <FooterLink href="/how-it-works">How It Works</FooterLink>
              <FooterLink href="/faq">FAQs</FooterLink>
              <FooterLink href="/reviews">Reviews</FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/terms">Terms of Service</FooterLink>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white relative inline-block">
              Contact Us
              <span className="absolute -bottom-1 left-0 w-12 h-0.5 bg-rental-accent"></span>
            </h3>
            <ul className="space-y-5">
              <motion.li 
                className="flex items-start"
                whileHover={{ x: 3 }}
              >
                <MapPin size={20} className="mr-3 mt-1 text-rental-accent" />
                <span className="text-white/70">123 Rental Street, City Name, Country 12345</span>
              </motion.li>
              <motion.li 
                className="flex items-center"
                whileHover={{ x: 3 }}
              >
                <Phone size={20} className="mr-3 text-rental-accent" />
                <span className="text-white/70">+1 (555) 123-4567</span>
              </motion.li>
              <motion.li 
                className="flex items-center"
                whileHover={{ x: 3 }}
              >
                <Mail size={20} className="mr-3 text-rental-accent" />
                <span className="text-white/70">info@rentflow.com</span>
              </motion.li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-white/50 text-sm">
            <p>&copy; {currentYear} RentFlow. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacy" className="hover:text-rental-accent transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-rental-accent transition-colors">Terms</Link>
              <Link to="/cookies" className="hover:text-rental-accent transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
