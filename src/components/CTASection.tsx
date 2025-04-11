
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star } from 'lucide-react';

const CTASection = () => {
  return (
    <section className="py-20 px-4 overflow-hidden">
      <div className="container mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Animated background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-cover bg-center"
              style={{ 
                backgroundImage: "url('https://images.unsplash.com/photo-1560185007-5f0bb1866cab?q=80&w=1770&auto=format&fit=crop')",
                filter: "brightness(0.7) contrast(1.1)"
              }}
            />
            
            {/* Wave animation overlay */}
            <div className="absolute inset-0 opacity-60">
              <svg className="absolute bottom-0 left-0 w-full" 
                viewBox="0 0 1200 120" 
                preserveAspectRatio="none"
              >
                <motion.path 
                  d="M0,0 C150,100 350,0 500,100 C650,200 750,0 900,100 C1050,200 1200,100 1200,100 V120 H0 Z" 
                  className="fill-rental-primary opacity-80"
                  initial={{ pathLength: 0, y: 20 }}
                  animate={{ 
                    pathLength: 1, 
                    y: 0,
                    transition: { 
                      repeat: Infinity,
                      repeatType: "reverse", 
                      duration: 10,
                      ease: "easeInOut"
                    }
                  }}
                />
              </svg>
            </div>
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-rental-primary/90 to-rental-primary/50"></div>
          </div>
          
          <div className="relative z-10 py-16 md:py-28 px-6 md:px-12 lg:px-24">
            <div className="max-w-2xl mx-auto md:mx-0">
              <motion.div
                className="flex items-center gap-2 bg-white/20 backdrop-blur-sm w-fit rounded-full px-4 py-2 mb-4"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <Star size={16} className="text-rental-accent fill-rental-accent" />
                <span className="text-sm font-medium text-white">Trusted by thousands</span>
              </motion.div>
              
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-bold text-white mb-6"
                style={{ textShadow: '0px 2px 10px rgba(0,0,0,0.2)' }}
              >
                Ready to Find Your Perfect Home?
              </motion.h2>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
                className="text-white/90 text-lg mb-10"
                style={{ textShadow: '0px 1px 5px rgba(0,0,0,0.2)' }}
              >
                Join thousands of satisfied renters who found their dream homes. Our extensive 
                selection of premium properties and easy-to-use platform makes finding your 
                next home a delightful experience.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button 
                  className="bg-rental-accent hover:bg-rental-accent/90 text-white rounded-full px-8 py-6 text-lg shadow-xl relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center">
                    Start Browsing
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                  </span>
                  <motion.div 
                    className="absolute inset-0 bg-white/20"
                    initial={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 2, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  />
                </Button>
                
                <Button 
                  variant="outline" 
                  className="bg-transparent border-2 border-white text-white hover:bg-white/10 rounded-full px-8 py-6 text-lg relative overflow-hidden"
                >
                  <span className="relative z-10">Learn More</span>
                  <motion.div 
                    className="absolute inset-0 bg-white/10"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.4 }}
                  />
                </Button>
              </motion.div>
              
              {/* Floating shapes */}
              <motion.div 
                className="absolute top-10 right-10 w-24 h-24 rounded-full bg-rental-accent/20 backdrop-blur-md hidden md:block"
                animate={{ 
                  y: [0, -15, 0], 
                  rotate: [0, 10, 0],
                  opacity: [0.5, 0.7, 0.5]
                }}
                transition={{ repeat: Infinity, duration: 8 }}
              />
              <motion.div 
                className="absolute bottom-10 right-20 w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm hidden md:block"
                animate={{ 
                  y: [0, 15, 0], 
                  rotate: [0, -15, 0],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ repeat: Infinity, duration: 7, delay: 1 }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
