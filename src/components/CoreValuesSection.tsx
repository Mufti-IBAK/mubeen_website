import React from 'react';

// Define a type for our value cards for consistency and type safety
interface ValueCardProps {
  title: string;
  description: string;
  icon: React.ReactNode; // We can pass SVG icons as children
}

// A reusable card component for each value
const ValueCard: React.FC<ValueCardProps> = ({ title, description, icon }) => {
  return (
    // FIX: Added 'flex', 'flex-col', and 'items-center' to center the content
    <div className="flex flex-col items-center p-6 text-center transition-all duration-300 ease-in-out bg-white rounded-lg shadow-md hover:shadow-xl hover:-translate-y-2">
      {/* The icon container is already centered by the parent's 'items-center' */}
      <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-brand-primary/10 text-brand-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-bold text-brand-dark font-heading">{title}</h3>
      <p className="text-brand-dark/70">{description}</p>
    </div>
  );
};

// The main section component
export const CoreValuesSection = () => {
  // Data sourced from the Mubeen Academy Handbook
  const values = [
    {
      title: 'Ikhlās (Sincerity)',
      description: 'Seeking knowledge for the sake of Allah alone.',
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
    },
    {
      title: 'Adab (Character)',
      description: 'Upholding the highest moral and ethical standards.',
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>,
    },
    {
      title: 'Amānah (Trust)',
      description: 'Preserving and transmitting knowledge with integrity.',
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>,
    },
    {
      title: 'Tawādu\' (Humility)',
      description: 'Approaching learning with an open and humble heart.',
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>,
    },
  ];

  return (
    <section className="py-20 bg-brand-bg">
      <div className="container px-6 mx-auto"> 
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-extrabold text-brand-dark font-heading">Our Core Values</h2>
          <p className="max-w-2xl mx-auto mt-4 text-lg text-brand-dark/70">
            The principles that guide our mission and shape our community.
          </p>
        </div>

        {/* 
          FIX: The grid is now 2 columns by default (for mobile)
          and expands to 4 columns on large screens (lg:).
        */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 md:gap-8">
          {values.map((value) => (
            <ValueCard key={value.title} {...value} />
          ))}
        </div>
      </div>
    </section>
  );
};