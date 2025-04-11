
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

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

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-b from-rental-light to-white">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1770&auto=format&fit=crop')",
          backgroundPosition: 'center 35%'
        }}
      />
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-rental-primary/70 z-10"></div>

      {/* Content layer */}
      <div className="absolute inset-0 z-20 flex flex-col justify-center items-center px-4 md:px-0">
        <div className="w-full max-w-5xl mx-auto text-center">
          <h1 
            className={`text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 transform transition-all duration-700 ease-out
              ${animationComplete ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}
            style={{ textShadow: '0px 2px 10px rgba(0,0,0,0.3)' }}
          >
            Find Your Dream Rental Home
          </h1>
          
          <p 
            className={`text-lg md:text-xl text-white/90 mb-10 max-w-3xl mx-auto transform transition-all duration-700 delay-200 ease-out
              ${animationComplete ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}
            style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.2)' }}
          >
            Explore our curated collection of premium rental properties designed 
            to match your lifestyle and elevate your living experience.
          </p>

          <div 
            className={`relative max-w-2xl mx-auto transform transition-all duration-700 delay-400 ease-out
              ${animationComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            <div className={`flex rounded-full overflow-hidden shadow-2xl ${isSearchFocused ? 'ring-2 ring-rental-accent ring-opacity-60' : ''}`}>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search by city, neighborhood, or address"
                className="bg-white/95 backdrop-blur-sm border-0 rounded-l-full py-7 px-6 text-lg flex-grow focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button 
                onClick={handleSearch} 
                className="bg-rental-accent hover:bg-rental-accent/90 text-white rounded-r-full px-8 py-7"
              >
                <Search className="mr-2" size={20} />
                Search
              </Button>
            </div>
          </div>

          <div 
            className={`flex flex-wrap justify-center mt-12 gap-4 transform transition-all duration-700 delay-600 ease-out
              ${animationComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            <div className="glass-card px-4 py-2">
              <span className="text-sm text-rental-dark/80">Verified Listings</span>
              <p className="text-lg font-semibold text-rental-dark">1,234+</p>
            </div>
            <div className="glass-card px-4 py-2">
              <span className="text-sm text-rental-dark/80">Happy Tenants</span>
              <p className="text-lg font-semibold text-rental-dark">10,000+</p>
            </div>
            <div className="glass-card px-4 py-2">
              <span className="text-sm text-rental-dark/80">Cities</span>
              <p className="text-lg font-semibold text-rental-dark">100+</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
