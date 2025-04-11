
import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { Search, CalendarCheck, Home } from 'lucide-react';

const StepCard = ({ icon: Icon, title, description, stepNumber, isActive }) => {
  return (
    <div className={`step-card relative ${isActive ? 'scale-105 shadow-lg' : ''} transition-all duration-500`}>
      <div className="absolute -top-5 -left-5 w-10 h-10 bg-rental-accent rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
        {stepNumber}
      </div>
      <div className="mb-6">
        <div className={`w-16 h-16 ${isActive ? 'bg-rental-primary' : 'bg-rental-secondary/20'} rounded-xl flex items-center justify-center transition-colors duration-500`}>
          <Icon className={`${isActive ? 'text-white' : 'text-rental-primary'} transition-colors duration-500`} size={32} />
        </div>
      </div>
      <h3 className="text-2xl font-bold mb-3 text-rental-dark">{title}</h3>
      <p className="text-rental-muted">{description}</p>
    </div>
  );
};

const StepsSection = () => {
  const controls = useAnimation();
  const ref = useRef(null);
  const inView = useInView(ref, { once: false }); // Removed the invalid 'threshold' property
  
  const [activeStep, setActiveStep] = React.useState(1);
  
  useEffect(() => {
    if (inView) {
      controls.start("visible");
      
      // Start the step animation cycle
      const interval = setInterval(() => {
        setActiveStep((prev) => (prev === 3 ? 1 : prev + 1));
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [controls, inView]);

  const steps = [
    {
      icon: Search,
      title: "Search",
      description: "Browse through our extensive collection of rental properties. Filter by location, price, and amenities to find your perfect match.",
      stepNumber: 1
    },
    {
      icon: CalendarCheck,
      title: "Book",
      description: "Schedule a viewing or book directly online. Our streamlined process makes securing your dream rental quick and hassle-free.",
      stepNumber: 2
    },
    {
      icon: Home,
      title: "Enjoy Home",
      description: "Move into your new home and enjoy the benefits of our ongoing tenant support services throughout your stay.",
      stepNumber: 3
    }
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-rental-light to-white" ref={ref}>
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={controls}
          variants={{
            visible: { opacity: 1, y: 0 },
            hidden: { opacity: 0, y: 20 }
          }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-rental-dark mb-4">How It Works</h2>
          <p className="text-rental-muted max-w-2xl mx-auto">
            Finding and securing your dream rental home is just three simple steps away. Our streamlined process ensures a smooth journey from search to your new doorstep.
          </p>
        </motion.div>

        <div className="relative mt-20">
          {/* Timeline connector */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-rental-secondary/20 -translate-y-1/2 z-0"></div>
          
          {/* Step cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={controls}
                variants={{
                  visible: { opacity: 1, y: 0, transition: { delay: 0.2 * index } },
                  hidden: { opacity: 0, y: 30 }
                }}
              >
                <StepCard
                  icon={step.icon}
                  title={step.title}
                  description={step.description}
                  stepNumber={step.stepNumber}
                  isActive={activeStep === step.stepNumber}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StepsSection;
