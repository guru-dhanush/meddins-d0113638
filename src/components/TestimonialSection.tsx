
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const TestimonialSection = () => {
  const testimonials = [
    {
      name: "Sarah Johnson",
      location: "New York",
      rating: 5,
      comment: "Finding my apartment through RentFlow was incredibly easy. The virtual tours saved me so much time, and the team was helpful throughout the entire process.",
      image: "https://i.pravatar.cc/150?img=32"
    },
    {
      name: "Michael Chen",
      location: "San Francisco",
      rating: 5,
      comment: "The filtering options are so detailed! I could specify exactly what I wanted, and the platform matched me with my dream loft in just two days.",
      image: "https://i.pravatar.cc/150?img=11"
    },
    {
      name: "Emily Rodriguez",
      location: "Chicago",
      rating: 4,
      comment: "I've used several rental platforms before, but none have been as user-friendly as RentFlow. The neighborhood insights feature really helped me choose the right location.",
      image: "https://i.pravatar.cc/150?img=5"
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-20 px-4 bg-rental-primary">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What Our Users Say</h2>
          <p className="text-white/80 max-w-2xl mx-auto">
            Join thousands of happy tenants who found their perfect home with RentFlow.
          </p>
        </motion.div>

        <div className="relative max-w-4xl mx-auto">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-card bg-white/10 p-8 md:p-12"
          >
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="md:w-1/3 flex-shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white/20 mx-auto">
                  <img 
                    src={testimonials[currentIndex].image} 
                    alt={testimonials[currentIndex].name}
                    className="w-full h-full object-cover" 
                  />
                </div>
              </div>
              
              <div className="md:w-2/3 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start mb-3">
                  {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                    <Star key={i} size={20} className="fill-rental-accent text-rental-accent" />
                  ))}
                  {[...Array(5 - testimonials[currentIndex].rating)].map((_, i) => (
                    <Star key={i + testimonials[currentIndex].rating} size={20} className="text-white/30" />
                  ))}
                </div>
                
                <p className="text-white/90 text-lg italic mb-6">"{testimonials[currentIndex].comment}"</p>
                
                <div>
                  <h4 className="text-xl font-semibold text-white">{testimonials[currentIndex].name}</h4>
                  <p className="text-white/70">{testimonials[currentIndex].location}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="flex justify-center mt-8 gap-4">
            <button 
              onClick={prevTestimonial}
              className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={nextTestimonial}
              className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
