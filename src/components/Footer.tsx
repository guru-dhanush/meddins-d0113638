
import React from 'react';
import { Facebook, Instagram, Twitter, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-rental-dark text-white/80">
      <div className="container mx-auto py-16 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <Link to="/" className="flex items-center mb-6">
              <span className="text-2xl font-bold text-white">Rent<span className="text-rental-accent">Flow</span></span>
            </Link>
            <p className="mb-6">
              Making your rental journey seamless and enjoyable with our premium selection of properties and user-friendly platform.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-rental-accent transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="hover:text-rental-accent transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="hover:text-rental-accent transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="hover:text-rental-accent transition-colors">
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="hover:text-rental-accent transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/properties" className="hover:text-rental-accent transition-colors">Browse Properties</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-rental-accent transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-rental-accent transition-colors">Contact</Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-rental-accent transition-colors">Blog</Link>
              </li>
            </ul>
          </div>

          {/* For Renters */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">For Renters</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/how-it-works" className="hover:text-rental-accent transition-colors">How It Works</Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-rental-accent transition-colors">FAQs</Link>
              </li>
              <li>
                <Link to="/reviews" className="hover:text-rental-accent transition-colors">Reviews</Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-rental-accent transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-rental-accent transition-colors">Terms of Service</Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MapPin size={20} className="mr-2 mt-1 text-rental-accent" />
                <span>123 Rental Street, City Name, Country 12345</span>
              </li>
              <li className="flex items-center">
                <Phone size={20} className="mr-2 text-rental-accent" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center">
                <Mail size={20} className="mr-2 text-rental-accent" />
                <span>info@rentflow.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 text-center">
          <p>&copy; {new Date().getFullYear()} RentFlow. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
