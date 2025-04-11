
import React from 'react';
import { motion } from 'framer-motion';
import { Building, Search, Heart, Key, MapPin, Shield } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description, index }) => {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: { 
            duration: 0.5,
            delay: index * 0.1
          }
        }
      }}
      whileHover={{ 
        y: -10,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        transition: { type: 'spring', stiffness: 400, damping: 17 }
      }}
      className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out border border-white/80 relative overflow-hidden group"
    >
      {/* Background gradient blob */}
      <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-gradient-to-br from-rental-secondary/10 to-rental-accent/5 group-hover:scale-150 transition-all duration-500 ease-in-out"></div>
      
      <div className="relative z-10">
        <div className="flex items-center mb-6">
          <motion.div 
            whileHover={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5 }}
            className="w-14 h-14 bg-gradient-to-br from-rental-secondary to-rental-accent rounded-2xl flex items-center justify-center text-white shadow-md"
          >
            <Icon size={28} />
          </motion.div>
          <h3 className="text-xl font-bold ml-4 text-rental-dark">{title}</h3>
        </div>
        
        <p className="text-rental-muted">{description}</p>
        
        <div className="mt-6 flex justify-end">
          <motion.button 
            whileHover={{ x: 5 }}
            className="text-rental-primary font-medium flex items-center"
          >
            Learn more
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

const FeatureSection = () => {
  const features = [
    {
      icon: Search,
      title: 'Smart Search',
      description: 'Find your perfect home with our AI-powered search that understands your preferences and filters properties accordingly.',
    },
    {
      icon: Building,
      title: 'Premium Properties',
      description: 'Browse through our curated collection of high-quality rental properties that meet our strict standards for quality and comfort.',
    },
    {
      icon: Heart,
      title: 'Save Favorites',
      description: 'Create a collection of your favorite properties to revisit or share later with roommates, partners, or family members.',
    },
    {
      icon: Key,
      title: 'Easy Booking',
      description: 'Schedule visits and secure your rental with our streamlined booking process. No paperwork hassles or complicated procedures.',
    },
    {
      icon: MapPin,
      title: 'Location Insights',
      description: 'Explore neighborhoods with detailed information about nearby amenities, schools, transport options, and community features.',
    },
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Pay your rent securely through our platform with multiple payment options and transparent fee structures.',
    }
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-white to-rental-light">
      <div className="container mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-block bg-rental-secondary/10 px-4 py-1.5 rounded-full text-rental-primary font-medium text-sm mb-4">
            FEATURES
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-rental-dark mb-6">Why Choose RentFlow</h2>
          <p className="text-rental-muted max-w-2xl mx-auto text-lg">
            We're more than just a rental platform. We're your partner in finding the perfect 
            home with features designed to make your journey seamless and enjoyable.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
