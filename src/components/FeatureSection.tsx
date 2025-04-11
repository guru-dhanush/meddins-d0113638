
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building, Search, Heart, Key, MapPin, Users, Home, Shield } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description, delay }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="feature-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="mb-4 relative">
        <div className="w-12 h-12 bg-rental-secondary/10 rounded-lg flex items-center justify-center">
          <Icon className="text-rental-primary" size={24} />
        </div>
        
        <motion.div 
          className="absolute top-0 left-0 w-12 h-12 bg-rental-primary rounded-lg flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <Icon className="text-white" size={24} />
        </motion.div>
      </div>
      
      <h3 className="text-xl font-semibold mb-2 text-rental-dark">{title}</h3>
      <p className="text-rental-muted">{description}</p>
    </motion.div>
  );
};

const FeatureSection = () => {
  const features = [
    {
      icon: Search,
      title: 'Smart Search',
      description: 'Find your perfect home with our AI-powered search that understands your preferences.',
      delay: 0.1
    },
    {
      icon: Building,
      title: 'Premium Properties',
      description: 'Browse through our curated collection of high-quality rental properties.',
      delay: 0.2
    },
    {
      icon: Heart,
      title: 'Save Favorites',
      description: 'Create a collection of your favorite properties to revisit or share later.',
      delay: 0.3
    },
    {
      icon: Key,
      title: 'Easy Booking',
      description: 'Schedule visits and secure your rental with our streamlined booking process.',
      delay: 0.4
    },
    {
      icon: MapPin,
      title: 'Location Insights',
      description: 'Explore neighborhoods with detailed information about amenities and transport.',
      delay: 0.5
    },
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Pay your rent securely through our platform with multiple payment options.',
      delay: 0.6
    }
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-white to-rental-light">
      <div className="container mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-rental-dark mb-4">Why Choose RentFlow</h2>
          <p className="text-rental-muted max-w-2xl mx-auto">
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
              delay={feature.delay}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
