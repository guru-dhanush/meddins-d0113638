
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const CTASection = () => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Background image */}
          <div 
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{ 
              backgroundImage: "url('https://images.unsplash.com/photo-1560185007-5f0bb1866cab?q=80&w=1770&auto=format&fit=crop')",
            }}
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-rental-primary/90 to-rental-primary/50 z-10"></div>
          
          <div className="relative z-20 py-16 md:py-24 px-6 md:px-12">
            <div className="max-w-2xl">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-bold text-white mb-6"
              >
                Ready to Find Your Perfect Home?
              </motion.h2>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-white/90 text-lg mb-10"
              >
                Join thousands of satisfied renters who found their dream homes. Our extensive 
                selection of premium properties and easy-to-use platform makes finding your 
                next home a delightful experience.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button className="bg-rental-accent hover:bg-rental-accent/90 text-white rounded-full px-8 py-6 text-lg shadow-xl">
                  Start Browsing
                  <ArrowRight className="ml-2" size={20} />
                </Button>
                <Button variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white/10 rounded-full px-8 py-6 text-lg">
                  Learn More
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
