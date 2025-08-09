import { CoreValuesSection } from "@/components/CoreValuesSection";
import { HeroSection } from "@/components/HeroSection";
import React from "react";

// The Home Page assembles the different sections of the page.
const HomePage = () => {
  return (
    <>
      <HeroSection />
      <CoreValuesSection />
      {/* We can add more sections here later */}
    </>
  );
};

export default HomePage;