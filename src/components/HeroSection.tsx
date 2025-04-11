
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Handle scroll parallax effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    // Set animation complete after delay
    setTimeout(() => setAnimationComplete(true), 500);
  }, []);

  const handleSearch = () => {
    // Implement search functionality
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      // In a real app, you would use react-router to navigate to search results
    }
  };

  // Floating particle elements
  const particles = [
    { id: 1, delay: 0, duration: 15, initialX: '10%', initialY: '20%' },
    { id: 2, delay: 2, duration: 18, initialX: '70%', initialY: '15%' },
    { id: 3, delay: 1, duration: 20, initialX: '30%', initialY: '80%' },
    { id: 4, delay: 3, duration: 25, initialX: '80%', initialY: '60%' },
  ];

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background with parallax effect */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 scale-110"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1770&auto=format&fit=crop')",
          backgroundPosition: 'center 35%',
          transform: `translateY(${scrollY * 0.25}px)`
        }}
      />
      
      {/* Overlay with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-rental-primary/60 to-rental-primary/80 z-10"></div>

      {/* Floating particle elements */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-24 h-24 rounded-full bg-white/5 backdrop-blur-md z-20"
          initial={{ x: particle.initialX, y: particle.initialY, opacity: 0 }}
          animate={{ 
            opacity: [0, 0.3, 0.1, 0.3, 0],
            scale: [1, 1.2, 0.8, 1.1, 1],
          }}
          transition={{ 
            repeat: Infinity,
            duration: particle.duration, 
            delay: particle.delay,
            ease: "easeInOut" 
          }}
        />
      ))}

      {/* Content layer */}
      <div className="absolute inset-0 z-30 flex flex-col justify-center items-center px-4 md:px-0">
        <div className="w-full max-w-5xl mx-auto text-center">
          <motion.h1 
            className={`text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight`}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ textShadow: '0px 2px 20px rgba(0,0,0,0.5)' }}
          >
            Find Your Dream Rental Home
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-white/90 mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{ textShadow: '0px 1px 10px rgba(0,0,0,0.3)' }}
          >
            Explore our curated collection of premium rental properties designed 
            to match your lifestyle and elevate your living experience.
          </motion.p>

          <motion.div 
            className="relative max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className={`flex rounded-full overflow-hidden shadow-[0_0_30px_rgba(243,167,18,0.3)] ${isSearchFocused ? 'ring-2 ring-rental-accent ring-opacity-60' : ''}`}>
              <div className="bg-white/95 backdrop-blur-sm border-0 rounded-l-full py-7 px-6 text-lg flex-grow flex items-center">
                <MapPin className="text-rental-primary/70 mr-2" size={20} />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search by city, neighborhood, or address"
                  className="border-0 bg-transparent text-lg focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                />
              </div>
              <Button 
                onClick={handleSearch} 
                className="relative bg-rental-accent hover:bg-rental-accent/90 text-white rounded-r-full px-8 py-7 overflow-hidden group"
              >
                <span className="relative z-10 flex items-center">
                  <Search className="mr-2" size={20} />
                  Search
                </span>
                <motion.div 
                  className="absolute inset-0 bg-white/20"
                  initial={{ scale: 0, opacity: 0 }}
                  whileHover={{ scale: 1.5, opacity: 1 }}
                  transition={{ duration: 0.6 }}
                />
              </Button>
            </div>
          </motion.div>

          <motion.div 
            className="flex flex-wrap justify-center mt-16 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            <motion.div 
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
              transition={{ type: 'spring', stiffness: 500 }}
              className="glass-card px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl"
            >
              <span className="text-sm text-white/80 font-medium">Verified Listings</span>
              <p className="text-2xl font-bold text-white">1,234+</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
              transition={{ type: 'spring', stiffness: 500 }}
              className="glass-card px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl"
            >
              <span className="text-sm text-white/80 font-medium">Happy Tenants</span>
              <p className="text-2xl font-bold text-white">10,000+</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
              transition={{ type: 'spring', stiffness: 500 }}
              className="glass-card px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl"
            >
              <span className="text-sm text-white/80 font-medium">Cities</span>
              <p className="text-2xl font-bold text-white">100+</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
