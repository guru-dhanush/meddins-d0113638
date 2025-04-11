
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed w-full z-50 bg-white/70 backdrop-blur-lg shadow-sm">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <span className="text-2xl font-bold text-rental-primary">Rent<span className="text-rental-accent">Flow</span></span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <Link to="/" className="text-rental-dark hover:text-rental-primary font-medium transition-colors">
            Home
          </Link>
          <Link to="/properties" className="text-rental-dark hover:text-rental-primary font-medium transition-colors">
            Properties
          </Link>
          <Link to="/about" className="text-rental-dark hover:text-rental-primary font-medium transition-colors">
            About
          </Link>
          <Link to="/contact" className="text-rental-dark hover:text-rental-primary font-medium transition-colors">
            Contact
          </Link>
          <Button className="glass-button rounded-full px-6">Sign Up</Button>
        </div>
        
        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)} className="text-rental-primary p-2">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-lg shadow-md absolute top-full left-0 w-full py-4 px-6 animate-fade-in">
          <div className="flex flex-col space-y-4">
            <Link to="/" 
                  onClick={() => setIsOpen(false)}
                  className="text-rental-dark hover:text-rental-primary font-medium py-2 transition-colors">
              Home
            </Link>
            <Link to="/properties" 
                  onClick={() => setIsOpen(false)}
                  className="text-rental-dark hover:text-rental-primary font-medium py-2 transition-colors">
              Properties
            </Link>
            <Link to="/about" 
                  onClick={() => setIsOpen(false)}
                  className="text-rental-dark hover:text-rental-primary font-medium py-2 transition-colors">
              About
            </Link>
            <Link to="/contact" 
                  onClick={() => setIsOpen(false)}
                  className="text-rental-dark hover:text-rental-primary font-medium py-2 transition-colors">
              Contact
            </Link>
            <Button className="glass-button rounded-full w-full mt-2">Sign Up</Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
