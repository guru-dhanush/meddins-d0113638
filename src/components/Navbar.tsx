
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: (i) => ({ 
      opacity: 1, 
      y: 0,
      transition: { 
        delay: i * 0.1,
        duration: 0.5,
      }
    }),
  };

  const NavItem = ({ to, children, index }) => (
    <motion.li
      custom={index}
      variants={navItemVariants}
      initial="hidden"
      animate="visible"
      className="relative group"
    >
      <Link 
        to={to} 
        onClick={() => setIsOpen(false)}
        className="text-rental-dark hover:text-rental-primary font-medium px-1 py-2 transition-colors inline-flex items-center"
      >
        {children}
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-rental-accent group-hover:w-full transition-all duration-300"></span>
      </Link>
    </motion.li>
  );

  return (
    <motion.nav 
      className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-lg shadow-md py-3' : 'bg-transparent py-6'}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <motion.span 
            className={`text-2xl font-bold ${scrolled ? 'text-rental-primary' : 'text-white'}`}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            Rent<span className="text-rental-accent">Flow</span>
          </motion.span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          <ul className="flex space-x-8 items-center">
            <NavItem to="/" index={0}>
              Home
            </NavItem>
            <NavItem to="/properties" index={1}>
              Properties
            </NavItem>
            <NavItem to="/about" index={2}>
              About
            </NavItem>
            <NavItem to="/contact" index={3}>
              Contact
            </NavItem>
          </ul>
          <div className="pl-8">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button className={`glass-button rounded-full px-6 ${scrolled ? 'bg-rental-secondary text-white' : 'bg-white/10 text-white backdrop-blur-sm border border-white/30 hover:bg-white/20'}`}>
                Sign Up
              </Button>
            </motion.div>
          </div>
        </div>
        
        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className={`p-2 rounded-full ${scrolled ? 'text-rental-primary bg-gray-100' : 'text-white bg-white/10'}`}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="md:hidden bg-white shadow-lg absolute top-full left-0 w-full py-4 px-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="flex flex-col space-y-4">
              <Link to="/" 
                    onClick={() => setIsOpen(false)}
                    className="text-rental-dark hover:text-rental-primary font-medium py-2 border-b border-gray-100">
                Home
              </Link>
              <Link to="/properties" 
                    onClick={() => setIsOpen(false)}
                    className="text-rental-dark hover:text-rental-primary font-medium py-2 border-b border-gray-100">
                Properties
              </Link>
              <Link to="/about" 
                    onClick={() => setIsOpen(false)}
                    className="text-rental-dark hover:text-rental-primary font-medium py-2 border-b border-gray-100">
                About
              </Link>
              <Link to="/contact" 
                    onClick={() => setIsOpen(false)}
                    className="text-rental-dark hover:text-rental-primary font-medium py-2 border-b border-gray-100">
                Contact
              </Link>
              <Button className="glass-button rounded-full w-full mt-2 bg-rental-secondary text-white">Sign Up</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
